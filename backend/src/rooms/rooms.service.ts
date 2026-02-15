import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/rooms.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  /* ── list rooms for a project ── */
  async findAll(projectId: string, userId: string) {
    await this.ensureProjectOwner(projectId, userId);
    return this.prisma.room.findMany({
      where: { projectId },
      include: {
        roomType: true,
        products: { include: { productType: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /* ── single ── */
  async findOne(id: string, userId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        roomType: true,
        project: true,
        products: {
          include: { productType: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!room) throw new NotFoundException('Комната не найдена');
    if (room.project.userId !== userId)
      throw new ForbiddenException('Нет доступа');
    return room;
  }

  /* ── create ── */
  async create(dto: CreateRoomDto, userId: string) {
    await this.ensureProjectOwner(dto.projectId, userId);
    return this.prisma.room.create({
      data: { projectId: dto.projectId, roomTypeId: dto.roomTypeId },
      include: { roomType: true },
    });
  }

  /* ── update ── */
  async update(id: string, dto: UpdateRoomDto, userId: string) {
    const room = await this.ensureRoomOwner(id, userId);
    return this.prisma.room.update({
      where: { id: room.id },
      data: { roomTypeId: dto.roomTypeId },
      include: { roomType: true },
    });
  }

  /* ── delete ── */
  async remove(id: string, userId: string) {
    await this.ensureRoomOwner(id, userId);
    return this.prisma.room.delete({ where: { id } });
  }

  /* ── helpers ── */
  private async ensureProjectOwner(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId)
      throw new ForbiddenException('Нет доступа к проекту');
    return project;
  }

  private async ensureRoomOwner(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { project: true },
    });
    if (!room) throw new NotFoundException('Комната не найдена');
    if (room.project.userId !== userId)
      throw new ForbiddenException('Нет доступа');
    return room;
  }
}
