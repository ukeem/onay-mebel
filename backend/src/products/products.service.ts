import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { copyProductData } from '../shared/copy-product.util';
import {
  CreateProductDto,
  UpdateProductDto,
  UpsertCountertopDto,
  UpsertDrawerDto,
  UpsertExtraDto,
  UpsertFacadeDto,
  UpsertMezzanineDto,
  UpsertPartitionDto,
  UpsertSectionDto,
  UpsertShelfDto,
} from './dto/products.dto';

const PRODUCT_INCLUDE = {
  productType: true,
  bodyMaterial: { include: { materialType: true } },
  backWallMaterial: { include: { materialType: true } },
  falseFacadeMaterial: { include: { materialType: true } },
  sections: true,
  partitions: true,
  shelves: true,
  facades: { include: { material: { include: { materialType: true } } } },
  drawers: true,
  mezzanine: {
    include: {
      bodyMaterial: { include: { materialType: true } },
      backWallMaterial: true,
      falseFacadeMaterial: true,
      sections: true,
      partitions: true,
      shelves: true,
      facades: { include: { material: true } },
      drawers: true,
    },
  },
  countertop: {
    include: {
      material: { include: { materialType: true } },
      apronMaterial: { include: { materialType: true } },
    },
  },
  extras: true,
} as const;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /* ── list products for room ── */
  async findAllByRoom(roomId: string, userId: string) {
    await this.ensureRoomOwner(roomId, userId);
    return this.prisma.product.findMany({
      where: { roomId },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  /* ── single product ── */
  async findOne(id: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { ...PRODUCT_INCLUDE, room: { include: { project: true } } },
    });
    if (!product) throw new NotFoundException('Изделие не найдено');
    if (product.room.project.userId !== userId)
      throw new ForbiddenException('Нет доступа');
    return product;
  }

  /* ── create product ── */
  async create(dto: CreateProductDto, userId: string) {
    await this.ensureRoomOwner(dto.roomId, userId);
    return this.prisma.product.create({
      data: {
        roomId: dto.roomId,
        productTypeId: dto.productTypeId,
        width: dto.width ?? 0,
        height: dto.height ?? 0,
        depth: dto.depth ?? 600,
      },
      include: PRODUCT_INCLUDE,
    });
  }

  /* ── update product (main fields + switchers) ── */
  async update(id: string, dto: UpdateProductDto, userId: string) {
    await this.ensureProductOwner(id, userId);
    return this.prisma.product.update({
      where: { id },
      data: { ...dto },
      include: PRODUCT_INCLUDE,
    });
  }

  /* ── delete product ── */
  async remove(id: string, userId: string) {
    await this.ensureProductOwner(id, userId);
    return this.prisma.product.delete({ where: { id } });
  }

  /* ── copy (duplicate) product ── */
  async copy(id: string, userId: string) {
    const src = await this.findOne(id, userId);

    return this.prisma.$transaction(async (tx) => {
      const newProductId = await copyProductData(tx, src, src.roomId);

      return tx.product.findUnique({
        where: { id: newProductId },
        include: PRODUCT_INCLUDE,
      });
    });
  }

  /* ========== SUB-COMPONENTS ========== */

  /* ── Sections ── */
  async upsertSections(
    productId: string,
    items: UpsertSectionDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    return this.prisma.$transaction(async (tx) => {
      // delete removed — scope by mezzanineId from items
      const mezId = items.find((i) => i.mezzanineId)?.mezzanineId ?? null;
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productSection.deleteMany({
        where: { productId, mezzanineId: mezId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        if (item.id) {
          results.push(
            await tx.productSection.update({
              where: { id: item.id },
              data: { qty: item.qty },
            }),
          );
        } else {
          results.push(
            await tx.productSection.create({
              data: { productId, qty: item.qty, mezzanineId: item.mezzanineId },
            }),
          );
        }
      }
      return results;
    });
  }

  /* ── Partitions ── */
  async upsertPartitions(
    productId: string,
    items: UpsertPartitionDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    return this.prisma.$transaction(async (tx) => {
      const mezId = items.find((i) => i.mezzanineId)?.mezzanineId ?? null;
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productPartition.deleteMany({
        where: { productId, mezzanineId: mezId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        if (item.id) {
          results.push(
            await tx.productPartition.update({
              where: { id: item.id },
              data: { qty: item.qty, height: item.height },
            }),
          );
        } else {
          results.push(
            await tx.productPartition.create({
              data: {
                productId,
                qty: item.qty,
                height: item.height,
                mezzanineId: item.mezzanineId,
              },
            }),
          );
        }
      }
      return results;
    });
  }

  /* ── Shelves ── */
  async upsertShelves(
    productId: string,
    items: UpsertShelfDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    return this.prisma.$transaction(async (tx) => {
      const mezId = items.find((i) => i.mezzanineId)?.mezzanineId ?? null;
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productShelf.deleteMany({
        where: { productId, mezzanineId: mezId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        if (item.id) {
          results.push(
            await tx.productShelf.update({
              where: { id: item.id },
              data: { qty: item.qty, width: item.width },
            }),
          );
        } else {
          results.push(
            await tx.productShelf.create({
              data: {
                productId,
                qty: item.qty,
                width: item.width,
                mezzanineId: item.mezzanineId,
              },
            }),
          );
        }
      }
      return results;
    });
  }

  /* ── Facades ── */
  async upsertFacades(
    productId: string,
    items: UpsertFacadeDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    return this.prisma.$transaction(async (tx) => {
      const mezId = items.find((i) => i.mezzanineId)?.mezzanineId ?? null;
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productFacade.deleteMany({
        where: { productId, mezzanineId: mezId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        const ldsp = item.isLdsp ?? false;
        const data = {
          materialId: ldsp ? null : item.materialId || null,
          isLdsp: ldsp,
          width: item.width,
          height: item.height,
          qty: item.qty,
          handleQty: item.handleQty ?? 0,
          openType: item.openType ?? 'HANDLE',
        };
        if (item.id) {
          results.push(
            await tx.productFacade.update({ where: { id: item.id }, data }),
          );
        } else {
          results.push(
            await tx.productFacade.create({
              data: { ...data, productId, mezzanineId: item.mezzanineId },
            }),
          );
        }
      }
      return results;
    });
  }

  /* ── Drawers ── */
  async upsertDrawers(
    productId: string,
    items: UpsertDrawerDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    return this.prisma.$transaction(async (tx) => {
      const mezId = items.find((i) => i.mezzanineId)?.mezzanineId ?? null;
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productDrawer.deleteMany({
        where: { productId, mezzanineId: mezId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        const data = {
          width: item.width,
          height: item.height,
          qty: item.qty,
          handleQty: item.handleQty ?? 0,
          slideType: item.slideType ?? 'GUIDE',
        };
        if (item.id) {
          results.push(
            await tx.productDrawer.update({ where: { id: item.id }, data }),
          );
        } else {
          results.push(
            await tx.productDrawer.create({
              data: { ...data, productId, mezzanineId: item.mezzanineId },
            }),
          );
        }
      }
      return results;
    });
  }

  /* ── Mezzanine ── */
  async upsertMezzanine(
    productId: string,
    dto: UpsertMezzanineDto,
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    return this.prisma.productMezzanine.upsert({
      where: { productId },
      create: { productId, ...dto },
      update: { ...dto },
      include: {
        bodyMaterial: { include: { materialType: true } },
        sections: true,
        partitions: true,
        shelves: true,
        facades: true,
        drawers: true,
      },
    });
  }

  async removeMezzanine(productId: string, userId: string) {
    await this.ensureProductOwner(productId, userId);
    const existing = await this.prisma.productMezzanine.findUnique({
      where: { productId },
    });
    if (!existing) return { deleted: true };
    return this.prisma.productMezzanine.delete({ where: { productId } });
  }

  /* ── Countertop ── */
  async upsertCountertop(
    productId: string,
    dto: UpsertCountertopDto,
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    return this.prisma.productCountertop.upsert({
      where: { productId },
      create: { productId, ...dto },
      update: { ...dto },
      include: {
        material: { include: { materialType: true } },
        apronMaterial: { include: { materialType: true } },
      },
    });
  }

  async removeCountertop(productId: string, userId: string) {
    await this.ensureProductOwner(productId, userId);
    const existing = await this.prisma.productCountertop.findUnique({
      where: { productId },
    });
    if (!existing) return { deleted: true };
    return this.prisma.productCountertop.delete({ where: { productId } });
  }

  /* ── Extras ── */
  async upsertExtras(
    productId: string,
    items: UpsertExtraDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    return this.prisma.$transaction(async (tx) => {
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productExtra.deleteMany({
        where: { productId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        if (item.id) {
          results.push(
            await tx.productExtra.update({
              where: { id: item.id },
              data: { name: item.name, price: item.price ?? 0 },
            }),
          );
        } else {
          results.push(
            await tx.productExtra.create({
              data: {
                productId,
                name: item.name,
                price: item.price ?? 0,
              },
            }),
          );
        }
      }
      return results;
    });
  }

  /* ========== HELPERS ========== */

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

  private async ensureProductOwner(productId: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { room: { include: { project: true } } },
    });
    if (!product) throw new NotFoundException('Изделие не найдено');
    if (product.room.project.userId !== userId)
      throw new ForbiddenException('Нет доступа');
    return product;
  }
}
