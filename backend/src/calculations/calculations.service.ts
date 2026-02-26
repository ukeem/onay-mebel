import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

/* ================================================================
   CALCULATION ENGINE
   Три уровня цен:
   - Чистая (материалы + услуги, себестоимость)
   - Цеховая (чистая + сборка%)
   - Рыночная (цеховая * коэф ИЛИ цеховая + фикс наценка)
   ================================================================ */

@Injectable()
export class CalculationsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  /* ── calculate project ── */
  async calculate(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rooms: {
          include: {
            roomType: true,
            products: {
              include: {
                productType: true,
                sections: {
                  include: {
                    material: { include: { materialType: true } },
                    backWallMaterial: { include: { materialType: true } },
                    legsHardware: { include: { hardwareType: true } },
                  },
                },
                partitions: {
                  include: { material: { include: { materialType: true } } },
                },
                shelves: {
                  include: {
                    material: { include: { materialType: true } },
                    holderHardware: { include: { hardwareType: true } },
                  },
                },
                facades: {
                  include: {
                    material: { include: { materialType: true } },
                    hingeHardware: { include: { hardwareType: true } },
                    handleHardware: { include: { hardwareType: true } },
                    tipOnHardware: { include: { hardwareType: true } },
                  },
                },
                falseFacades: {
                  include: { material: { include: { materialType: true } } },
                },
                drawers: {
                  include: {
                    material: { include: { materialType: true } },
                    slideHardware: { include: { hardwareType: true } },
                  },
                },
                countertops: {
                  include: {
                    material: { include: { materialType: true } },
                    apronMaterial: { include: { materialType: true } },
                  },
                },
                extras: true,
              },
            },
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId) throw new ForbiddenException('Нет доступа');

    /* Fetch user settings */
    const [userMaterials, userHardware, userService] = await Promise.all([
      this.prisma.userMaterial.findMany({
        where: { userId },
        include: { material: { include: { materialType: true } } },
      }),
      this.prisma.userHardware.findMany({
        where: { userId },
        include: { hardware: { include: { hardwareType: true } } },
      }),
      this.prisma.userService.findFirst({ where: { userId } }),
    ]);

    /* Material price map: materialId -> price */
    const matPriceMap = new Map<string, number>();
    for (const um of userMaterials) {
      matPriceMap.set(um.materialId, toNum(um.price));
    }

    /* Hardware price map: hardwareType.name -> price (fallback) */
    const hwPriceMap = new Map<string, number>();
    for (const uh of userHardware) {
      hwPriceMap.set(uh.hardware.hardwareType.name, toNum(uh.price));
    }

    /* Hardware price map by ID: hardwareId -> { price, brand, typeName } */
    const hwIdMap = new Map<
      string,
      { price: number; brand: string; typeName: string }
    >();
    for (const uh of userHardware) {
      hwIdMap.set(uh.hardwareId, {
        price: toNum(uh.price),
        brand: uh.hardware.brand ?? '',
        typeName: uh.hardware.hardwareType.name,
      });
    }

    const svc = userService ?? defaultService();

    const sawingPrice = toNum(svc.sawingPrice);
    const drillingPrice = toNum(svc.drillingPrice);
    const edgeBandingPrice = toNum(svc.edgeBandingPrice);
    const technologistPercent = toNum(svc.technologistPercent);
    const designerPercent = toNum(svc.designerPercent);
    const assemblyPercent = toNum(svc.assemblyPercent);
    const deliveryPrice = toNum(svc.deliveryPrice);
    const profitType = svc.profitType;
    const profitValue = toNum(svc.profitValue);

    /* ── Calculate each room/product ── */
    const roomResults: any[] = [];
    let productsSum = 0;
    let productsSumNoReserve = 0;
    let totalAllSheets = 0;
    let totalEdgeLm = 0;
    let totalProductCount = 0;

    for (const room of project.rooms) {
      const productResults: any[] = [];

      for (const product of room.products) {
        const pr = this.calcProduct(
          product,
          matPriceMap,
          hwPriceMap,
          userMaterials,
          hwIdMap,
        );
        productResults.push(pr);
        productsSum += pr.cleanPrice;
        productsSumNoReserve += pr.cleanPrice;
        totalAllSheets += pr.totalSheets;
        totalEdgeLm += pr.edgeLm;
        totalProductCount++;
      }

      roomResults.push({
        roomId: room.id,
        roomType: room.roomType.name,
        products: productResults,
        roomClean: productResults.reduce(
          (s, p) => s + (p.cleanPrice as number),
          0,
        ),
      });
    }

    /* ═══ Post-correction: aggregate SHEET materials across all products ═══ */
    {
      // Collect raw areas per materialId across all products in all rooms
      const globalSheetArea = new Map<
        string,
        {
          totalRawMm2: number;
          sheetArea: number;
          unitPrice: number;
          entries: { det: any; pr: any; rawMm2: number }[];
        }
      >();

      for (const room of roomResults) {
        for (const pr of room.products) {
          for (const det of pr.details) {
            if (
              det.type === 'material' &&
              det.rawAreaMm2 != null &&
              det.sheetArea
            ) {
              const key = det.materialId;
              const existing = globalSheetArea.get(key);
              if (existing) {
                existing.totalRawMm2 += det.rawAreaMm2;
                existing.entries.push({ det, pr, rawMm2: det.rawAreaMm2 });
              } else {
                globalSheetArea.set(key, {
                  totalRawMm2: det.rawAreaMm2,
                  sheetArea: det.sheetArea,
                  unitPrice: det.unitPrice,
                  entries: [{ det, pr, rawMm2: det.rawAreaMm2 }],
                });
              }
            }
          }
        }
      }

      // Recalculate sheets from global area and redistribute
      for (const [, info] of globalSheetArea) {
        if (info.entries.length <= 1) continue; // single product — no correction needed

        const globalAreaM2 = info.totalRawMm2 / 1_000_000;
        const globalSheets =
          info.sheetArea > 0 ? Math.ceil(globalAreaM2 / info.sheetArea) : 0;
        const oldSheetsSum = info.entries.reduce(
          (s, e) => s + (e.det.qty as number),
          0,
        );

        if (globalSheets >= oldSheetsSum) continue; // no savings

        const oldTotalCost = oldSheetsSum * info.unitPrice;
        const newTotalCost = globalSheets * info.unitPrice;
        const costDiff = oldTotalCost - newTotalCost;
        const sheetsDiff = oldSheetsSum - globalSheets;

        // Distribute new sheets proportionally by raw area
        let sheetsAssigned = 0;
        for (let i = 0; i < info.entries.length; i++) {
          const e = info.entries[i];
          const isLast = i === info.entries.length - 1;
          const proportion = e.rawMm2 / info.totalRawMm2;
          const newQty = isLast
            ? globalSheets - sheetsAssigned
            : Math.max(0, Math.round(globalSheets * proportion));
          sheetsAssigned += newQty;

          const oldQty = e.det.qty as number;
          const oldCost = e.det.cost as number;
          const newCost = newQty * info.unitPrice;
          const diff = oldCost - newCost;

          e.det.qty = newQty;
          e.det.cost = Math.round(newCost);

          // Update product-level sums
          e.pr.materialCost = Math.round((e.pr.materialCost as number) - diff);
          e.pr.cleanPrice = Math.round((e.pr.cleanPrice as number) - diff);
          e.pr.totalSheets = (e.pr.totalSheets as number) - (oldQty - newQty);
        }

        // Update global totals
        productsSum -= costDiff;
        productsSumNoReserve -= costDiff;
        totalAllSheets -= sheetsDiff;
      }

      // Recalculate room-level cleanPrice
      for (const room of roomResults) {
        room.roomClean = room.products.reduce(
          (s: number, p: any) => s + (p.cleanPrice as number),
          0,
        );
      }
    }

    /* ═══ Workshop (цех) ═══ */
    const sawCost = totalAllSheets * sawingPrice;
    const drillCost = totalAllSheets * drillingPrice;
    const edgeCost = totalEdgeLm * edgeBandingPrice;
    const workshopTotal = sawCost + drillCost + edgeCost;

    /* ═══ Market price (for % calculations, WITHOUT reserve) ═══ */
    const marketPrice = (productsSumNoReserve + workshopTotal) * 2;

    /* ═══ Services (% from market price) ═══ */
    const techCost = (marketPrice * technologistPercent) / 100;
    const designCost = (marketPrice * designerPercent) / 100;
    const assemblyCost = (marketPrice * assemblyPercent) / 100;

    /* ═══ Delivery (1/3 rule) ═══ */
    let deliveryCost = 0;
    if (totalProductCount > 0) {
      deliveryCost =
        deliveryPrice +
        Math.max(0, totalProductCount - 1) * (deliveryPrice / 3);
    }

    /* ═══ Final price per TZ ═══ */
    const discount = 0; // editable on detail page, default 0%
    let totalForClient: number;
    let cleanProfit: number;

    const reserveAmount = productsSum - productsSumNoReserve;

    if (profitType === 'COEF') {
      const base =
        (productsSumNoReserve + workshopTotal) * profitValue + reserveAmount;
      const discountAmount = (base * discount) / 100;
      totalForClient = base - discountAmount + deliveryCost;
      cleanProfit =
        totalForClient -
        productsSum -
        workshopTotal -
        techCost -
        designCost -
        assemblyCost -
        deliveryCost;
    } else {
      const base = productsSum + workshopTotal;
      const allCosts =
        base +
        profitValue +
        techCost +
        designCost +
        assemblyCost +
        deliveryCost;
      const discountAmount = (allCosts * discount) / 100;
      totalForClient = allCosts - discountAmount;
      cleanProfit =
        totalForClient -
        productsSum -
        workshopTotal -
        techCost -
        designCost -
        assemblyCost -
        deliveryCost;
    }

    /* Build material/hardware alternatives for brand selection on detail page */
    const materialOptions: any[] = [];
    for (const um of userMaterials) {
      if (um.enabled === false) continue;
      materialOptions.push({
        materialId: um.materialId,
        materialType: um.material.materialType?.name ?? '',
        brand: um.material.brand ?? '',
        price: toNum(um.price),
        calcType: um.material.calcType,
        length: um.material.length,
        width: um.material.width,
      });
    }
    const hardwareOptions: any[] = [];
    for (const uh of userHardware) {
      if (uh.enabled === false) continue;
      hardwareOptions.push({
        hardwareId: uh.hardwareId,
        hardwareType: uh.hardware.hardwareType?.name ?? '',
        brand: uh.hardware.brand ?? '',
        price: toNum(uh.price),
      });
    }

    /* ═══ Tier prices (Standard / Comfort / Premium) ═══ */
    const tierPrices = computeTierPrices(userMaterials, userHardware);

    /* ═══ Compute per-tier totals ═══ */
    const tierTotals: Record<
      string,
      { totalForClient: number; cleanProfit: number; productsSum: number }
    > = {};

    /* Comfort = already-computed main totals (user-selected materials) */
    tierTotals['comfort'] = {
      totalForClient: Math.round(totalForClient),
      cleanProfit: Math.round(cleanProfit),
      productsSum: Math.round(productsSum),
    };

    for (const tier of ['standard', 'premium']) {
      // Build price maps for this tier from tierPrices
      const tierMatPrice = new Map<string, number>();
      for (const [typeName, items] of Object.entries(tierPrices.materials)) {
        const tierItem = items.find((i: any) => i.tier === tier);
        if (tierItem) tierMatPrice.set(typeName, tierItem.price);
      }
      const tierHwPrice = new Map<string, number>();
      for (const [typeName, items] of Object.entries(tierPrices.hardware)) {
        const tierItem = items.find((i: any) => i.tier === tier);
        if (tierItem) tierHwPrice.set(typeName, tierItem.price);
      }

      // Recalculate productsSum for this tier
      let tierProductsSum = 0;
      let tierProductsSumNoReserve = 0;
      let tierTotalSheets = 0;
      let tierTotalEdgeLm = 0;
      const reservePct = 10; // same reserve as in main calc

      for (const room of roomResults) {
        for (const pr of room.products) {
          let pSum = 0;
          for (const det of pr.details ?? []) {
            if (det.enabled !== false) {
              let price = det.unitPrice;
              // Replace with tier price if available
              if (det.type === 'material' && det.materialType) {
                const tp = tierMatPrice.get(det.materialType);
                if (tp !== undefined) price = tp;
              } else if (det.type === 'hardware' && det.hardwareType) {
                const tp = tierHwPrice.get(det.hardwareType);
                if (tp !== undefined) price = tp;
              }
              pSum += det.qty * price;
            }
          }
          tierProductsSumNoReserve += pSum;
          pSum = Math.round(pSum * (1 + reservePct / 100));
          tierProductsSum += pSum;
          tierTotalSheets += pr.totalSheets ?? 0;
          tierTotalEdgeLm += pr.edgeLm ?? 0;
        }
      }

      const tSawCost = tierTotalSheets * sawingPrice;
      const tDrillCost = tierTotalSheets * drillingPrice;
      const tEdgeCost = tierTotalEdgeLm * edgeBandingPrice;
      const tWorkshopTotal = tSawCost + tDrillCost + tEdgeCost;

      const tMarketPrice = (tierProductsSumNoReserve + tWorkshopTotal) * 2;
      const tTechCost = (tMarketPrice * technologistPercent) / 100;
      const tDesignCost = (tMarketPrice * designerPercent) / 100;
      const tAssemblyCost = (tMarketPrice * assemblyPercent) / 100;

      let tDeliveryCost = 0;
      if (totalProductCount > 0) {
        tDeliveryCost =
          deliveryPrice +
          Math.max(0, totalProductCount - 1) * (deliveryPrice / 3);
      }

      let tTotalForClient: number;
      let tCleanProfit: number;

      const tierReserve = tierProductsSum - tierProductsSumNoReserve;

      if (profitType === 'COEF') {
        const base =
          (tierProductsSumNoReserve + tWorkshopTotal) * profitValue +
          tierReserve;
        const disc = (base * discount) / 100;
        tTotalForClient = Math.round(base - disc + tDeliveryCost);
        tCleanProfit = Math.round(
          tTotalForClient -
            tierProductsSum -
            tWorkshopTotal -
            tTechCost -
            tDesignCost -
            tAssemblyCost -
            tDeliveryCost,
        );
      } else {
        const base = tierProductsSum + tWorkshopTotal;
        const allCosts =
          base +
          profitValue +
          tTechCost +
          tDesignCost +
          tAssemblyCost +
          tDeliveryCost;
        const disc = (allCosts * discount) / 100;
        tTotalForClient = Math.round(allCosts - disc);
        tCleanProfit = Math.round(
          tTotalForClient -
            tierProductsSum -
            tWorkshopTotal -
            tTechCost -
            tDesignCost -
            tAssemblyCost -
            tDeliveryCost,
        );
      }

      tierTotals[tier] = {
        totalForClient: tTotalForClient,
        cleanProfit: tCleanProfit,
        productsSum: Math.round(tierProductsSum),
      };
    }

    const data = {
      projectName: project.name,
      clientData: project.clientData,
      rooms: roomResults,
      materialOptions,
      hardwareOptions,
      tierPrices,
      tierTotals,
      enabledTiers: ['standard', 'comfort', 'premium'],
      totals: {
        productsSum: Math.round(productsSum),
        workshop: {
          saw: Math.round(sawCost),
          drill: Math.round(drillCost),
          edge: Math.round(edgeCost),
          total: Math.round(workshopTotal),
          totalSheets: totalAllSheets,
          totalEdgeLm: Math.round(totalEdgeLm * 100) / 100,
        },
        marketPrice: Math.round(marketPrice),
        technologist: Math.round(techCost),
        designer: Math.round(designCost),
        assembly: Math.round(assemblyCost),
        delivery: Math.round(deliveryCost),
        discount,
        cleanProfit: Math.round(cleanProfit),
        totalForClient: Math.round(totalForClient),
        /* backward compat keys */
        clean: Math.round(productsSum),
        shop: Math.round(productsSum + workshopTotal),
        market: Math.round(totalForClient),
      },
      technologistPercent,
      designerPercent,
      assemblyPercent,
      deliveryPrice,
      sawingPrice,
      drillingPrice,
      edgeBandingPrice,
      profitType,
      profitValue,
      calculatedAt: new Date().toISOString(),
    };

    /* Save snapshot */
    const calc = await this.prisma.calculation.create({
      data: { projectId, data: data as any },
    });

    return { id: calc.id, ...data };
  }

  /* ── list calculations for project ── */
  async findAll(projectId: string, userId: string) {
    await this.ensureProjectOwner(projectId, userId);
    return this.prisma.calculation.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, data: true },
    });
  }

  /* ── single calculation ── */
  async findOne(id: string, userId: string) {
    const calc = await this.prisma.calculation.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!calc) throw new NotFoundException('Расчёт не найден');
    if (calc.project.userId !== userId)
      throw new ForbiddenException('Нет доступа');
    return calc;
  }

  /* ── public access (no ownership check) ── */
  async findOnePublic(id: string) {
    const calc = await this.prisma.calculation.findUnique({
      where: { id },
    });
    if (!calc) throw new NotFoundException('Расчёт не найден');
    return calc;
  }

  /* ── public access with project userId ── */
  async findOnePublicWithProject(id: string) {
    const calc = await this.prisma.calculation.findUnique({
      where: { id },
      include: { project: { select: { userId: true } } },
    });
    if (!calc) throw new NotFoundException('Расчёт не найден');
    return { ...calc, userId: calc.project.userId };
  }

  /* ── delete ── */
  async remove(id: string, userId: string) {
    const calc = await this.findOne(id, userId);
    return this.prisma.calculation.delete({ where: { id: calc.id } });
  }

  /* ── update snapshot data (editable detail page) ── */
  async update(id: string, userId: string, data: any) {
    const calc = await this.findOne(id, userId);
    return this.prisma.calculation.update({
      where: { id: calc.id },
      data: { data: data },
    });
  }

  /* ── delete all for project ── */
  async removeAll(projectId: string, userId: string) {
    await this.ensureProjectOwner(projectId, userId);
    const { count } = await this.prisma.calculation.deleteMany({
      where: { projectId },
    });
    return { deleted: count };
  }

  /* =================================================================
     COMMERCIAL PROPOSAL (HTML) — services distributed into products
     ================================================================= */
  generateProposal(
    data: any,
    proposalSettings?: {
      companyInfo?: any;
      paymentStages?: any[];
      contacts?: any[];
    },
  ): string {
    const d = data;
    const ps = proposalSettings ?? {};
    const fmt = (n: number) =>
      `<span style="white-space:nowrap">${new Intl.NumberFormat('ru-RU').format(Math.round(n))}&nbsp;₸</span>`;

    const tierOrder = ['standard', 'comfort', 'premium'];
    const enabledTiers: string[] = (
      d.enabledTiers ?? ['standard', 'comfort', 'premium']
    ).sort(
      (a: string, b: string) => tierOrder.indexOf(a) - tierOrder.indexOf(b),
    );
    const tierLabels: Record<string, string> = {
      standard: 'Стандарт',
      comfort: 'Комфорт',
      premium: 'Премиум',
    };
    const tierRoomsSnapshot = d.tierRoomsSnapshot ?? {
      standard: d.rooms,
      comfort: d.rooms,
      premium: d.rooms,
    };

    const reservePct = d.totals?.reserve ?? 10;
    const discountPct = d.totals?.discount ?? 0;
    const profitType = d.profitType ?? 'COEF';
    const profitValue = d.profitValue ?? 2;
    const sawingPrice = d.sawingPrice ?? 0;
    const drillingPrice = d.drillingPrice ?? 0;
    const edgeBandingPrice = d.edgeBandingPrice ?? 0;
    const deliveryPrice = d.deliveryPrice ?? 0;
    const technologistPct = d.technologistPercent ?? 0;
    const designerPct = d.designerPercent ?? 0;
    const assemblyPct = d.assemblyPercent ?? 0;

    /* compute totals per tier */
    const tierResults: Record<
      string,
      {
        rooms: any[];
        totalForClient: number;
        totalBeforeDiscount: number;
        /* per-product data for proportional distribution */
        productTotals: Map<
          string,
          {
            cleanCost: number;
            finalPrice: number;
            finalPriceBeforeDiscount: number;
          }
        >;
      }
    > = {};

    for (const tier of enabledTiers) {
      const rooms = tierRoomsSnapshot[tier] ?? d.rooms;
      let productsSum = 0;
      let totalProductCount = 0;
      let totalSheets = 0;
      let totalEdgeLm = 0;

      // First pass — compute product clean costs
      const productCleanCosts = new Map<string, number>();
      let productsSumNoReserve = 0;
      for (const room of rooms) {
        for (const pr of room.products) {
          const key = `${room.roomType}::${pr.productType}::${pr.dimensions}::${totalProductCount}`;
          let pSum = 0;
          for (const det of pr.details ?? []) {
            if (det.enabled !== false) {
              pSum += det.qty * det.unitPrice;
            }
          }
          productsSumNoReserve += pSum;
          pSum = Math.round(pSum * (1 + reservePct / 100));
          productCleanCosts.set(key, pSum);
          productsSum += pSum;
          totalSheets += pr.totalSheets ?? 0;
          totalEdgeLm += pr.edgeLm ?? 0;
          totalProductCount++;
        }
      }

      // Replicate frontend formula for totalForClient per tier
      const sawCost = totalSheets * sawingPrice;
      const drillCost = totalSheets * drillingPrice;
      const edgeCost = totalEdgeLm * edgeBandingPrice;
      const workshopTotal = sawCost + drillCost + edgeCost;
      const proposalReserve = productsSum - productsSumNoReserve;

      // Delivery cost (same formula as frontend)
      let deliveryCost = 0;
      if (totalProductCount > 0) {
        deliveryCost =
          deliveryPrice +
          Math.max(0, totalProductCount - 1) * (deliveryPrice / 3);
      }

      const pMarketPrice = (productsSumNoReserve + workshopTotal) * 2;
      const pTechCost = (pMarketPrice * technologistPct) / 100;
      const pDesignCost = (pMarketPrice * designerPct) / 100;
      const pAssemblyCost = (pMarketPrice * assemblyPct) / 100;

      let totalForClient: number;
      if (profitType === 'COEF') {
        const base =
          (productsSumNoReserve + workshopTotal) * profitValue +
          proposalReserve;
        const disc = (base * discountPct) / 100;
        totalForClient = Math.round(base - disc + deliveryCost);
      } else {
        const base = productsSum + workshopTotal;
        const allCosts =
          base +
          profitValue +
          pTechCost +
          pDesignCost +
          pAssemblyCost +
          deliveryCost;
        const disc = (allCosts * discountPct) / 100;
        totalForClient = Math.round(allCosts - disc);
      }

      const totalBeforeDiscount =
        discountPct > 0
          ? Math.round(totalForClient / (1 - discountPct / 100))
          : totalForClient;

      // Distribute totalBeforeDiscount proportionally across products
      const productTotals = new Map<
        string,
        {
          cleanCost: number;
          finalPrice: number;
          finalPriceBeforeDiscount: number;
        }
      >();

      // Distribute pre-discount amounts
      let distributedBeforeDiscount = 0;
      const keys = Array.from(productCleanCosts.keys());
      const beforeDiscountArr: number[] = [];
      keys.forEach((key, idx) => {
        const cleanCost = productCleanCosts.get(key)!;
        let bd: number;
        if (idx === keys.length - 1) {
          bd = totalBeforeDiscount - distributedBeforeDiscount;
        } else {
          const proportion = productsSum > 0 ? cleanCost / productsSum : 0;
          bd = Math.round(totalBeforeDiscount * proportion);
          distributedBeforeDiscount += bd;
        }
        beforeDiscountArr.push(bd);
      });

      // Distribute after-discount amounts (with remainder correction on last item)
      let distributedAfterDiscount = 0;
      keys.forEach((key, idx) => {
        const cleanCost = productCleanCosts.get(key)!;
        const bd = beforeDiscountArr[idx];
        let ad: number;
        if (idx === keys.length - 1) {
          ad = totalForClient - distributedAfterDiscount;
        } else {
          ad = Math.round(bd * (1 - discountPct / 100));
          distributedAfterDiscount += ad;
        }
        productTotals.set(key, {
          cleanCost,
          finalPrice: ad,
          finalPriceBeforeDiscount: bd,
        });
      });

      tierResults[tier] = {
        rooms,
        totalForClient,
        totalBeforeDiscount,
        productTotals,
      };
    }

    /* Build tabs HTML */
    const tabButtonsHtml = enabledTiers
      .map(
        (tier, i) =>
          `<button onclick="showTab('${tier}')" id="tab-btn-${tier}" class="tab-btn${i === 0 ? ' active' : ''}">${tierLabels[tier]}</button>`,
      )
      .join('');

    const tabParts = enabledTiers
      .map((tier, idx) => {
        const tr = tierResults[tier];
        let productIdx = 0;

        /* Rooms HTML */
        let roomsHtml = '';
        for (const room of tr.rooms) {
          let productsHtml = '';
          let _roomTotalBeforeDiscount = 0;
          let _roomTotal = 0;

          for (const pr of room.products) {
            const key = `${room.roomType}::${pr.productType}::${pr.dimensions}::${productIdx}`;
            const pt = tr.productTotals.get(key);
            const finalPrice = pt?.finalPrice ?? 0;
            const finalPriceBeforeDiscount = pt?.finalPriceBeforeDiscount ?? 0;
            _roomTotalBeforeDiscount += finalPriceBeforeDiscount;
            _roomTotal += finalPrice;
            productIdx++;

            // Detail items — distribute product price proportionally to details
            const details = (pr.details ?? []).filter(
              (det: any) => det.enabled !== false,
            );
            const detCleanTotal = details.reduce(
              (s: number, det: any) => s + (det.cost ?? 0),
              0,
            );

            let detailsHtml = '';
            let detBdDistributed = 0;
            let detAdDistributed = 0;
            // First pass: compute before-discount per detail
            const detBdArr: number[] = [];
            details.forEach((det: any, di: number) => {
              let detBd: number;
              if (di === details.length - 1) {
                detBd = finalPriceBeforeDiscount - detBdDistributed;
              } else {
                const proportion =
                  detCleanTotal > 0 ? (det.cost ?? 0) / detCleanTotal : 0;
                detBd = Math.round(finalPriceBeforeDiscount * proportion);
                detBdDistributed += detBd;
              }
              detBdArr.push(detBd);
            });
            // Second pass: compute after-discount with remainder on last
            details.forEach((det: any, di: number) => {
              const detBd = detBdArr[di];
              let detAd: number;
              if (di === details.length - 1) {
                detAd = finalPrice - detAdDistributed;
              } else {
                detAd = Math.round(detBd * (1 - discountPct / 100));
                detAdDistributed += detAd;
              }

              const _priceHtml =
                discountPct > 0
                  ? `<span class="price-old">${fmt(detBd)}</span> <span class="price-new">${fmt(detAd)}</span>`
                  : `<span class="price-current">${fmt(detAd)}</span>`;

              detailsHtml += `
              <div class="detail-item">
                <span class="detail-dot"></span>
                <span class="detail-name">${stripQtyFromLabel(det.label)}${det.brand ? ' <span class="brand">(' + det.brand + ')</span>' : ''}</span>
              </div>`;
            });

            // Product price display
            const productPriceHtml = `<span class="price-current">${fmt(finalPrice)}</span>`;
            const safeImageUrl =
              typeof pr.image === 'string' &&
              /^\/uploads\/[A-Za-z0-9._-]+$/.test(pr.image)
                ? pr.image
                : '';
            const productImageSrc = safeImageUrl
              ? logoToDataUri(safeImageUrl)
              : '';
            const productImageHtml = productImageSrc
              ? `<div class="product-image-wrap"><img class="product-image" src="${productImageSrc}" alt="Изображение изделия"/></div>`
              : '';
            const productContentClass = productImageHtml
              ? 'product-content with-image'
              : 'product-content';

            productsHtml += `
            <div class="product-block">
              <div class="product-header">
                <span class="product-name">${pr.productType}</span>
                <span class="product-price">${productPriceHtml}</span>
              </div>
              <div class="${productContentClass}">
                ${productImageHtml}
                <div class="details-list">${detailsHtml}</div>
              </div>
            </div>`;
          }

          roomsHtml += `
          <div class="room-block">
            <div class="room-header">
              <svg class="room-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span class="room-name">${room.roomType}</span>
            </div>
            ${productsHtml}
          </div>`;
        }

        // Grand total
        const _discountBadge =
          discountPct > 0
            ? `<span class="discount-badge">-${discountPct}%</span>`
            : '';
        const grandTotalHtml =
          discountPct > 0
            ? `<div class="total-prices">
                 <span class="grand-old">${fmt(tr.totalBeforeDiscount)}</span>
                 <span class="grand-new">${fmt(tr.totalForClient)}</span>
               </div>
               <span class="discount-badge">-${discountPct}%</span>`
            : `<span class="grand-new">${fmt(tr.totalForClient)}</span>`;

        // Payment stages HTML for this tier (rendered outside tab-content)
        let paymentHtml = '';
        if (ps.paymentStages && ps.paymentStages.length > 0) {
          const stagesItems = ps.paymentStages
            .map((st: any) => {
              const amount = Math.round(
                (tr.totalForClient * st.percentage) / 100,
              );
              const note =
                typeof st.note === 'string' && st.note.trim().length > 0
                  ? st.note.trim()
                  : '';
              const safeNote = note ? escapeHtml(note) : '';
              return `<div class="payment-stage">
                <div class="payment-stage-top">
                  <div class="payment-stage-line">
                    <span class="payment-stage-chip" data-i18n-stage="${st.stageNumber}">Этап ${st.stageNumber}</span>
                    <span class="payment-stage-percent">${st.percentage}%</span>
                  </div>
                  <span class="payment-stage-amount">${fmt(amount)}</span>
                </div>
                ${safeNote ? `<div class="payment-stage-note">${safeNote}</div>` : ''}
              </div>`;
            })
            .join('');
          paymentHtml = `<div id="payment-${tier}" class="payment-section" style="display:${idx === 0 ? 'block' : 'none'};">
            <div class="payment-title" data-i18n="paymentTitle">Условия оплаты</div>
            <div class="payment-stages-card">
              ${stagesItems}
            </div>
          </div>`;
        }

        return {
          tabHtml: `
        <div id="tab-${tier}" class="tab-content" style="display:${idx === 0 ? 'block' : 'none'};">
          <div class="tier-title">${tierLabels[tier]}</div>
          ${roomsHtml}
          <div class="tier-total">
            <div class="total-inner-bar">
              <span class="total-label" data-i18n="total">Итого</span>
              ${grandTotalHtml}
            </div>
          </div>
        </div>
        <div id="total-${tier}" class="total-bar" style="display:${idx === 0 ? 'flex' : 'none'};">
          <div class="total-inner-bar">
            <span class="total-label" data-i18n="total">Итого</span>
            ${grandTotalHtml}
          </div>
        </div>`,
          paymentHtml,
        };
      })
      .reduce(
        (acc, item) => {
          acc.tabs += item.tabHtml;
          acc.payments += item.paymentHtml;
          return acc;
        },
        { tabs: '', payments: '' },
      );
    const tabContentsHtml = tabParts.tabs;
    const allPaymentsHtml = tabParts.payments;

    /* Build contacts HTML */
    const contactIcons: Record<string, string> = {
      WHATSAPP:
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
      TELEGRAM:
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
      EMAIL:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>',
      INSTAGRAM:
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>',
      TIKTOK:
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    };
    const contactTypeLabels: Record<string, string> = {
      WHATSAPP: 'WhatsApp',
      TELEGRAM: 'Telegram',
      EMAIL: 'Email',
      INSTAGRAM: 'Instagram',
      TIKTOK: 'TikTok',
    };
    const contactColors: Record<string, string> = {
      WHATSAPP: '#25D366',
      TELEGRAM: '#2AABEE',
      EMAIL: '#64748b',
      INSTAGRAM: '#E4405F',
      TIKTOK: '#000000',
    };
    const contactLinks: Record<string, (v: string) => string> = {
      WHATSAPP: (v) => `https://wa.me/${v.replace(/[^\d+]/g, '')}`,
      TELEGRAM: (v) => `https://t.me/${v.replace('@', '')}`,
      EMAIL: (v) => `mailto:${v}`,
      INSTAGRAM: (v) => `https://instagram.com/${v.replace('@', '')}`,
      TIKTOK: (v) => `https://tiktok.com/@${v.replace('@', '')}`,
    };
    let contactsHtml = '';
    if (ps.contacts && ps.contacts.length > 0) {
      const items = ps.contacts
        .map((c: any) => {
          const color = contactColors[c.type] ?? '#64748b';
          const icon = contactIcons[c.type] ?? '';
          const label = contactTypeLabels[c.type] ?? c.type;
          const linkFn = contactLinks[c.type];
          const href = linkFn ? linkFn(c.value) : '#';
          return `<a class="contact-btn" href="${href}" target="_blank" rel="noopener" style="--contact-color:${color}">
            <span class="contact-btn-icon">${icon}</span>
            <span class="contact-btn-text"><span class="contact-btn-label">${label}</span><span class="contact-btn-value">${c.value}</span></span>
          </a>`;
        })
        .join('');
      contactsHtml = `<div class="contacts-section"><div class="contacts-title" data-i18n="contactsTitle">Контакты</div><div class="contacts-grid">${items}</div></div>`;
    }

    return `<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Коммерческое предложение — ${d.projectName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0f0f11;
      --bg-card: #19191d;
      --bg-elevated: #222228;
      --bg-tabs: #19191d;
      --border: #2a2a30;
      --border-subtle: #222228;
      --text: #f0f0f5;
      --text-secondary: #8b8b9e;
      --text-tertiary: #5e5e72;
      --accent: #818cf8;
      --accent-soft: rgba(129,140,248,0.12);
      --green: #34d399;
      --green-bg: rgba(52,211,153,0.1);
      --green-border: rgba(52,211,153,0.2);
      --total-bg: #19191d;
      --shadow: 0 1px 3px rgba(0,0,0,0.4);
      --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
      --dot: #4a4a5a;
      --contact-bg: #19191d;
      --payment-bg: #19191d;
    }
    [data-theme="light"] {
      --bg: #f8f9fb;
      --bg-card: #ffffff;
      --bg-elevated: #f1f5f9;
      --bg-tabs: #ffffff;
      --border: #e2e8f0;
      --border-subtle: #f1f5f9;
      --text: #0f172a;
      --text-secondary: #64748b;
      --text-tertiary: #94a3b8;
      --accent: #6366f1;
      --accent-soft: rgba(99,102,241,0.08);
      --green: #059669;
      --green-bg: #ecfdf5;
      --green-border: #d1fae5;
      --total-bg: #ffffff;
      --shadow: 0 1px 3px rgba(0,0,0,0.06);
      --shadow-lg: 0 8px 32px rgba(0,0,0,0.08);
      --dot: #cbd5e1;
      --contact-bg: #ffffff;
      --payment-bg: #f8fafc;
    }

    body {
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: var(--text);
      background: var(--bg);
      padding: 0;
      margin: 0;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      transition: background 0.3s, color 0.3s;
    }
    .page-wrapper {
      max-width: 800px;
      margin: 0 auto;
      padding: 16px 16px 80px;
    }

    /* ─── Toolbar (theme + lang) ─── */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      padding: 8px 0;
      margin-bottom: 8px;
    }
    .toolbar-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-secondary);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 14px;
    }
    .toolbar-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-soft);
    }
    .toolbar-btn svg { width: 18px; height: 18px; }
    .lang-btn {
      width: auto;
      padding: 0 12px;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* ─── Company info ─── */
    .company-info {
      text-align: center;
      margin-bottom: 20px;
      padding: 20px 16px;
    }
    .company-logo {
      max-height: 72px;
      max-width: 220px;
      object-fit: contain;
      margin: 0 auto 12px;
      display: block;
    }
    .company-name {
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 6px;
      letter-spacing: -0.01em;
    }
    .company-desc {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 500px;
      margin: 0 auto;
    }

    /* ─── Header ─── */
    .kp-header {
      text-align: center;
      margin-bottom: 20px;
      padding: 24px 16px 20px;
      background: var(--bg-card);
      border-radius: 16px;
      border: 1px solid var(--border);
    }
    .kp-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      background: var(--accent-soft);
      color: var(--accent);
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
    }
    .kp-badge svg { width: 12px; height: 12px; }
    .kp-project {
      font-size: 22px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .kp-meta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .kp-meta-item {
      font-size: 12px;
      color: var(--text-tertiary);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .kp-meta-item svg { width: 13px; height: 13px; }

    /* ─── Tabs ─── */
    .tabs-wrap {
      position: sticky;
      top: 0;
      z-index: 10;
      margin: 0 -16px 16px;
      padding: 6px 16px;
      background: var(--bg);
    }
    .tabs-inner {
      display: flex;
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 4px;
      border-radius: 12px;
    }
    .tab-btn {
      flex: 1;
      padding: 10px 6px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--text-tertiary);
      border-radius: 9px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: var(--text-secondary);
    }
    .tab-btn.active {
      background: var(--accent) !important;
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(99,102,241,0.3);
    }

    /* ─── Room ─── */
    .room-block {
      margin-bottom: 20px;
    }
    .room-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0 8px;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .room-icon {
      width: 18px; height: 18px;
      color: var(--accent);
      flex-shrink: 0;
    }
    .room-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* ─── Product ─── */
    .product-block {
      margin-bottom: 10px;
      background: var(--bg-card);
      border-radius: 14px;
      padding: 16px 18px;
      border: 1px solid var(--border);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .product-block:hover {
      border-color: var(--accent);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
    }
    .product-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .product-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }
    .product-price {
      font-size: 14px;
      font-weight: 700;
      color: var(--accent);
      white-space: nowrap;
    }
    .product-content {
      margin-top: 10px;
    }
    .product-content.with-image {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 12px;
      align-items: start;
    }
    .product-image-wrap {
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: #fff;
      box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
    }
    .product-image {
      display: block;
      width: 100%;
      height: 200px;
      object-fit: cover;
    }

    /* ─── Details list ─── */
    .details-list {
      padding-top: 8px;
      border-top: 1px dashed var(--border);
      columns: 2;
      column-gap: 12px;
    }
    .product-content.with-image .details-list {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
      border-left: 1px dashed var(--border);
      padding-left: 12px;
    }
    .detail-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding: 3px 0;
      break-inside: avoid;
    }
    .detail-dot {
      width: 4px; height: 4px;
      border-radius: 50%;
      background: var(--dot);
      flex-shrink: 0;
      margin-top: 6px;
    }
    .detail-name {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.4;
    }
    .brand { color: var(--text-tertiary); font-size: 11px; }

    /* ─── Prices ─── */
    .price-current {
      font-weight: 700;
      color: var(--text);
    }
    .price-old {
      text-decoration: line-through;
      color: var(--text-tertiary);
      font-size: 13px;
      margin-right: 6px;
    }
    .price-new {
      font-weight: 700;
      color: var(--green);
    }

    /* ─── Total bar ─── */
    .total-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px 20px;
      background: var(--total-bg);
      border-top: 1px solid var(--border);
      backdrop-filter: blur(12px);
    }
    .total-inner-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      max-width: 800px;
      width: 100%;
      justify-content: center;
    }
    .total-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .total-prices {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .grand-old {
      font-size: 13px;
      text-decoration: line-through;
      color: var(--text-tertiary);
      white-space: nowrap;
    }
    .grand-new {
      font-size: 22px;
      font-weight: 800;
      color: var(--text);
      white-space: nowrap;
      letter-spacing: -0.02em;
    }
    .discount-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      background: var(--green-bg);
      color: var(--green);
      font-size: 11px;
      font-weight: 700;
      border-radius: 8px;
      border: 1px solid var(--green-border);
    }

    /* ─── Tier title/total (print only) ─── */
    .tier-title { display: none; }
    .tier-total { display: none; }

    /* ─── Print btn ─── */
    .print-btn {
      display: none; /* temporarily hidden */
      width: 100%;
      margin-top: 24px;
      padding: 14px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
    }
    .print-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    /* ─── Payment stages ─── */
    .payment-section {
      margin-top: 24px;
    }
    .payment-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 12px;
    }
    .payment-stages-card {
      padding: 18px;
      background: var(--payment-bg);
      border-radius: 14px;
      border: 1px solid var(--border);
    }
    .payment-stage {
      display: block;
      padding: 10px 0;
      border-bottom: 1px dashed var(--border);
    }
    .payment-stage:last-child { border-bottom: none; }
    .payment-stage-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-width: 0;
    }
    .payment-stage-line {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .payment-stage-chip {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-elevated);
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      white-space: nowrap;
    }
    .payment-stage-percent {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
    }
    .payment-stage-note {
      margin-top: 10px;
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.35;
      width: 100%;
    }
    .payment-stage-amount {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      white-space: nowrap;
      padding-top: 2px;
    }

    /* ─── Contacts ─── */
    .contacts-section {
      margin-top: 24px;
    }
    .contacts-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 12px;
    }
    .contacts-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    @media (min-width: 600px) {
      .contacts-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .contacts-grid .contact-btn:last-child:nth-child(odd) {
        grid-column: 1 / -1;
      }
    }
    .contact-btn {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 14px 18px;
      background: var(--contact-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      text-decoration: none;
      color: var(--text);
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .contact-btn:hover {
      border-color: var(--contact-color, var(--accent));
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    }
    .contact-btn-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--contact-color, var(--text-tertiary));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .contact-btn-icon svg {
      width: 20px;
      height: 20px;
    }
    .contact-btn-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }
    .contact-btn-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-tertiary);
    }
    .contact-btn-value {
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
    }

    @media print {
      body { background: #fff !important; color: #0f172a !important; }
      :root {
        --bg: #fff; --bg-card: #fff; --bg-elevated: #f1f5f9; --border: #e2e8f0;
        --text: #0f172a; --text-secondary: #64748b; --text-tertiary: #94a3b8;
        --accent: #6366f1; --dot: #cbd5e1;
      }
      .page-wrapper { padding: 16px; }
      .no-print { display: none !important; }
      .tab-content { display: block !important; page-break-before: auto; }
      .tab-content + .total-bar + .tab-content { page-break-before: always; }
      .total-bar { display: none !important; }
      .tier-title {
        display: block;
        font-size: 18px;
        font-weight: 700;
        color: #0f172a;
        text-align: center;
        padding: 16px 0 12px;
        margin-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
      }
      .tier-total {
        display: flex;
        justify-content: center;
        padding: 16px 0;
        margin-top: 12px;
        border-top: 2px solid #e2e8f0;
      }
      .tier-total .total-inner-bar { gap: 12px; }
      .tier-total .total-label { font-size: 16px; font-weight: 700; }
      .tier-total .grand-new { font-size: 20px; }
      .product-block { break-inside: avoid; box-shadow: none; border: 1px solid #e2e8f0; }
      .product-content.with-image { grid-template-columns: 250px 1fr; }
      .kp-header { box-shadow: none; }
      .print-btn { display: none !important; }
    }
    @media (max-width: 900px) {
      .product-content.with-image {
        grid-template-columns: 1fr;
      }
      .product-content.with-image .details-list {
        border-left: none;
        border-top: 1px dashed var(--border);
        padding-left: 0;
        padding-top: 10px;
      }
      .product-image {
        height: 220px;
      }
    }
    @media (max-width: 640px) {
      .page-wrapper { padding: 12px 12px 76px; }
      .kp-header { padding: 18px 14px 14px; }
      .kp-project { font-size: 18px; }
      .tabs-wrap { margin: 0 -12px 12px; padding: 4px 12px; }
      .product-block { padding: 14px 16px; }
      .product-image { width: 100%; height: auto; }
      .total-bar { padding: 12px 16px; }
      .grand-new { font-size: 18px; }
      .details-list { columns: 1; }
      .payment-stage-amount {
        padding-top: 0;
      }
    }
  </style>
</head>
<body>
<div class="page-wrapper">
  <div class="toolbar no-print">
    <button class="toolbar-btn" id="theme-toggle" onclick="toggleTheme()" title="Тема">
      <svg id="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      <svg id="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    </button>
    <button class="toolbar-btn lang-btn" id="lang-toggle" onclick="toggleLang()">KZ</button>
  </div>

  ${
    ps.companyInfo
      ? `<div class="company-info">
    ${ps.companyInfo.logo ? `<img class="company-logo" src="${logoToDataUri(ps.companyInfo.logo)}" alt="${ps.companyInfo.name}" />` : ''}
    <div class="company-name">${ps.companyInfo.name}</div>
    ${ps.companyInfo.description ? `<div class="company-desc" data-i18n="companyDesc">${ps.companyInfo.description}</div>` : ''}
  </div>`
      : ''
  }
  <div class="kp-header">
    <div class="kp-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span data-i18n="badge">Коммерческое предложение</span></div>
    <div class="kp-project">${d.projectName}</div>
    <div class="kp-meta">
      ${d.clientData ? `<span class="kp-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${d.clientData}</span>` : ''}
      <span class="kp-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${new Date(d.calculatedAt).toLocaleDateString('ru-RU')}</span>
    </div>
  </div>

  ${enabledTiers.length >= 1 ? `<div class="tabs-wrap no-print"><div class="tabs-inner">${tabButtonsHtml}</div></div>` : ''}

  ${tabContentsHtml}

  ${allPaymentsHtml}
  ${contactsHtml}

  <button onclick="window.print()" class="print-btn no-print" data-i18n="print">Печать / PDF</button>
</div>

  <script>
    /* ── Tab switching ── */
    function showTab(tier) {
      document.querySelectorAll('.tab-content').forEach(function(el) { el.style.display = 'none'; });
      document.querySelectorAll('.tab-btn').forEach(function(el) { el.classList.remove('active'); });
      document.querySelectorAll('.total-bar').forEach(function(el) { el.style.display = 'none'; });
      document.querySelectorAll('.payment-section').forEach(function(el) { el.style.display = 'none'; });
      var tab = document.getElementById('tab-' + tier);
      var btn = document.getElementById('tab-btn-' + tier);
      var total = document.getElementById('total-' + tier);
      var payment = document.getElementById('payment-' + tier);
      if (tab) tab.style.display = 'block';
      if (btn) btn.classList.add('active');
      if (total) total.style.display = 'flex';
      if (payment) payment.style.display = 'block';
    }

    /* ── Theme toggle ── */
    function toggleTheme() {
      var html = document.documentElement;
      var isDark = html.getAttribute('data-theme') === 'dark';
      html.setAttribute('data-theme', isDark ? 'light' : 'dark');
      document.getElementById('icon-moon').style.display = isDark ? 'none' : 'block';
      document.getElementById('icon-sun').style.display = isDark ? 'block' : 'none';
      try { localStorage.setItem('kp-theme', isDark ? 'light' : 'dark'); } catch(e) {}
    }
    (function() {
      try {
        var saved = localStorage.getItem('kp-theme');
        if (saved) {
          document.documentElement.setAttribute('data-theme', saved);
          document.getElementById('icon-moon').style.display = saved === 'dark' ? 'block' : 'none';
          document.getElementById('icon-sun').style.display = saved === 'dark' ? 'none' : 'block';
        }
      } catch(e) {}
    })();

    /* ── Language toggle ── */
    var KP_LANG = 'ru';
    var I18N = {
      ru: {
        badge: 'Коммерческое предложение',
        total: 'Итого',
        paymentTitle: 'Условия оплаты',
        stage: 'Этап',
        contactsTitle: 'Контакты',
        print: 'Печать / PDF'${
          ps.companyInfo?.description
            ? `,
        companyDesc: ${JSON.stringify(ps.companyInfo.description)}`
            : ''
        }
      },
      kz: {
        badge: 'Коммерциялық ұсыныс',
        total: 'Барлығы',
        paymentTitle: 'Төлем шарттары',
        stage: 'Кезең',
        contactsTitle: 'Байланыс',
        print: 'Басып шығару / PDF'${
          ps.companyInfo?.descriptionKz
            ? `,
        companyDesc: ${JSON.stringify(ps.companyInfo.descriptionKz)}`
            : ps.companyInfo?.description
              ? `,
        companyDesc: ${JSON.stringify(ps.companyInfo.description)}`
              : ''
        }
      }
    };
    function toggleLang() {
      KP_LANG = KP_LANG === 'ru' ? 'kz' : 'ru';
      document.getElementById('lang-toggle').textContent = KP_LANG === 'ru' ? 'KZ' : 'RU';
      var strings = I18N[KP_LANG];
      document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (strings[key]) el.textContent = strings[key];
      });
      document.querySelectorAll('[data-i18n-stage]').forEach(function(el) {
        var num = el.getAttribute('data-i18n-stage');
        el.textContent = strings.stage + ' ' + num;
      });
      try { localStorage.setItem('kp-lang', KP_LANG); } catch(e) {}
    }
    (function() {
      try {
        var saved = localStorage.getItem('kp-lang');
        if (saved && saved !== KP_LANG) { toggleLang(); }
      } catch(e) {}
    })();
  </script>
