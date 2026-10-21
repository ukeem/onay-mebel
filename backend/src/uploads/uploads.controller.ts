import {
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, Matches, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MAX_UPLOAD_SIZE, UploadsService } from './uploads.service';

class DeleteUploadDto {
  @IsString()
  @MaxLength(100)
  @Matches(/^\/uploads\/[0-9a-f-]{36}\.webp$/i)
  url!: string;
}

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_UPLOAD_SIZE,
        files: 1,
        fields: 0,
        parts: 1,
        fieldNameSize: 100,
        headerPairs: 50,
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: { id: string } },
  ) {
    const url = await this.uploadsService.saveFile(file, req.user.id);
    return { url };
  }

  @Delete()
  async remove(
    @Body() body: DeleteUploadDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    await this.uploadsService.deleteFile(body.url, req.user.id);
    return { message: 'Файл удалён' };
  }
}
