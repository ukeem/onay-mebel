import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

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
      throw new BadRequestException('Файл слишком большой (макс. 5 МБ)');

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      throw new BadRequestException(
        `Недопустимый формат. Разрешены: ${ALLOWED_EXT.join(', ')}`,
      );
    }

    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`Недопустимый MIME-тип: ${file.mimetype}`);
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.promises.writeFile(filePath, file.buffer);

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
    } catch {}
  }
}
