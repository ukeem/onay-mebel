import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfitType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ═══ USER MATERIALS (с ценами пользователя) ═══ */

  async getUserMaterials(userId: string) {
    return this.prisma.userMaterial.findMany({
      where: { userId },
      include: {
        material: { include: { materialType: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateUserMaterialPrice(userId: string, materialId: string, price: number) {
    const record = await this.prisma.userMaterial.findUnique({
      where: { userId_materialId: { userId, materialId } },
    });
    if (!record) throw new NotFoundException('Материал не найден в настройках');
    return this.prisma.userMaterial.update({
      where: { id: record.id },
      data: { price },
      include: { material: { include: { materialType: true } } },
    });
  }

  /* ═══ USER HARDWARE (с ценами пользователя) ═══ */

  async getUserHardware(userId: string) {
    return this.prisma.userHardware.findMany({
      where: { userId },
      include: {
        hardware: { include: { hardwareType: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateUserHardwarePrice(userId: string, hardwareId: string, price: number) {
    const record = await this.prisma.userHardware.findUnique({
      where: { userId_hardwareId: { userId, hardwareId } },
    });
    if (!record) throw new NotFoundException('Фурнитура не найдена в настройках');
    return this.prisma.userHardware.update({
      where: { id: record.id },
      data: { price },
      include: { hardware: { include: { hardwareType: true } } },
    });
  }

  /* ═══ USER SERVICE (параметры работы) ═══ */

  async getUserService(userId: string) {
    const service = await this.prisma.userService.findUnique({
      where: { userId },
    });
    if (!service) throw new NotFoundException('Настройки услуг не найдены');
    return service;
  }

  async updateUserService(
    userId: string,
    dto: {
      sawingPrice?: number;
      drillingPrice?: number;
      edgeBandingPrice?: number;
      technologistPercent?: number;
      designerPercent?: number;
      assemblyPercent?: number;
      deliveryPrice?: number;
      profitType?: ProfitType;
      profitValue?: number;
    },
  ) {
    const service = await this.prisma.userService.findUnique({
      where: { userId },
    });
    if (!service) throw new NotFoundException('Настройки услуг не найдены');
    return this.prisma.userService.update({
      where: { userId },
      data: dto,
    });
  }

  /* ═══ SYNC: добавить новые материалы/фурнитуру из каталога ═══ */

  async syncCatalog(userId: string) {
    // Материалы
    const allMaterials = await this.prisma.material.findMany();
    const userMaterials = await this.prisma.userMaterial.findMany({
      where: { userId },
      select: { materialId: true },
    });
    const existingMatIds = new Set(userMaterials.map((m) => m.materialId));

    for (const mat of allMaterials) {
      if (!existingMatIds.has(mat.id)) {
        await this.prisma.userMaterial.create({
          data: { userId, materialId: mat.id, price: mat.price },
        });
      }
    }

    // Фурнитура
    const allHardware = await this.prisma.hardware.findMany();
    const userHardware = await this.prisma.userHardware.findMany({
      where: { userId },
      select: { hardwareId: true },
    });
    const existingHwIds = new Set(userHardware.map((h) => h.hardwareId));

    for (const hw of allHardware) {
      if (!existingHwIds.has(hw.id)) {
        await this.prisma.userHardware.create({
          data: { userId, hardwareId: hw.id, price: hw.price },
        });
      }
    }

    return { message: 'Каталог синхронизирован' };
  }
}
