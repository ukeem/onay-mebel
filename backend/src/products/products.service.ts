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
  UpsertFalseFacadeDto,
  UpsertPartitionDto,
  UpsertSectionDto,
  UpsertShelfDto,
} from './dto/products.dto';

const MAT_INCLUDE = { include: { materialType: true } } as const;
const HW_INCLUDE = { include: { hardwareType: true } } as const;

const PRODUCT_INCLUDE = {
  productType: true,
  sections: {
    include: {
      material: MAT_INCLUDE,
      backWallMaterial: MAT_INCLUDE,
      legsHardware: HW_INCLUDE,
    },
  },
  partitions: { include: { material: MAT_INCLUDE } },
  shelves: { include: { material: MAT_INCLUDE, holderHardware: HW_INCLUDE } },
  facades: {
    include: {
      material: MAT_INCLUDE,
      hingeHardware: HW_INCLUDE,
      handleHardware: HW_INCLUDE,
      tipOnHardware: HW_INCLUDE,
    },
  },
  falseFacades: { include: { material: MAT_INCLUDE } },
  drawers: {
    include: { material: MAT_INCLUDE, slideHardware: HW_INCLUDE },
  },
  countertops: {
    include: {
      material: MAT_INCLUDE,
      apronMaterial: MAT_INCLUDE,
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
      },
      include: PRODUCT_INCLUDE,
    });
  }

  /* ── update product (switchers) ── */
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
    const results = await this.prisma.$transaction(async (tx) => {
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productSection.deleteMany({
        where: { productId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        const data = {
          label: item.label || null,
          qty: item.qty,
          width: item.width,
          height: item.height,
          depth: item.depth,
          materialId: item.materialId || null,
          backWallEnabled: item.backWallEnabled ?? false,
          backWallMaterialId: item.backWallMaterialId || null,
          legsEnabled: item.legsEnabled ?? false,
          legsHardwareId: item.legsEnabled ? item.legsHardwareId || null : null,
        };
        if (item.id) {
          results.push(
            await tx.productSection.update({ where: { id: item.id }, data }),
          );
        } else {
          results.push(
            await tx.productSection.create({ data: { productId, ...data } }),
          );
        }
      }
      return results;
    });

    // Sync user defaults from last section
    if (items.length > 0) {
      const last = items[items.length - 1];
      await this.syncUserDefaults(userId, {
        sectionMaterialId: last.materialId,
        backWallMaterialId: last.backWallMaterialId,
        legsHardwareId: last.legsEnabled ? last.legsHardwareId : undefined,
      });
    }

    return results;
  }

  /* ── Partitions ── */
  async upsertPartitions(
    productId: string,
    items: UpsertPartitionDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    return this.prisma.$transaction(async (tx) => {
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productPartition.deleteMany({
        where: { productId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        const data = {
          label: item.label || null,
          qty: item.qty,
          height: item.height,
          depth: item.depth,
          materialId: item.materialId || null,
        };
        if (item.id) {
          results.push(
            await tx.productPartition.update({ where: { id: item.id }, data }),
          );
        } else {
          results.push(
            await tx.productPartition.create({ data: { productId, ...data } }),
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
    const results = await this.prisma.$transaction(async (tx) => {
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productShelf.deleteMany({
        where: { productId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        const data = {
          label: item.label || null,
          qty: item.qty,
          width: item.width,
          depth: item.depth,
          materialId: item.materialId || null,
          holderHardwareId: item.holderHardwareId || null,
        };
        if (item.id) {
          results.push(
            await tx.productShelf.update({ where: { id: item.id }, data }),
          );
        } else {
          results.push(
            await tx.productShelf.create({ data: { productId, ...data } }),
          );
        }
      }
      return results;
    });

    // Sync hardware defaults from last shelf
    if (items.length > 0) {
      const last = items[items.length - 1];
      await this.syncUserDefaults(userId, {
        holderHardwareId: last.holderHardwareId,
      });
    }

    return results;
  }

  /* ── Facades ── */
  async upsertFacades(
    productId: string,
    items: UpsertFacadeDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    const results = await this.prisma.$transaction(async (tx) => {
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productFacade.deleteMany({
        where: { productId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        const data = {
          label: item.label || null,
          materialId: item.materialId || null,
          width: item.width,
          height: item.height,
          qty: item.qty,
          handleQty: item.handleQty ?? 0,
          openType: item.openType ?? ('HANDLE' as const),
          hingesEnabled: item.hingesEnabled ?? false,
          hingeHardwareId: item.hingesEnabled
            ? item.hingeHardwareId || null
            : null,
          handleHardwareId: item.handleHardwareId || null,
          tipOnHardwareId: item.tipOnHardwareId || null,
        };
        if (item.id) {
          results.push(
            await tx.productFacade.update({ where: { id: item.id }, data }),
          );
        } else {
          results.push(
            await tx.productFacade.create({ data: { productId, ...data } }),
          );
        }
      }
      return results;
    });

    // Sync defaults from last facade
    if (items.length > 0) {
      const last = items[items.length - 1];
      const hwUpdates: Record<string, string | null | undefined> = {
        facadeMaterialId: last.materialId,
        hingeHardwareId: last.hingeHardwareId,
      };
      if (
        (last.openType ?? 'HANDLE') === 'HANDLE' &&
        (last.handleQty ?? 0) > 0
      ) {
        hwUpdates.handleHardwareId = last.handleHardwareId;
      } else if (last.openType === 'TIP_ON') {
        hwUpdates.tipOnHardwareId = last.tipOnHardwareId;
      }
      await this.syncUserDefaults(userId, hwUpdates);
    }

    return results;
  }

  /* ── Drawers ── */
  async upsertDrawers(
    productId: string,
    items: UpsertDrawerDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    const results = await this.prisma.$transaction(async (tx) => {
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productDrawer.deleteMany({
        where: { productId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        const data = {
          label: item.label || null,
          width: item.width,
          height: item.height,
          depth: item.depth,
          qty: item.qty,
          handleQty: item.handleQty ?? 0,
          slideType: item.slideType ?? ('GUIDE' as const),
          materialId: item.materialId || null,
          slideHardwareId: item.slideHardwareId || null,
        };
        if (item.id) {
          results.push(
            await tx.productDrawer.update({ where: { id: item.id }, data }),
          );
        } else {
          results.push(
            await tx.productDrawer.create({ data: { productId, ...data } }),
          );
        }
      }
      return results;
    });

    // Sync defaults from last drawer
    if (items.length > 0) {
      const last = items[items.length - 1];
      const hwUpdates: Record<string, string | null | undefined> = {};
      if ((last.slideType ?? 'GUIDE') === 'TANDEM') {
        hwUpdates.tandemHardwareId = last.slideHardwareId;
      } else {
        hwUpdates.slideHardwareId = last.slideHardwareId;
      }
      await this.syncUserDefaults(userId, hwUpdates);
    }

    return results;
  }

  /* ── False Facades ── */
  async upsertFalseFacades(
    productId: string,
    items: UpsertFalseFacadeDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    const results = await this.prisma.$transaction(async (tx) => {
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productFalseFacade.deleteMany({
        where: { productId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        const data = {
          label: item.label || null,
          qty: item.qty,
          height: item.height,
          depth: item.depth,
          materialId: item.materialId || null,
        };
        if (item.id) {
          results.push(
            await tx.productFalseFacade.update({
              where: { id: item.id },
              data,
            }),
          );
        } else {
          results.push(
            await tx.productFalseFacade.create({
              data: { productId, ...data },
            }),
          );
        }
      }
      return results;
    });

    // Sync defaults from last false facade
    if (items.length > 0) {
      const last = items[items.length - 1];
      await this.syncUserDefaults(userId, {
        falseFacadeMaterialId: last.materialId,
      });
    }

    return results;
  }

  /* ── Countertops ── */
  async upsertCountertops(
    productId: string,
    items: UpsertCountertopDto[],
    userId: string,
  ) {
    await this.ensureProductOwner(productId, userId);
    const results = await this.prisma.$transaction(async (tx) => {
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      await tx.productCountertop.deleteMany({
        where: { productId, id: { notIn: keepIds } },
      });
      const results = [];
      for (const item of items) {
        const data = {
          label: item.label || null,
          materialId: item.materialId || null,
          width: item.width,
          depth: item.depth ?? 600,
          apronEnabled: item.apronEnabled ?? false,
          apronMaterialId: item.apronMaterialId || null,
          apronWidth: item.apronWidth ?? null,
          apronHeight: item.apronHeight ?? null,
        };
        if (item.id) {
          results.push(
            await tx.productCountertop.update({ where: { id: item.id }, data }),
          );
        } else {
          results.push(
            await tx.productCountertop.create({ data: { productId, ...data } }),
          );
        }
      }
      return results;
    });

    // Sync defaults from last countertop
    if (items.length > 0) {
      const last = items[items.length - 1];
      await this.syncUserDefaults(userId, {
        countertopMaterialId: last.materialId,
      });
    }

    return results;
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
              data: {
                label: item.label || null,
                name: item.name,
                price: item.price ?? 0,
              },
            }),
          );
        } else {
          results.push(
            await tx.productExtra.create({
              data: {
                productId,
                label: item.label || null,
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

  /**
   * Auto-update UserDefaults when user saves subcomponents.
   * Takes the last item's materialId/hardwareId from each saved array.
   */
  private async syncUserDefaults(
    userId: string,
    updates: Record<string, string | null | undefined>,
  ) {
    const data: Record<string, string | null> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) data[key] = val || null;
    }
    if (Object.keys(data).length === 0) return;
    await this.prisma.userDefaults.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
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

  private async ensureProductOwner(productId: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { room: { include: { project: true } } },
    });
    if (!product) throw new NotFoundException('Изделие не найдено');
    if (product.room.project.userId !== userId)
      throw new ForbiddenException('Нет доступа');
  }
}
