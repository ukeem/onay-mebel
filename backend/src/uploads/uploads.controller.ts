import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadsService.saveFile(file);
    return { url };
  }

  @Delete()
  async remove(@Body('url') url: string) {
    if (
      !url ||
      typeof url !== 'string' ||
      !url.startsWith('/uploads/') ||
      url.includes('..')
    ) {
      throw new BadRequestException('Некорректный путь к файлу');
    }
    await this.uploadsService.deleteFile(url);
    return { message: 'Файл удалён' };
  }
}
