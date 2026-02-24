import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContactType, ProfitType } from '@prisma/client';
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

  async updateUserMaterialPrice(
    userId: string,
    materialId: string,
    dto: { price?: number; enabled?: boolean },
  ) {
    if (dto.price === undefined && dto.enabled === undefined) {
      throw new BadRequestException('Нет данных для обновления');
    }
    const record = await this.prisma.userMaterial.findUnique({
      where: { userId_materialId: { userId, materialId } },
    });
    if (!record) throw new NotFoundException('Материал не найден в настройках');
    return this.prisma.userMaterial.update({
      where: { id: record.id },
      data: {
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
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

  async updateUserHardwarePrice(
    userId: string,
    hardwareId: string,
    dto: { price?: number; enabled?: boolean },
  ) {
    if (dto.price === undefined && dto.enabled === undefined) {
      throw new BadRequestException('Нет данных для обновления');
    }
    const record = await this.prisma.userHardware.findUnique({
      where: { userId_hardwareId: { userId, hardwareId } },
    });
    if (!record)
      throw new NotFoundException('Фурнитура не найдена в настройках');
    return this.prisma.userHardware.update({
      where: { id: record.id },
      data: {
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
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

  /* ═══ COMPANY INFO ═══ */

  async getCompanyInfo(userId: string) {
    return this.prisma.companyInfo.findUnique({ where: { userId } });
  }

  async upsertCompanyInfo(
    userId: string,
    dto: {
      name: string;
      logo?: string;
      description?: string;
      descriptionKz?: string;
    },
  ) {
    return this.prisma.companyInfo.upsert({
      where: { userId },
      update: {
        name: dto.name,
        logo: dto.logo ?? null,
        description: dto.description ?? null,
        descriptionKz: dto.descriptionKz ?? null,
      },
      create: {
        userId,
        name: dto.name,
        logo: dto.logo ?? null,
        description: dto.description ?? null,
        descriptionKz: dto.descriptionKz ?? null,
      },
    });
  }

  /* ═══ PAYMENT STAGES ═══ */

  async getPaymentStages(userId: string) {
    return this.prisma.paymentStage.findMany({
      where: { userId },
      orderBy: { stageNumber: 'asc' },
    });
  }

  async savePaymentStages(
    userId: string,
    stages: { stageNumber: number; percentage: number; note?: string }[],
  ) {
    const total = stages.reduce((s, st) => s + st.percentage, 0);
    if (total !== 100) {
      throw new BadRequestException('Сумма этапов должна быть равна 100%');
    }

    // Check unique stage numbers
    const nums = stages.map((s) => s.stageNumber);
    if (new Set(nums).size !== nums.length) {
      throw new BadRequestException('Номера этапов не должны повторяться');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.paymentStage.deleteMany({ where: { userId } });
      return tx.paymentStage.createMany({
        data: stages.map((s) => ({
          userId,
          stageNumber: s.stageNumber,
          percentage: s.percentage,
          note: s.note?.trim() ? s.note.trim() : null,
        })),
      });
    });
  }

  /* ═══ CONTACTS ═══ */

  async getContacts(userId: string) {
    return this.prisma.userContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createContact(
    userId: string,
    dto: { type: ContactType; value: string },
  ) {
    return this.prisma.userContact.create({
      data: { userId, type: dto.type, value: dto.value },
    });
  }

  async updateContact(
    userId: string,
    contactId: string,
    dto: { type?: ContactType; value?: string },
  ) {
    const contact = await this.prisma.userContact.findUnique({
      where: { id: contactId },
    });
    if (!contact) throw new NotFoundException('Контакт не найден');
    if (contact.userId !== userId) throw new ForbiddenException('Нет доступа');
    return this.prisma.userContact.update({
      where: { id: contactId },
      data: dto,
    });
  }

  async deleteContact(userId: string, contactId: string) {
    const contact = await this.prisma.userContact.findUnique({
      where: { id: contactId },
    });
    if (!contact) throw new NotFoundException('Контакт не найден');
    if (contact.userId !== userId) throw new ForbiddenException('Нет доступа');
    return this.prisma.userContact.delete({ where: { id: contactId } });
  }

  /* ═══ GET ALL PROPOSAL DATA (for KP generation) ═══ */

  async getProposalSettings(userId: string) {
    const [companyInfo, paymentStages, contacts] = await Promise.all([
      this.prisma.companyInfo.findUnique({ where: { userId } }),
      this.prisma.paymentStage.findMany({
        where: { userId },
        orderBy: { stageNumber: 'asc' },
      }),
      this.prisma.userContact.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { companyInfo, paymentStages, contacts };
  }
}
