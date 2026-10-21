import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
const UPLOAD_URL = /^\/uploads\/([0-9a-f-]{36}\.webp)$/i;

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
export class UploadsService {
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

  constructor(private readonly prisma: PrismaService) {
    fs.mkdirSync(this.uploadDir, { recursive: true });
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
    const url = `/uploads/${filename}`;
    const sizeBytes = processed.length;

    await this.reserveStorage(userId, filename, url, sizeBytes);
    try {
      await fs.promises.writeFile(
        path.join(this.uploadDir, filename),
        processed,
        {
          flag: 'wx',
        },
      );
    } catch {
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

    try {
      await fs.promises.unlink(path.join(this.uploadDir, upload.filename));
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw new ServiceUnavailableException('Не удалось удалить файл');
      }
    }

    await this.releaseStorage(upload.url, userId, upload.sizeBytes);
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
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
