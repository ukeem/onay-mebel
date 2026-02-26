import { Injectable, NotFoundException } from '@nestjs/common';
import { CalcType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/* ─── DTOs (inline for catalog) ─── */

interface CreateTypeDto {
  name: string;
}

interface CreateExtraTypeDto {
  name: string;
  price?: number;
}

interface CreateMaterialDto {
  materialTypeId: string;
  brand?: string;
  calcType?: CalcType;
  length?: number;
  width?: number;
  price?: number;
  image?: string;
}

interface UpdateMaterialDto {
  brand?: string;
  calcType?: CalcType;
  length?: number;
  width?: number;
  price?: number;
  image?: string;
}

interface CreateHardwareDto {
  hardwareTypeId: string;
  brand?: string;
  price?: number;
  image?: string;
}

interface UpdateHardwareDto {
  brand?: string;
  price?: number;
  image?: string;
}

interface UpdateServiceTemplateDto {
  sawingPrice?: number;
  drillingPrice?: number;
  edgeBandingPrice?: number;
  technologistPercent?: number;
  designerPercent?: number;
  assemblyPercent?: number;
  deliveryPrice?: number;
  profitType?: 'COEF' | 'FIXED';
  profitValue?: number;
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /* ═══════════ ROOM TYPES ═══════════ */

  findAllRoomTypes() {
    return this.prisma.roomType.findMany({ orderBy: { name: 'asc' } });
  }

  async createRoomType(dto: CreateTypeDto) {
    return this.prisma.roomType.create({ data: { name: dto.name } });
  }

  async updateRoomType(id: string, dto: CreateTypeDto) {
    await this.ensureExists('roomType', id);
    return this.prisma.roomType.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async deleteRoomType(id: string) {
    await this.ensureExists('roomType', id);
    await this.prisma.roomType.delete({ where: { id } });
    return { message: 'Тип комнаты удалён' };
  }

  /* ═══════════ PRODUCT TYPES ═══════════ */

  findAllProductTypes() {
    return this.prisma.productType.findMany({ orderBy: { name: 'asc' } });
  }

  async createProductType(dto: CreateTypeDto) {
    return this.prisma.productType.create({ data: { name: dto.name } });
  }

  async updateProductType(id: string, dto: CreateTypeDto) {
    await this.ensureExists('productType', id);
    return this.prisma.productType.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async deleteProductType(id: string) {
    await this.ensureExists('productType', id);
    await this.prisma.productType.delete({ where: { id } });
    return { message: 'Тип изделия удалён' };
  }

  /* ═══════════ MATERIAL TYPES ═══════════ */

  findAllMaterialTypes() {
    return this.prisma.materialType.findMany({ orderBy: { name: 'asc' } });
  }

  async createMaterialType(dto: CreateTypeDto) {
    return this.prisma.materialType.create({ data: { name: dto.name } });
  }

  async updateMaterialType(id: string, dto: CreateTypeDto) {
    await this.ensureExists('materialType', id);
    return this.prisma.materialType.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async deleteMaterialType(id: string) {
    await this.ensureExists('materialType', id);
    await this.prisma.materialType.delete({ where: { id } });
    return { message: 'Тип материала удалён' };
  }

  /* ═══════════ HARDWARE TYPES ═══════════ */

  findAllHardwareTypes() {
    return this.prisma.hardwareType.findMany({ orderBy: { name: 'asc' } });
  }

  async createHardwareType(dto: CreateTypeDto) {
    return this.prisma.hardwareType.create({ data: { name: dto.name } });
  }

  async updateHardwareType(id: string, dto: CreateTypeDto) {
    await this.ensureExists('hardwareType', id);
    return this.prisma.hardwareType.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async deleteHardwareType(id: string) {
    await this.ensureExists('hardwareType', id);
    await this.prisma.hardwareType.delete({ where: { id } });
    return { message: 'Тип фурнитуры удалён' };
  }

  /* ═══════════ EXTRA TYPES ═══════════ */

  findAllExtraTypes() {
    return this.prisma.extraType.findMany({ orderBy: { name: 'asc' } });
  }

  async createExtraType(dto: CreateExtraTypeDto) {
    return this.prisma.extraType.create({
      data: { name: dto.name, price: dto.price ?? 0 },
    });
  }

  async updateExtraType(id: string, dto: CreateExtraTypeDto) {
    await this.ensureExists('extraType', id);
    return this.prisma.extraType.update({
      where: { id },
      data: { name: dto.name, price: dto.price ?? 0 },
    });
  }

  async deleteExtraType(id: string) {
    await this.ensureExists('extraType', id);
    await this.prisma.extraType.delete({ where: { id } });
    return { message: 'Тип дополнения удалён' };
  }

  /* ═══════════ MATERIALS ═══════════ */

  findAllMaterials() {
    return this.prisma.material.findMany({
      include: { materialType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMaterial(dto: CreateMaterialDto) {
    const mat = await this.prisma.material.create({
      data: {
        materialTypeId: dto.materialTypeId,
        brand: dto.brand,
        calcType: dto.calcType,
        length: dto.length,
        width: dto.width,
        price: dto.price,
        image: dto.image,
      },
      include: { materialType: true },
    });

    // Auto-sync: add to all users
    const users = await this.prisma.user.findMany({ select: { id: true } });
    if (users.length > 0) {
      await this.prisma.userMaterial.createMany({
        data: users.map((u) => ({
          userId: u.id,
          materialId: mat.id,
          price: mat.price,
        })),
        skipDuplicates: true,
      });
    }

    return mat;
  }

  async updateMaterial(id: string, dto: UpdateMaterialDto) {
    await this.ensureExists('material', id);
    return this.prisma.material.update({
      where: { id },
      data: dto,
      include: { materialType: true },
    });
  }

  async deleteMaterial(id: string) {
    await this.ensureExists('material', id);
    await this.prisma.material.delete({ where: { id } });
    return { message: 'Материал удалён' };
  }

  /* ═══════════ HARDWARE ═══════════ */

  findAllHardware() {
    return this.prisma.hardware.findMany({
      include: { hardwareType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createHardware(dto: CreateHardwareDto) {
    const hw = await this.prisma.hardware.create({
      data: {
        hardwareTypeId: dto.hardwareTypeId,
        brand: dto.brand,
        price: dto.price,
        image: dto.image,
      },
      include: { hardwareType: true },
    });

    // Auto-sync: add to all users
    const users = await this.prisma.user.findMany({ select: { id: true } });
    if (users.length > 0) {
      await this.prisma.userHardware.createMany({
        data: users.map((u) => ({
          userId: u.id,
          hardwareId: hw.id,
          price: hw.price,
        })),
        skipDuplicates: true,
      });
    }

    return hw;
  }

  async updateHardware(id: string, dto: UpdateHardwareDto) {
    await this.ensureExists('hardware', id);
    return this.prisma.hardware.update({
      where: { id },
      data: dto,
      include: { hardwareType: true },
    });
  }

  async deleteHardware(id: string) {
    await this.ensureExists('hardware', id);
    await this.prisma.hardware.delete({ where: { id } });
    return { message: 'Фурнитура удалена' };
  }

  /* ═══════════ SERVICE TEMPLATE ═══════════ */

  async getServiceTemplate() {
    const template = await this.prisma.serviceTemplate.findFirst();
    if (!template) throw new NotFoundException('Шаблон услуг не найден');
    return template;
  }

  async updateServiceTemplate(dto: UpdateServiceTemplateDto) {
    const template = await this.prisma.serviceTemplate.findFirst();
    if (!template) throw new NotFoundException('Шаблон услуг не найден');
    return this.prisma.serviceTemplate.update({
      where: { id: template.id },
      data: dto,
    });
  }

  /* ═══════════ HELPER ═══════════ */

  private async ensureExists(model: string, id: string) {
    const record = await (this.prisma as any)[model].findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException(`${model} не найден`);
  }
}