</body>
</html>`;
  }

  /* =================================================================
     CORE PRODUCT CALCULATION
     ================================================================= */
  private calcProduct(
    product: any,
    matPrice: Map<string, number>,
    hwPrice: Map<string, number>,
    userMaterials?: any[],
    hwIdMap?: Map<string, { price: number; brand: string; typeName: string }>,
  ) {
    let materialCost = 0;
    let hardwareCost = 0;
    const details: any[] = [];

    /* ═══ Material grouping: materialId → accumulated area ═══ */
    const matGroups = new Map<
      string,
      {
        areaMm2: number;
        lengthMm: number;
        material: any;
        labels: string[];
        components: Set<string>;
      }
    >();

    const addArea = (
      materialId: string | null | undefined,
      material: any,
      areaMm2: number,
      label: string,
      lengthMm = 0,
      component = '',
    ) => {
      if (!materialId) return;
      const existing = matGroups.get(materialId);
      if (existing) {
        existing.areaMm2 += areaMm2;
        existing.lengthMm += lengthMm;
        existing.labels.push(label);
        if (component) existing.components.add(component);
      } else {
        const components = new Set<string>();
        if (component) components.add(component);
        matGroups.set(materialId, {
          areaMm2,
          lengthMm,
          material,
          labels: [label],
          components,
        });
      }
    };

    let _totalSectionQty = 0;
    let _totalShelfQty = 0;
    let dimW = 0;
    let dimH = 0;
    let dimD = 0;

    /* ═══ SECTIONS ═══ */
    if (product.sectionsEnabled && product.sections?.length > 0) {
      for (const sec of product.sections) {
        const W = sec.width;
        const H = sec.height;
        const D = sec.depth;
        const qty = sec.qty;
        _totalSectionQty += qty;

        dimW += W * qty;
        dimH = Math.max(dimH, H);
        dimD = Math.max(dimD, D);

        // Body: top+bottom (W×D×2) + sides (H×D×2)
        let sectionArea = (W * D * 2 + H * D * 2) * qty;

        // Back wall: W × H
        if (sec.backWallEnabled) {
          const bwArea = W * H * qty;
          if (
            sec.backWallMaterialId &&
            sec.backWallMaterialId !== sec.materialId
          ) {
            addArea(
              sec.backWallMaterialId,
              sec.backWallMaterial,
              bwArea,
              `Зад.стенка ${W}×${H}, ${qty} шт`,
              0,
              'Зад.стенка',
            );
          } else {
            sectionArea += bwArea;
            // Mark that back wall uses the same material as section
            // so it appears in the component list (e.g. "ЛДСП (Секции, Зад.стенка)")
            addArea(sec.materialId, sec.material, 0, '', 0, 'Зад.стенка');
          }
        }

        addArea(
          sec.materialId,
          sec.material,
          sectionArea,
          `Секция ${W}×${H}×${D}, ${qty} шт`,
          0,
          'Секции',
        );
      }
    }

    /* ═══ PARTITIONS ═══ */
    if (product.partitionsEnabled && product.partitions?.length > 0) {
      for (const part of product.partitions) {
        const area = part.height * part.depth * part.qty;
        addArea(
          part.materialId,
          part.material,
          area,
          `Перегородка ${part.height}×${part.depth}, ${part.qty} шт`,
          0,
          'Перегородки',
        );
      }
    }

    /* ═══ SHELVES ═══ */
    if (product.shelvesEnabled && product.shelves?.length > 0) {
      for (const sh of product.shelves) {
        const area = sh.width * sh.depth * sh.qty;
        addArea(
          sh.materialId,
          sh.material,
          area,
          `Полка ${sh.width}×${sh.depth}, ${sh.qty} шт`,
          0,
          'Полки',
        );
        _totalShelfQty += sh.qty;
      }
    }

    /* ═══ DRAWERS ═══ */
    if (product.drawersEnabled && product.drawers?.length > 0) {
      for (const dr of product.drawers) {
        const area =
          (dr.width * dr.height * 2 +
            dr.width * dr.depth +
            dr.height * dr.depth * 2) *
          dr.qty;
        addArea(
          dr.materialId,
          dr.material,
          area,
          `Ящик ${dr.width}×${dr.height}×${dr.depth}, ${dr.qty} шт`,
          0,
          'Ящики',
        );
      }
    }

    /* ═══ FACADES ═══ */
    let nonSheetPerimLm = 0;
    if (product.facadesEnabled && product.facades?.length > 0) {
      for (const f of product.facades) {
        const area = f.width * f.height * f.qty;
        addArea(
          f.materialId,
          f.material,
          area,
          `Фасад ${f.width}×${f.height}, ${f.qty} шт`,
          0,
          'Фасады',
        );
        if ((f.material?.calcType ?? 'SHEET') !== 'SHEET') {
          nonSheetPerimLm += ((2 * (f.width + f.height)) / 1000) * f.qty;
        }
      }
    }

    /* ═══ FALSE FACADES ═══ */
    if (product.falseFacadesEnabled && product.falseFacades?.length > 0) {
      for (const ff of product.falseFacades) {
        const area = ff.height * ff.depth * ff.qty;
        addArea(
          ff.materialId,
          ff.material,
          area,
          `Фальш ${ff.height}×${ff.depth}, ${ff.qty} шт`,
          0,
          'Фальш-фасады',
        );
        if ((ff.material?.calcType ?? 'SHEET') !== 'SHEET') {
          nonSheetPerimLm += ((2 * (ff.height + ff.depth)) / 1000) * ff.qty;
        }
      }
    }

    /* ═══ COUNTERTOPS ═══ */
    if (product.countertopEnabled && product.countertops?.length > 0) {
      for (const ct of product.countertops) {
        if (ct.materialId) {
          const area = ct.width * ct.depth;
          addArea(
            ct.materialId,
            ct.material,
            area,
            `Столешница ${ct.width}×${ct.depth}`,
            ct.width,
            'Столешница',
          );
        }
        if (ct.apronEnabled && ct.apronMaterialId) {
          const apW = ct.apronWidth ?? ct.width;
          const apH = ct.apronHeight ?? 600;
          const area = apW * apH;
          addArea(
            ct.apronMaterialId,
            ct.apronMaterial,
            area,
            `Фартук ${apW}×${apH}`,
            apW,
            'Фартук',
          );
        }
      }
    }

    /* ═══ COMPUTE MATERIAL COSTS BY GROUP ═══ */
    let totalSheets = 0;

    for (const [matId, group] of matGroups) {
      const price = matPrice.get(matId) ?? 0;
      const mat = group.material;
      const calcType = mat?.calcType ?? 'SHEET';
      const areaM2 = group.areaMm2 / 1_000_000;

      let cost = 0;
      let qty = 0;
      let unit = '';

      if (calcType === 'SHEET') {
        const sheetL = mat?.length ?? 2800;
        const sheetW = mat?.width ?? 2070;
        const sheetAreaVal = (sheetL / 1000) * (sheetW / 1000);
        const sheets = sheetAreaVal > 0 ? Math.ceil(areaM2 / sheetAreaVal) : 0;
        cost = sheets * price;
        qty = sheets;
        unit = 'л.';
        totalSheets += sheets;
        /* store raw area for cross-product post-correction */
        (group as any)._sheetAreaVal = sheetAreaVal;
      } else if (calcType === 'SQM') {
        qty = Math.round(areaM2 * 100) / 100;
        cost = areaM2 * price;
        unit = 'м²';
      } else {
        /* LM: use accumulated length if available, otherwise derive from area */
        const lengthM =
          group.lengthMm > 0
            ? group.lengthMm / 1000
            : mat?.width
              ? group.areaMm2 / mat.width / 1000
              : areaM2;
        qty = Math.round(lengthM * 100) / 100;
        cost = lengthM * price;
        unit = 'м.п.';
      }

      materialCost += cost;

      const typeName = mat?.materialType?.name ?? '';
      const brand = mat?.brand ?? '';

      const componentsSuffix =
        group.components.size > 0
          ? ` (${[...group.components].join(', ')})`
          : '';

      details.push({
        id: `mat-${matId}`,
        type: 'material',
        label: (typeName || 'Материал') + componentsSuffix,
        materialId: matId,
        materialType: typeName,
        brand,
        qty,
        unit,
        unitPrice: price,
        cost: Math.round(cost),
        enabled: true,
        ...(calcType === 'SHEET'
          ? {
              rawAreaMm2: group.areaMm2,
              sheetArea: (group as any)._sheetAreaVal,
            }
          : {}),
      });
    }

    /* ═══ EDGE BANDING ═══ */
    const edgeLm = totalSheets * 25 + nonSheetPerimLm;

    const edgeMat = userMaterials?.find(
      (um: any) =>
        um.material?.materialType?.name === 'Кромка' ||
        um.material?.materialType?.name === 'кромка',
    );
    const edgeMatPrice = edgeMat ? toNum(edgeMat.price) : 0;
    const edgeMaterialCost = edgeLm * edgeMatPrice;
    if (edgeMaterialCost > 0) {
      materialCost += edgeMaterialCost;
      details.push({
        id: 'edge-material',
        type: 'material',
        label: 'Кромка',
        materialId: edgeMat?.materialId ?? '',
        materialType: 'Кромка',
        brand: edgeMat?.material?.brand ?? '',
        qty: Math.round(edgeLm * 100) / 100,
        unit: 'м.п.',
        unitPrice: edgeMatPrice,
        cost: Math.round(edgeMaterialCost),
        enabled: true,
      });
    }

    /* ═══════════ HARDWARE ═══════════ */

    /* ── helper: resolve hardware price & brand by ID, fallback to type name ── */
    const resolveHw = (
      hwId: string | null | undefined,
      typeName: string,
    ): { price: number; brand: string } => {
      if (hwId && hwIdMap) {
        const entry = hwIdMap.get(hwId);
        if (entry) return { price: entry.price, brand: entry.brand };
      }
      return { price: hwPrice.get(typeName) ?? 0, brand: '' };
    };

    /* Hinges: ≤699→2, 700-1199→3, ... — per facade, using facade’s hingeHardwareId */
    {
      let totalHinges = 0;
      let hingeCost = 0;
      let hingeBrand = '';
      let hingeUnitPrice = 0;
      if (product.facadesEnabled && product.facades) {
        for (const f of product.facades) {
          const perFacade = 2 + Math.max(0, Math.floor((f.height - 200) / 500));
          const qty = perFacade * f.qty;
          const hw = resolveHw(f.hingeHardwareId, 'Петли');
          totalHinges += qty;
          hingeCost += qty * hw.price;
          if (hw.brand) hingeBrand = hw.brand;
          hingeUnitPrice = hw.price;
        }
      }
      if (totalHinges > 0) {
        hardwareCost += hingeCost;
        details.push({
          id: 'hinges',
          type: 'hardware',
          label: `Петли (${totalHinges} шт.)`,
          hardwareType: 'Петли',
          brand: hingeBrand,
          qty: totalHinges,
          unit: 'шт.',
          unitPrice: hingeUnitPrice,
          cost: Math.round(hingeCost),
          enabled: true,
        });
      }
    }

    /* Handles — from facades (handleHardwareId) */
    {
      let totalHandles = 0;
      let handleCost = 0;
      let handleBrand = '';
      let handleUnitPrice = 0;
      if (product.facadesEnabled) {
        for (const f of product.facades ?? []) {
          if (f.openType !== 'TIP_ON' && f.handleQty > 0) {
            const qty = f.handleQty * f.qty;
            const hw = resolveHw(f.handleHardwareId, 'Ручки');
            totalHandles += qty;
            handleCost += qty * hw.price;
            if (hw.brand) handleBrand = hw.brand;
            handleUnitPrice = hw.price;
          }
        }
      }
      if (product.drawersEnabled) {
        for (const dr of product.drawers ?? []) {
          if (dr.handleQty > 0) {
            const qty = dr.handleQty * dr.qty;
            const hw = resolveHw(null, 'Ручки');
            totalHandles += qty;
            handleCost += qty * hw.price;
            if (!handleBrand && hw.brand) handleBrand = hw.brand;
            if (!handleUnitPrice) handleUnitPrice = hw.price;
          }
        }
      }
      if (totalHandles > 0) {
        hardwareCost += handleCost;
        details.push({
          id: 'handles',
          type: 'hardware',
          label: `Ручки (${totalHandles} шт.)`,
          hardwareType: 'Ручки',
          brand: handleBrand,
          qty: totalHandles,
          unit: 'шт.',
          unitPrice: handleUnitPrice,
          cost: Math.round(handleCost),
          enabled: true,
        });
      }
    }

    /* Tip-On — from facades with openType=TIP_ON (tipOnHardwareId) */
    {
      let totalTipOn = 0;
      let tipOnCost = 0;
      let tipOnBrand = '';
      let tipOnUnitPrice = 0;
      if (product.facadesEnabled) {
        for (const f of product.facades ?? []) {
          if (f.openType === 'TIP_ON') {
            const qty = f.qty;
            const hw = resolveHw(f.tipOnHardwareId, 'Tip-On');
            totalTipOn += qty;
            tipOnCost += qty * hw.price;
            if (hw.brand) tipOnBrand = hw.brand;
            tipOnUnitPrice = hw.price;
          }
        }
      }
      if (totalTipOn > 0) {
        hardwareCost += tipOnCost;
        details.push({
          id: 'tip-on',
          type: 'hardware',
          label: `Tip-On (${totalTipOn} шт.)`,
          hardwareType: 'Tip-On',
          brand: tipOnBrand,
          qty: totalTipOn,
          unit: 'шт.',
          unitPrice: tipOnUnitPrice,
          cost: Math.round(tipOnCost),
          enabled: true,
        });
      }
    }

    /* Legs: per section (legsHardwareId) */
    if (product.sectionsEnabled && product.sections?.length > 0) {
      let totalLegs = 0;
      let legCost = 0;
      let legBrand = '';
      let legUnitPrice = 0;
      for (const sec of product.sections) {
        if (!sec.legsEnabled) continue;
        const legsPerSection =
          4 + 2 * Math.max(0, Math.floor((sec.width - 200) / 500));
        const qty = legsPerSection * sec.qty;
        const hw = resolveHw(sec.legsHardwareId, 'Ножки');
        totalLegs += qty;
        legCost += qty * hw.price;
        if (hw.brand) legBrand = hw.brand;
        legUnitPrice = hw.price;
      }
      if (totalLegs > 0) {
        hardwareCost += legCost;
        details.push({
          id: 'legs',
          type: 'hardware',
          label: `Ножки (${totalLegs} шт.)`,
          hardwareType: 'Ножки',
          brand: legBrand,
          qty: totalLegs,
          unit: 'шт.',
          unitPrice: legUnitPrice,
          cost: Math.round(legCost),
          enabled: true,
        });
      }
    }

    /* Shelf holders: 4 × qty per shelf (holderHardwareId) */
    {
      let totalShelfHolders = 0;
      let shCost = 0;
      let shBrand = '';
      let shUnitPrice = 0;
      if (product.shelvesEnabled && product.shelves) {
        for (const sh of product.shelves) {
          const qty = 4 * sh.qty;
          const hw = resolveHw(sh.holderHardwareId, 'Полкодержатели');
          totalShelfHolders += qty;
          shCost += qty * hw.price;
          if (hw.brand) shBrand = hw.brand;
          shUnitPrice = hw.price;
        }
      }
      if (totalShelfHolders > 0) {
        hardwareCost += shCost;
        details.push({
          id: 'shelf-holders',
          type: 'hardware',
          label: `Полкодержатели (${totalShelfHolders} шт.)`,
          hardwareType: 'Полкодержатели',
          brand: shBrand,
          qty: totalShelfHolders,
          unit: 'шт.',
          unitPrice: shUnitPrice,
          cost: Math.round(shCost),
          enabled: true,
        });
      }
    }

    /* Drawer slides: split by slideType, using slideHardwareId */
    {
      let totalGuides = 0;
      let guideCost = 0;
      let guideBrand = '';
      let guideUnitPrice = 0;
      let totalTandems = 0;
      let tandemCost = 0;
      let tandemBrand = '';
      let tandemUnitPrice = 0;
      if (product.drawersEnabled && product.drawers) {
        for (const dr of product.drawers) {
          const qty = dr.qty;
          if (dr.slideType === 'TANDEM') {
            const hw = resolveHw(dr.slideHardwareId, 'Тандем');
            totalTandems += qty;
            tandemCost += qty * hw.price;
            if (hw.brand) tandemBrand = hw.brand;
            tandemUnitPrice = hw.price;
          } else {
            const hw = resolveHw(dr.slideHardwareId, 'Направляющие');
            totalGuides += qty;
            guideCost += qty * hw.price;
            if (hw.brand) guideBrand = hw.brand;
            guideUnitPrice = hw.price;
          }
        }
      }
      if (totalGuides > 0) {
        hardwareCost += guideCost;
        details.push({
          id: 'slides',
          type: 'hardware',
          label: `Направляющие (${totalGuides} шт.)`,
          hardwareType: 'Направляющие',
          brand: guideBrand,
          qty: totalGuides,
          unit: 'шт.',
          unitPrice: guideUnitPrice,
          cost: Math.round(guideCost),
          enabled: true,
        });
      }
      if (totalTandems > 0) {
        hardwareCost += tandemCost;
        details.push({
          id: 'tandems',
          type: 'hardware',
          label: `Тандем (${totalTandems} шт.)`,
          hardwareType: 'Тандем',
          brand: tandemBrand,
          qty: totalTandems,
          unit: 'шт.',
          unitPrice: tandemUnitPrice,
          cost: Math.round(tandemCost),
          enabled: true,
        });
      }
    }

    /* Konfirmats (approximate) */
    let konfPrice = hwPrice.get('Конфирмат') ?? 0;
    let konfBrand = '';
    if (hwIdMap) {
      for (const [, entry] of hwIdMap) {
        if (entry.typeName === 'Конфирмат') {
          konfPrice = entry.price;
          konfBrand = entry.brand;
          break;
        }
      }
    }
    const konfQty = 20;
    const konfCost = konfQty * konfPrice;
    hardwareCost += konfCost;
    if (konfCost > 0) {
      details.push({
        id: 'konfirmats',
        type: 'hardware',
        label: `Конфирмат (${konfQty} шт.)`,
        hardwareType: 'Конфирмат',
        brand: konfBrand,
        qty: konfQty,
        unit: 'шт.',
        unitPrice: konfPrice,
        cost: Math.round(konfCost),
        enabled: true,
      });
    }

    /* ═══ Extras ═══ */
    let extrasCost = 0;
    if (product.extrasEnabled && product.extras) {
      for (const ex of product.extras) {
        const c = toNum(ex.price);
        extrasCost += c;
        details.push({
          id: `extra-${ex.id}`,
          type: 'extra',
          label: 'Дополнительно',
          brand: ex.name,
          qty: 1,
          unit: 'шт.',
          unitPrice: Math.round(c),
          cost: Math.round(c),
          enabled: true,
        });
      }
    }

    const cleanPrice = materialCost + hardwareCost + extrasCost;

    const dimensions =
      dimW > 0 || dimH > 0 || dimD > 0 ? `${dimW}×${dimH}×${dimD}` : '-';

    return {
      productId: product.id,
      productType: product.productType.name,
      dimensions,
      materialCost: Math.round(materialCost),
      hardwareCost: Math.round(hardwareCost),
      extrasCost: Math.round(extrasCost),
      cleanPrice: Math.round(cleanPrice),
      totalSheets,
      edgeLm,
      details,
    };
  }

  /* ── helpers ── */
  private async ensureProjectOwner(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId) throw new ForbiddenException('Нет доступа');
    return project;
  }
}

/* ── utils ── */
function toNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (val instanceof Decimal) return val.toNumber();
  return Number(val) || 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Convert /uploads/filename.ext to base64 data URI for self-contained HTML */
function logoToDataUri(logoPath: string): string {
  try {
    const filename = path.basename(logoPath);
    const filePath = path.join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) return logoPath;
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const mime =
      ext === 'svg'
        ? 'image/svg+xml'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'png'
            ? 'image/png'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'gif'
                ? 'image/gif'
                : 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return logoPath;
  }
}

function defaultService() {
  return {
    sawingPrice: 0,
    drillingPrice: 0,
    edgeBandingPrice: 0,
    technologistPercent: 0,
    designerPercent: 0,
    assemblyPercent: 0,
    deliveryPrice: 0,
    profitType: 'COEF' as const,
    profitValue: 1,
  };
}

/* Strip quantity info from labels for KP display (per TZ: "убрать кол-во, площади") */
function stripQtyFromLabel(label: string): string {
  return label
    .replace(/\s*\(\d+\s*(шт\.|м\.п\.|листов)\)/g, '') // (6 шт.)
    .replace(/,?\s*\d+\s*шт\.?$/g, '') // , 6 шт
    .replace(/\s+\d+×\d+/g, '') // 333×1600
    .trim();
}

function _findMat(product: any, materialId: string): any {
  for (const s of product.sections ?? []) {
    if (s.material?.id === materialId) return s.material;
    if (s.backWallMaterial?.id === materialId) return s.backWallMaterial;
  }
  for (const p of product.partitions ?? []) {
    if (p.material?.id === materialId) return p.material;
  }
  for (const sh of product.shelves ?? []) {
    if (sh.material?.id === materialId) return sh.material;
  }
  for (const f of product.facades ?? []) {
    if (f.material?.id === materialId) return f.material;
  }
  for (const ff of product.falseFacades ?? []) {
    if (ff.material?.id === materialId) return ff.material;
  }
  for (const dr of product.drawers ?? []) {
    if (dr.material?.id === materialId) return dr.material;
  }
  for (const ct of product.countertops ?? []) {
    if (ct.material?.id === materialId) return ct.material;
    if (ct.apronMaterial?.id === materialId) return ct.apronMaterial;
  }
  return null;
}

/* ═══ Tier price computation ═══ */
function computeTierPrices(userMaterials: any[], userHardware: any[]) {
  const materials: Record<string, any[]> = {};
  const hardware: Record<string, any[]> = {};

  /* Group materials by type */
  const matByType: Record<string, any[]> = {};
  for (const um of userMaterials) {
    const typeName = um.material?.materialType?.name ?? '';
    if (!typeName) continue;
    if (!matByType[typeName]) matByType[typeName] = [];
    matByType[typeName].push({
      materialId: um.materialId,
      brand: um.material?.brand ?? '',
      price: toNum(um.price),
      length: um.material?.length ?? 1,
      width: um.material?.width ?? 1,
      calcType: um.material?.calcType ?? 'SHEET',
    });
  }

  for (const [typeName, items] of Object.entries(matByType)) {
    const sorted = [...items].sort((a: any, b: any) => a.price - b.price);
    /* Standard = cheapest, Premium = most expensive.
       Comfort is NOT derived here — it uses the user's actual chosen material
       (already in details[].unitPrice). We still include a comfort entry
       that equals the cheapest for backward compat, but it is never used
       for price replacement in the tier loop. */
    materials[typeName] = [
      { ...sorted[0], tier: 'standard' },
      { ...sorted[0], tier: 'comfort' }, // placeholder, not used for price calc
      { ...sorted[sorted.length - 1], tier: 'premium' },
    ];
  }

  /* Group hardware by type */
  const hwByType: Record<string, any[]> = {};
  for (const uh of userHardware) {
    const typeName = uh.hardware?.hardwareType?.name ?? '';
    if (!typeName) continue;
    if (!hwByType[typeName]) hwByType[typeName] = [];
    hwByType[typeName].push({
      hardwareId: uh.hardwareId,
      brand: uh.hardware?.brand ?? '',
      price: toNum(uh.price),
    });
  }

  for (const [typeName, items] of Object.entries(hwByType)) {
    const sorted = [...items].sort((a: any, b: any) => a.price - b.price);
    hardware[typeName] = [
      { ...sorted[0], tier: 'standard' },
      { ...sorted[0], tier: 'comfort' }, // placeholder, comfort uses actual product prices
      { ...sorted[sorted.length - 1], tier: 'premium' },
    ];
  }

  return { materials, hardware };
}
