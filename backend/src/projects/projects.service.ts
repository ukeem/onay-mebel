import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  copyProductData,
  PRODUCT_COPY_INCLUDE,
} from '../shared/copy-product.util';
import { CreateProjectDto, UpdateProjectDto } from './dto/projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  /* ── list (own projects) ── */
  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: {
        rooms: {
          include: { roomType: true, _count: { select: { products: true } } },
        },
        _count: { select: { calculations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ── single ── */
  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            roomType: true,
            products: { include: { productType: true } },
          },
        },
        calculations: true,
      },
    });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId)
      throw new ForbiddenException('Нет доступа к проекту');
    return project;
  }

  /* ── create ── */
  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: { userId, name: dto.name, clientData: dto.clientData },
    });
  }

  /* ── update ── */
  async update(id: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.ensureOwner(id, userId);
    return this.prisma.project.update({
      where: { id: project.id },
      data: { ...dto },
    });
  }

  /* ── delete ── */
  async remove(id: string, userId: string) {
    await this.ensureOwner(id, userId);
    return this.prisma.project.delete({ where: { id } });
  }

  /* ── duplicate ── */
  async duplicate(id: string, userId: string) {
    const src = await this.findForDuplicate(id, userId);

    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.project.create({
        data: {
          userId,
          name: `${src.name} (копия)`,
          clientData: src.clientData,
        },
      });

      for (const room of src.rooms) {
        const newRoom = await tx.room.create({
          data: {
            projectId: copy.id,
            roomTypeId: room.roomTypeId,
          },
        });

        for (const product of room.products) {
          await copyProductData(tx, product, newRoom.id);
        }
      }

      return copy;
    });
  }

  /* ── helper: find for duplicate with full sub-components ── */
  private async findForDuplicate(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            products: { include: PRODUCT_COPY_INCLUDE },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId)
      throw new ForbiddenException('Нет доступа к проекту');
    return project;
  }

  /* ── helper ── */
  private async ensureOwner(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId)
      throw new ForbiddenException('Нет доступа к проекту');
    return project;
  }
}
