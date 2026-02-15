import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class UploadsService {
  constructor() {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  saveFile(file: Express.Multer.File): string {
    if (!file) throw new BadRequestException('Файл не передан');
    if (file.size > MAX_SIZE) throw new BadRequestException('Файл слишком большой (макс. 5 МБ)');

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      throw new BadRequestException(`Недопустимый формат. Разрешены: ${ALLOWED_EXT.join(', ')}`);
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, file.buffer);

    return `/uploads/${filename}`;
  }

  deleteFile(url: string): void {
    if (!url) return;
    const filename = path.basename(url);
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
