import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_WIDTH = 500;

/**
 * Magic bytes (file signatures) для проверки реального типа файла.
 * Проверяем первые N байт буфера.
 */
const MAGIC_BYTES: { mime: string; offset: number; bytes: number[] }[] = [
  // JPEG: FF D8 FF
  { mime: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  // PNG: 89 50 4E 47
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },
  // GIF87a / GIF89a: 47 49 46 38
  { mime: 'image/gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  // WebP: RIFF....WEBP (bytes 8-11 = WEBP)
  { mime: 'image/webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
];

function detectMimeByMagic(buffer: Buffer): string | null {
  for (const sig of MAGIC_BYTES) {
    if (buffer.length < sig.offset + sig.bytes.length) continue;
    const match = sig.bytes.every((b, i) => buffer[sig.offset + i] === b);
    if (match) return sig.mime;
  }
  return null;
}

@Injectable()
export class UploadsService {
  constructor() {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('Файл не передан');
    if (file.size > MAX_SIZE)
      throw new BadRequestException('Файл слишком большой (макс. 50 МБ)');

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      throw new BadRequestException(
        `Недопустимый формат. Разрешены: ${ALLOWED_EXT.join(', ')}`,
      );
    }

    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`Недопустимый MIME-тип: ${file.mimetype}`);
    }

    // Проверка magic bytes — реальная сигнатура файла
    const detectedMime = detectMimeByMagic(file.buffer);
    if (!detectedMime || !ALLOWED_MIME.includes(detectedMime)) {
      throw new BadRequestException(
        'Содержимое файла не соответствует допустимому изображению',
      );
    }

    // Ресайз и оптимизация: max-width 500px, конвертация в webp
    const processed = await sharp(file.buffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.promises.writeFile(filePath, processed);

    return `/uploads/${filename}`;
  }

  async deleteFile(url: string): Promise<void> {
    if (!url) return;
    const filename = path.basename(url);
    const filePath = path.resolve(UPLOAD_DIR, filename);

    // Prevent path traversal: resolved path must stay inside UPLOAD_DIR
    if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) return;

    try {
      await fs.promises.access(filePath);
      await fs.promises.unlink(filePath);
    } catch {
      // File already deleted or inaccessible — ignore
    }
  }
}
