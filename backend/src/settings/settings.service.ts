import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContactType, ModuleType, ProfitType, TierLevel } from '@prisma/client';
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
    dto: { price?: number; enabled?: boolean; moduleTypes?: ModuleType[] },
  ) {
    if (
      dto.price === undefined &&
      dto.enabled === undefined &&
      dto.moduleTypes === undefined
    ) {
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
        ...(dto.moduleTypes !== undefined
          ? { moduleTypes: dto.moduleTypes }
          : {}),
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
    // Материалы (только каталожные, userId=null)
    const allMaterials = await this.prisma.material.findMany({
      where: { userId: null },
    });
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

    // Фурнитура (только каталожная, userId=null)
    const allHardware = await this.prisma.hardware.findMany({
      where: { userId: null },
    });
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

  /* ═══ USER DEFAULTS (preferred materials / hardware) ═══ */

  /**
   * Pick median-priced item from a sorted array.
   * Returns materialId/hardwareId or null.
   */
  private pickMedian<T extends { id: string; price: number }>(
    items: T[],
  ): string | null {
    if (items.length === 0) return null;
    const sorted = [...items].sort((a, b) => a.price - b.price);
    return sorted[Math.floor(sorted.length / 2)].id;
  }

  /**
   * Returns resolved defaults: stored preference if valid & enabled,
   * otherwise median-priced from matching type.
   */
  async getUserDefaults(userId: string) {
    // Ensure record exists
    const row = await this.prisma.userDefaults.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    // Load enabled user materials with types
    const uMats = await this.prisma.userMaterial.findMany({
      where: { userId, enabled: true },
      include: { material: { include: { materialType: true } } },
    });

    // Load enabled user hardware with types
    const uHws = await this.prisma.userHardware.findMany({
      where: { userId, enabled: true },
      include: { hardware: { include: { hardwareType: true } } },
    });

    // Helpers
    const matsByType = (typeName: string) =>
      uMats
        .filter((um) => um.material?.materialType?.name === typeName)
        .map((um) => ({ id: um.materialId, price: Number(um.price) }));

    const hwsByType = (typeName: string) =>
      uHws
        .filter((uh) => uh.hardware?.hardwareType?.name === typeName)
        .map((uh) => ({ id: uh.hardwareId, price: Number(uh.price) }));

    const enabledMatIds = new Set(uMats.map((um) => um.materialId));
    const enabledHwIds = new Set(uHws.map((uh) => uh.hardwareId));

    const resolveMat = (
      stored: string | null,
      typeName: string,
    ): string | null => {
      if (stored && enabledMatIds.has(stored)) return stored;
      return this.pickMedian(matsByType(typeName));
    };

    const resolveHw = (
      stored: string | null,
      typeName: string,
    ): string | null => {
      if (stored && enabledHwIds.has(stored)) return stored;
      return this.pickMedian(hwsByType(typeName));
    };

    return {
      sectionMaterialId: resolveMat(row.sectionMaterialId, 'ЛДСП'),
      backWallMaterialId: resolveMat(row.backWallMaterialId, 'ХДФ'),
      facadeMaterialId: resolveMat(row.facadeMaterialId, 'МДФ'),
      falseFacadeMaterialId: resolveMat(row.falseFacadeMaterialId, 'МДФ'),
      countertopMaterialId: resolveMat(row.countertopMaterialId, 'Камень'),

      hingeHardwareId: resolveHw(row.hingeHardwareId, 'Петли'),
      handleHardwareId: resolveHw(row.handleHardwareId, 'Ручки'),
      tipOnHardwareId: resolveHw(row.tipOnHardwareId, 'Tip-On'),
      slideHardwareId: resolveHw(row.slideHardwareId, 'Телескоп'),
      tandemHardwareId: resolveHw(row.tandemHardwareId, 'Тандем'),
      holderHardwareId: resolveHw(row.holderHardwareId, 'Полкодержатели'),
      legsHardwareId: resolveHw(row.legsHardwareId, 'Ножки'),
    };
  }

  async updateUserDefaults(
    userId: string,
    dto: Record<string, string | undefined>,
  ) {
    // Validate that referenced IDs belong to the user and are enabled
    const matFields = [
      'sectionMaterialId',
      'backWallMaterialId',
      'facadeMaterialId',
      'falseFacadeMaterialId',
      'countertopMaterialId',
    ];
    const hwFields = [
      'hingeHardwareId',
      'handleHardwareId',
      'tipOnHardwareId',
      'slideHardwareId',
      'tandemHardwareId',
      'holderHardwareId',
      'legsHardwareId',
    ];

    for (const field of matFields) {
      const val = dto[field];
      if (!val) continue;
      const um = await this.prisma.userMaterial.findUnique({
        where: { userId_materialId: { userId, materialId: val } },
      });
      if (!um || !um.enabled) {
        throw new BadRequestException(`Материал ${val} не найден или отключён`);
      }
    }

    for (const field of hwFields) {
      const val = dto[field];
      if (!val) continue;
      const uh = await this.prisma.userHardware.findUnique({
        where: { userId_hardwareId: { userId, hardwareId: val } },
      });
      if (!uh || !uh.enabled) {
        throw new BadRequestException(
          `Фурнитура ${val} не найдена или отключена`,
        );
      }
    }

    // Build update data — only provided fields
    const data: Record<string, string | null> = {};
    for (const field of [...matFields, ...hwFields]) {
      if (dto[field] !== undefined) {
        data[field] = dto[field] || null;
      }
    }

    return this.prisma.userDefaults.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
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

  /* ═══ CUSTOM USER MATERIALS ═══ */

  async createCustomMaterial(
    userId: string,
    dto: {
      materialTypeId: string;
      brand?: string;
      calcType?: 'SHEET' | 'SQM' | 'LM';
      length?: number;
      width?: number;
      price?: number;
      moduleTypes?: ModuleType[];
    },
  ) {
    // Verify materialType exists
    const matType = await this.prisma.materialType.findUnique({
      where: { id: dto.materialTypeId },
    });
    if (!matType) throw new NotFoundException('Тип материала не найден');

    const price = dto.price ?? 0;
    const moduleTypes = dto.moduleTypes ?? [];

    // Create material owned by user + UserMaterial link in a single tx
    return this.prisma.$transaction(async (tx) => {
      const material = await tx.material.create({
        data: {
          materialTypeId: dto.materialTypeId,
          brand: dto.brand,
          calcType: dto.calcType,
          length: dto.length,
          width: dto.width,
          price,
          userId,
          moduleTypes,
        },
        include: { materialType: true },
      });

      const userMaterial = await tx.userMaterial.create({
        data: { userId, materialId: material.id, price, moduleTypes },
        include: { material: { include: { materialType: true } } },
      });

      return userMaterial;
    });
  }

  async deleteCustomMaterial(userId: string, materialId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });
    if (!material) throw new NotFoundException('Материал не найден');
    if (material.userId !== userId) throw new ForbiddenException('Нет доступа');

    await this.prisma.material.delete({ where: { id: materialId } });
    return { message: 'Материал удалён' };
  }

  async updateCustomMaterial(
    userId: string,
    materialId: string,
    dto: {
      brand?: string;
      calcType?: 'SHEET' | 'SQM' | 'LM';
      length?: number;
      width?: number;
      price?: number;
      moduleTypes?: ModuleType[];
    },
  ) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });
    if (!material) throw new NotFoundException('Материал не найден');
    if (material.userId !== userId) throw new ForbiddenException('Нет доступа');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.material.update({
        where: { id: materialId },
        data: {
          ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
          ...(dto.calcType !== undefined ? { calcType: dto.calcType } : {}),
          ...(dto.length !== undefined ? { length: dto.length } : {}),
          ...(dto.width !== undefined ? { width: dto.width } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.moduleTypes !== undefined
            ? { moduleTypes: dto.moduleTypes }
            : {}),
        },
        include: { materialType: true },
      });

      // Sync price and moduleTypes to UserMaterial
      const umUpdate: Record<string, unknown> = {};
      if (dto.price !== undefined) umUpdate.price = dto.price;
      if (dto.moduleTypes !== undefined) umUpdate.moduleTypes = dto.moduleTypes;
      if (Object.keys(umUpdate).length > 0) {
        await tx.userMaterial.updateMany({
          where: { materialId },
          data: umUpdate,
        });
      }

      return tx.userMaterial.findUnique({
        where: { userId_materialId: { userId, materialId } },
        include: { material: { include: { materialType: true } } },
      });
    });
  }

  /* ═══ CUSTOM USER HARDWARE ═══ */

  async createCustomHardware(
    userId: string,
    dto: {
      hardwareTypeId: string;
      brand?: string;
      price?: number;
    },
  ) {
    // Verify hardwareType exists
    const hwType = await this.prisma.hardwareType.findUnique({
      where: { id: dto.hardwareTypeId },
    });
    if (!hwType) throw new NotFoundException('Тип фурнитуры не найден');

    const price = dto.price ?? 0;

    return this.prisma.$transaction(async (tx) => {
      const hardware = await tx.hardware.create({
        data: {
          hardwareTypeId: dto.hardwareTypeId,
          brand: dto.brand,
          price,
          userId,
        },
        include: { hardwareType: true },
      });

      const userHardware = await tx.userHardware.create({
        data: { userId, hardwareId: hardware.id, price },
        include: { hardware: { include: { hardwareType: true } } },
      });

      return userHardware;
    });
  }

  async deleteCustomHardware(userId: string, hardwareId: string) {
    const hardware = await this.prisma.hardware.findUnique({
      where: { id: hardwareId },
    });
    if (!hardware) throw new NotFoundException('Фурнитура не найдена');
    if (hardware.userId !== userId) throw new ForbiddenException('Нет доступа');

    await this.prisma.hardware.delete({ where: { id: hardwareId } });
    return { message: 'Фурнитура удалена' };
  }

  /* ═══ TIER PREFERENCES ═══ */

  async getTierPreferences(userId: string) {
    return this.prisma.tierPreference.findMany({
      where: { userId },
      include: {
        materialType: true,
        material: { include: { materialType: true } },
        hardwareType: true,
        hardware: { include: { hardwareType: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async saveTierPreferences(
    userId: string,
    items: {
      tier: TierLevel;
      materialTypeId?: string;
      materialId?: string;
      hardwareTypeId?: string;
      hardwareId?: string;
    }[],
  ) {
    // Validate each item
    for (const item of items) {
      const hasMat = item.materialTypeId && item.materialId;
      const hasHw = item.hardwareTypeId && item.hardwareId;
      if (!hasMat && !hasHw) {
        throw new BadRequestException('Укажите материал или фурнитуру');
      }

      if (hasMat) {
        const um = await this.prisma.userMaterial.findUnique({
          where: {
            userId_materialId: { userId, materialId: item.materialId! },
          },
        });
        if (!um || !um.enabled) {
          throw new BadRequestException(
            `Материал ${item.materialId} не найден или отключён`,
          );
        }
      }

      if (hasHw) {
        const uh = await this.prisma.userHardware.findUnique({
          where: {
            userId_hardwareId: { userId, hardwareId: item.hardwareId! },
          },
        });
        if (!uh || !uh.enabled) {
          throw new BadRequestException(
            `Фурнитура ${item.hardwareId} не найдена или отключена`,
          );
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.tierPreference.deleteMany({ where: { userId } });
      if (items.length > 0) {
        await tx.tierPreference.createMany({
          data: items.map((item) => ({
            userId,
            tier: item.tier,
            materialTypeId: item.materialTypeId ?? null,
            materialId: item.materialId ?? null,
            hardwareTypeId: item.hardwareTypeId ?? null,
            hardwareId: item.hardwareId ?? null,
          })),
        });
      }
      return tx.tierPreference.findMany({
        where: { userId },
        include: {
          materialType: true,
          material: { include: { materialType: true } },
          hardwareType: true,
          hardware: { include: { hardwareType: true } },
        },
      });
    });
  }
}
