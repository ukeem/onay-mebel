import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRoomDto, UpdateRoomDto } from './dto/rooms.dto';
import { RoomsService } from './rooms.service';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private svc: RoomsService) {}

  /** GET /api/rooms?projectId=xxx */
  @Get()
  findAll(@Query('projectId') projectId: string, @Req() req: any) {
    return this.svc.findAll(projectId, req.user.id);
  }

  /** GET /api/rooms/:id */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.svc.findOne(id, req.user.id);
  }

  /** POST /api/rooms */
  @Post()
  create(@Body() dto: CreateRoomDto, @Req() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  /** PATCH /api/rooms/:id */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto, @Req() req: any) {
    return this.svc.update(id, dto, req.user.id);
  }

  /** DELETE /api/rooms/:id */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(id, req.user.id);
  }

  /** POST /api/rooms/:id/copy */
  @Post(':id/copy')
  copy(@Param('id') id: string, @Req() req: any) {
    return this.svc.copy(id, req.user.id);
  }
}
