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

  /* ── copy (duplicate room with all products & sub-components) ── */
  async copy(id: string, userId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        project: true,
        products: {
          include: {
            sections: true,
            partitions: true,
            shelves: true,
            facades: true,
            drawers: true,
            extras: true,
            mezzanine: {
              include: {
                sections: true,
                partitions: true,
                shelves: true,
                facades: true,
                drawers: true,
              },
            },
            countertop: true,
          },
        },
      },
    });
    if (!room) throw new NotFoundException('Комната не найдена');
    if (room.project.userId !== userId)
      throw new ForbiddenException('Нет доступа');

    return this.prisma.$transaction(async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          projectId: room.projectId,
          roomTypeId: room.roomTypeId,
        },
      });

      for (const product of room.products) {
        const newProduct = await tx.product.create({
          data: {
            roomId: newRoom.id,
            productTypeId: product.productTypeId,
            width: product.width,
            height: product.height,
            depth: product.depth,
            bodyMaterialId: product.bodyMaterialId,
            sectionsEnabled: product.sectionsEnabled,
            backWallEnabled: product.backWallEnabled,
            backWallMaterialId: product.backWallMaterialId,
            partitionsEnabled: product.partitionsEnabled,
            shelvesEnabled: product.shelvesEnabled,
            facadesEnabled: product.facadesEnabled,
            falseFacadesEnabled: product.falseFacadesEnabled,
            falseFacadeQty: product.falseFacadeQty,
            falseFacadeMaterialId: product.falseFacadeMaterialId,
            drawersEnabled: product.drawersEnabled,
            mezzanineEnabled: product.mezzanineEnabled,
            countertopEnabled: product.countertopEnabled,
            extrasEnabled: product.extrasEnabled,
          },
        });

        /* mezzanine */
        const mezzanineIdMap: Record<string, string> = {};
        if (product.mezzanine) {
          const mez = product.mezzanine;
          const newMez = await tx.productMezzanine.create({
            data: {
              productId: newProduct.id,
              height: mez.height,
              sectionsEnabled: mez.sectionsEnabled,
              partitionsEnabled: mez.partitionsEnabled,
              shelvesEnabled: mez.shelvesEnabled,
              facadesEnabled: mez.facadesEnabled,
              falseFacadesEnabled: mez.falseFacadesEnabled,
              falseFacadeQty: mez.falseFacadeQty,
              falseFacadeMaterialId: mez.falseFacadeMaterialId,
              drawersEnabled: mez.drawersEnabled,
              backWallEnabled: mez.backWallEnabled,
              backWallMaterialId: mez.backWallMaterialId,
            },
          });
          mezzanineIdMap[mez.id] = newMez.id;
        }

        /* sections */
        for (const s of product.sections) {
          await tx.productSection.create({
            data: {
              productId: newProduct.id,
              mezzanineId: s.mezzanineId ? mezzanineIdMap[s.mezzanineId] : null,
              qty: s.qty,
            },
          });
        }

        /* partitions */
        for (const p of product.partitions) {
          await tx.productPartition.create({
            data: {
              productId: newProduct.id,
              mezzanineId: p.mezzanineId ? mezzanineIdMap[p.mezzanineId] : null,
              height: p.height,
              qty: p.qty,
            },
          });
        }

        /* shelves */
        for (const sh of product.shelves) {
          await tx.productShelf.create({
            data: {
              productId: newProduct.id,
              mezzanineId: sh.mezzanineId
                ? mezzanineIdMap[sh.mezzanineId]
                : null,
              width: sh.width,
              qty: sh.qty,
            },
          });
        }

        /* facades */
        for (const f of product.facades) {
          await tx.productFacade.create({
            data: {
              productId: newProduct.id,
              mezzanineId: f.mezzanineId ? mezzanineIdMap[f.mezzanineId] : null,
              materialId: f.materialId,
              isLdsp: f.isLdsp,
              width: f.width,
              height: f.height,
              qty: f.qty,
              handleQty: f.handleQty,
            },
          });
        }

        /* drawers */
        for (const dr of product.drawers) {
          await tx.productDrawer.create({
            data: {
              productId: newProduct.id,
              mezzanineId: dr.mezzanineId
                ? mezzanineIdMap[dr.mezzanineId]
                : null,
              width: dr.width,
              height: dr.height,
              qty: dr.qty,
              handleQty: dr.handleQty,
            },
          });
        }

        /* countertop */
        if (product.countertop) {
          const ct = product.countertop;
          await tx.productCountertop.create({
            data: {
              productId: newProduct.id,
              materialId: ct.materialId,
              isLdsp: ct.isLdsp,
              width: ct.width,
              depth: ct.depth,
              apronEnabled: ct.apronEnabled,
              apronMaterialId: ct.apronMaterialId,
              apronIsLdsp: ct.apronIsLdsp,
              apronWidth: ct.apronWidth,
              apronHeight: ct.apronHeight,
            },
          });
        }

        /* extras */
        for (const ex of product.extras) {
          await tx.productExtra.create({
            data: {
              productId: newProduct.id,
              name: ex.name,
              price: ex.price,
            },
          });
        }
      }

      return tx.room.findUnique({
        where: { id: newRoom.id },
        include: { roomType: true },
      });
    });
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
