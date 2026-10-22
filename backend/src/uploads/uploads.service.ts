import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 13_000_000;
const MAX_WIDTH = 500;
const DEFAULT_USER_STORAGE_LIMIT = 100 * 1024 * 1024;
const DEFAULT_TOTAL_STORAGE_LIMIT = 1024 * 1024 * 1024;
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const UUID_WEBP =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.webp';
const UPLOAD_FILENAME = new RegExp(`^${UUID_WEBP}$`, 'i');
const UPLOAD_URL = new RegExp(`^/uploads/(${UUID_WEBP})$`, 'i');
const TEMP_UPLOAD_FILENAME = new RegExp(
  '^\\.upload-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.tmp$',
  'i',
);

const MAGIC_BYTES: { mime: string; offset: number; bytes: number[] }[] = [
  { mime: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
];

function detectMimeByMagic(buffer: Buffer): string | null {
  for (const signature of MAGIC_BYTES) {
    if (buffer.length < signature.offset + signature.bytes.length) continue;
    if (
      signature.bytes.every(
        (byte, index) => buffer[signature.offset + index] === byte,
      )
    ) {
      return signature.mime;
    }
  }
  return null;
}

function positiveIntegerEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class UploadsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadDir = path.resolve(
    process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  );
  private readonly userStorageLimit = positiveIntegerEnv(
    'UPLOAD_USER_LIMIT_BYTES',
    DEFAULT_USER_STORAGE_LIMIT,
  );
  private readonly totalStorageLimit = positiveIntegerEnv(
    'UPLOAD_TOTAL_LIMIT_BYTES',
    DEFAULT_TOTAL_STORAGE_LIMIT,
  );

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    const result = await this.reconcileStorage();
    this.logger.log(
      `Upload reconciliation complete: kept=${result.kept}, removedMetadata=${result.removedMetadata}, removedFiles=${result.removedFiles}`,
    );
  }

  async saveFile(file: Express.Multer.File, userId: string): Promise<string> {
    if (!file) throw new BadRequestException('Файл не передан');
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new PayloadTooLargeException('Файл слишком большой (макс. 5 МБ)');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext) || !ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        'Допустимы изображения JPEG, PNG, WebP и GIF',
      );
    }

    const detectedMime = detectMimeByMagic(file.buffer);
    if (!detectedMime || detectedMime !== file.mimetype) {
      throw new BadRequestException(
        'Содержимое файла не соответствует заявленному типу изображения',
      );
    }

    let processed: Buffer;
    try {
      processed = await sharp(file.buffer, {
        limitInputPixels: MAX_INPUT_PIXELS,
        animated: false,
        failOn: 'warning',
      })
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'Изображение повреждено или слишком велико',
      );
    }

    const filename = `${randomUUID()}.webp`;
    const tempFilename = `.upload-${randomUUID()}.tmp`;
    const url = `/uploads/${filename}`;
    const sizeBytes = processed.length;
    const finalPath = this.resolveCanonicalPath(filename);
    const tempPath = this.resolveTemporaryPath(tempFilename);

    await this.reserveStorage(userId, filename, url, sizeBytes);
    try {
      await fs.promises.mkdir(this.uploadDir, { recursive: true });
      await fs.promises.writeFile(tempPath, processed, { flag: 'wx' });
      await fs.promises.rename(tempPath, finalPath);
    } catch {
      await fs.promises.unlink(tempPath).catch(() => undefined);
      await this.releaseStorage(url, userId, sizeBytes).catch((releaseError) =>
        this.logger.error(
          `Failed to roll back upload reservation for ${filename}`,
          releaseError instanceof Error ? releaseError.stack : undefined,
        ),
      );
      throw new ServiceUnavailableException('Не удалось сохранить файл');
    }

    return url;
  }

  async deleteFile(url: string, userId: string): Promise<void> {
    const match = UPLOAD_URL.exec(url);
    if (!match) throw new BadRequestException('Некорректный путь к файлу');

    const upload = await this.prisma.upload.findFirst({
      where: { url, userId },
    });
    if (!upload) throw new NotFoundException('Файл не найден');

    const filePath = this.resolveCanonicalPath(upload.filename);
    if (upload.url !== `/uploads/${upload.filename}`) {
      throw new ServiceUnavailableException(
        'Метаданные файла повреждены; требуется сверка хранилища',
      );
    }

    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw new ServiceUnavailableException('Не удалось удалить файл');
      }
    }

    await this.releaseStorage(upload.url, userId, upload.sizeBytes);
  }

  /**
   * Reconcile database metadata, quota counters and canonical files.
   * Called before the HTTP server starts and safe to run repeatedly.
   */
  async reconcileStorage(): Promise<{
    kept: number;
    removedMetadata: number;
    removedFiles: number;
  }> {
    await fs.promises.mkdir(this.uploadDir, { recursive: true });
    const [entries, uploads] = await Promise.all([
      fs.promises.readdir(this.uploadDir, { withFileTypes: true }),
      this.prisma.upload.findMany({
        select: {
          id: true,
          filename: true,
          url: true,
          sizeBytes: true,
          userId: true,
        },
      }),
    ]);

    const metadataByFilename = new Map(
      uploads
        .filter(
          (upload) =>
            UPLOAD_FILENAME.test(upload.filename) &&
            upload.url === `/uploads/${upload.filename}` &&
            upload.sizeBytes > 0,
        )
        .map((upload) => [upload.filename.toLowerCase(), upload]),
    );
    const keptIds = new Set<string>();
    let removedFiles = 0;

    for (const entry of entries) {
      if (TEMP_UPLOAD_FILENAME.test(entry.name)) {
        if (!entry.isDirectory()) {
          await this.unlinkInsideUploadDir(entry.name);
          removedFiles += 1;
        }
        continue;
      }
      if (!UPLOAD_FILENAME.test(entry.name)) continue;

      const upload = metadataByFilename.get(entry.name.toLowerCase());
      const filePath = this.resolveCanonicalPath(entry.name);
      const stats = await fs.promises.lstat(filePath).catch(() => null);
      if (!upload || !stats?.isFile() || stats.size !== upload.sizeBytes) {
        if (stats && !stats.isDirectory()) {
          await fs.promises.unlink(filePath);
          removedFiles += 1;
        }
        continue;
      }
      keptIds.add(upload.id);
    }

    const removedMetadataIds = uploads
      .filter((upload) => !keptIds.has(upload.id))
      .map((upload) => upload.id);

    await this.prisma.$transaction(async (tx) => {
      if (removedMetadataIds.length > 0) {
        await tx.upload.deleteMany({
          where: { id: { in: removedMetadataIds } },
        });
      }
      await tx.user.updateMany({ data: { uploadBytes: 0n } });
      const perUser = await tx.upload.groupBy({
        by: ['userId'],
        _sum: { sizeBytes: true },
      });
      for (const item of perUser) {
        await tx.user.updateMany({
          where: { id: item.userId },
          data: { uploadBytes: BigInt(item._sum.sizeBytes ?? 0) },
        });
      }
      const total = await tx.upload.aggregate({ _sum: { sizeBytes: true } });
      await tx.uploadStorage.upsert({
        where: { id: 1 },
        create: { id: 1, usedBytes: BigInt(total._sum.sizeBytes ?? 0) },
        update: { usedBytes: BigInt(total._sum.sizeBytes ?? 0) },
      });
    });

    return {
      kept: keptIds.size,
      removedMetadata: removedMetadataIds.length,
      removedFiles,
    };
  }

  /**
   * Delete a user and owned files while holding a database row lock. If any
   * filesystem operation fails, the owner and metadata transaction rolls back.
   */
  async deleteUserWithUploads(userId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`,
        );
        const uploads = await tx.upload.findMany({ where: { userId } });

        for (const upload of uploads) {
          if (
            !UPLOAD_FILENAME.test(upload.filename) ||
            upload.url !== `/uploads/${upload.filename}`
          ) {
            throw new Error('Invalid upload metadata');
          }
          const filePath = this.resolveCanonicalPath(upload.filename);
          const stats = await fs.promises.lstat(filePath).catch((error) => {
            if (isMissingFileError(error)) return null;
            throw error;
          });
          if (!stats) continue;
          if (!stats.isFile()) throw new Error('Unsafe upload entry');
          await fs.promises.unlink(filePath);
        }

        const usedBytes = uploads.reduce(
          (sum, upload) => sum + BigInt(upload.sizeBytes),
          0n,
        );
        await tx.user.delete({ where: { id: userId } });
        if (usedBytes > 0n) {
          const counter = await tx.uploadStorage.updateMany({
            where: { id: 1, usedBytes: { gte: usedBytes } },
            data: { usedBytes: { decrement: usedBytes } },
          });
          if (counter.count !== 1) throw new Error('Invalid storage counter');
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete uploads for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Не удалось безопасно удалить файлы пользователя',
      );
    }
  }

  private async reserveStorage(
    userId: string,
    filename: string,
    url: string,
    sizeBytes: number,
  ) {
    const size = BigInt(sizeBytes);
    await this.prisma.$transaction(async (tx) => {
      await tx.uploadStorage.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
      });

      const user = await tx.user.updateMany({
        where: {
          id: userId,
          uploadBytes: { lte: BigInt(this.userStorageLimit - sizeBytes) },
        },
        data: { uploadBytes: { increment: size } },
      });
      if (user.count !== 1) {
        throw new PayloadTooLargeException(
          'Лимит хранения пользователя исчерпан',
        );
      }

      const storage = await tx.uploadStorage.updateMany({
        where: {
          id: 1,
          usedBytes: { lte: BigInt(this.totalStorageLimit - sizeBytes) },
        },
        data: { usedBytes: { increment: size } },
      });
      if (storage.count !== 1) {
        throw new PayloadTooLargeException('Общий лимит хранения исчерпан');
      }

      await tx.upload.create({
        data: { filename, url, sizeBytes, userId },
      });
    });
  }

  private async releaseStorage(url: string, userId: string, sizeBytes: number) {
    const size = BigInt(sizeBytes);
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.upload.deleteMany({ where: { url, userId } });
      if (deleted.count !== 1) return;
      await Promise.all([
        tx.user.updateMany({
          where: { id: userId },
          data: { uploadBytes: { decrement: size } },
        }),
        tx.uploadStorage.updateMany({
          where: { id: 1 },
          data: { usedBytes: { decrement: size } },
        }),
      ]);
    });
  }

  private resolveCanonicalPath(filename: string): string {
    if (!UPLOAD_FILENAME.test(filename)) {
      throw new ServiceUnavailableException('Некорректное имя файла');
    }
    return this.resolveInsideUploadDir(filename);
  }

  private resolveTemporaryPath(filename: string): string {
    if (!TEMP_UPLOAD_FILENAME.test(filename)) {
      throw new ServiceUnavailableException('Некорректное временное имя');
    }
    return this.resolveInsideUploadDir(filename);
  }

  private resolveInsideUploadDir(filename: string): string {
    const resolved = path.resolve(this.uploadDir, filename);
    if (path.dirname(resolved) !== this.uploadDir) {
      throw new ServiceUnavailableException('Некорректный путь к файлу');
    }
    return resolved;
  }

  private async unlinkInsideUploadDir(filename: string): Promise<void> {
    const filePath = this.resolveTemporaryPath(filename);
    await fs.promises.unlink(filePath);
  }
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
