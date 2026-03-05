import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Shared service: copies catalog (materials, hardware, services) to a user.
 * Used on registration and admin user creation.
 */
@Injectable()
export class CatalogCopyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Copies current catalog snapshot to user settings.
   * Uses createMany with skipDuplicates for performance (avoids N+1).
   */
  async copySettingsToUser(userId: string) {
    // Copy all catalog materials (userId=null)
    const materials = await this.prisma.material.findMany({
      where: { userId: null },
    });
    if (materials.length > 0) {
      await this.prisma.userMaterial.createMany({
        data: materials.map((mat) => ({
          userId,
          materialId: mat.id,
          price: mat.price,
        })),
        skipDuplicates: true,
      });
    }

    // Copy all catalog hardware (userId=null)
    const hardware = await this.prisma.hardware.findMany({
      where: { userId: null },
    });
    if (hardware.length > 0) {
      await this.prisma.userHardware.createMany({
        data: hardware.map((hw) => ({
          userId,
          hardwareId: hw.id,
          price: hw.price,
        })),
        skipDuplicates: true,
      });
    }

    // Copy service template
    const template = await this.prisma.serviceTemplate.findFirst();
    if (template) {
      await this.prisma.userService.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          sawingPrice: template.sawingPrice,
          drillingPrice: template.drillingPrice,
          edgeBandingPrice: template.edgeBandingPrice,
          technologistPercent: template.technologistPercent,
          designerPercent: template.designerPercent,
          assemblyPercent: template.assemblyPercent,
          deliveryPrice: template.deliveryPrice,
          profitType: template.profitType,
          profitValue: template.profitValue,
        },
      });
    }

    // Create empty UserDefaults (all null → resolved via median at read time)
    await this.prisma.userDefaults.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }
}
