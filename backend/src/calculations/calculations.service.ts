import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
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
                bodyMaterial: { include: { materialType: true } },
                backWallMaterial: { include: { materialType: true } },
                falseFacadeMaterial: { include: { materialType: true } },
                sections: true,
                partitions: true,
                shelves: true,
                facades: {
                  include: { material: { include: { materialType: true } } },
                },
                drawers: true,
                mezzanine: {
                  include: {
                    bodyMaterial: { include: { materialType: true } },
                    backWallMaterial: { include: { materialType: true } },
                    falseFacadeMaterial: { include: { materialType: true } },
                    sections: true,
                    partitions: true,
                    shelves: true,
                    facades: {
                      include: {
                        material: { include: { materialType: true } },
                      },
                    },
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

    /* Hardware price map: hardwareType.name -> price */
    const hwPriceMap = new Map<string, number>();
    for (const uh of userHardware) {
      hwPriceMap.set(uh.hardware.hardwareType.name, toNum(uh.price));
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
    let _totalBodySheets = 0;
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
        );
        productResults.push(pr);
        productsSum += pr.cleanPrice;
        productsSumNoReserve += pr.cleanPrice;
        _totalBodySheets += pr.bodySheets;
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
      totalForClient = base - discountAmount;
      cleanProfit =
        base -
        discountAmount -
        techCost -
        designCost -
        deliveryCost -
        assemblyCost -
        (productsSum + workshopTotal);
    } else {
      const base = productsSum + workshopTotal;
      const discountAmount = (base * discount) / 100;
      totalForClient = base - discountAmount + profitValue;
      cleanProfit = profitValue;
    }

    /* Build material/hardware alternatives for brand selection on detail page */
    const materialOptions: any[] = [];
    for (const um of userMaterials) {
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
    for (const tier of ['standard', 'comfort', 'premium']) {
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
        tTotalForClient = Math.round(base);
        tCleanProfit = Math.round(
          base -
            tTechCost -
            tDesignCost -
            tDeliveryCost -
            tAssemblyCost -
            (tierProductsSum + tWorkshopTotal),
        );
      } else {
        const base = tierProductsSum + tWorkshopTotal;
        tTotalForClient = Math.round(base + profitValue);
        tCleanProfit = Math.round(profitValue);
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

      let totalForClient: number;
      if (profitType === 'COEF') {
        const base =
          (productsSumNoReserve + workshopTotal) * profitValue +
          proposalReserve;
        const disc = (base * discountPct) / 100;
        totalForClient = Math.round(base - disc);
      } else {
        const base = productsSum + workshopTotal;
        const disc = (base * discountPct) / 100;
        totalForClient = Math.round(base - disc + profitValue);
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

    const tabContentsHtml = enabledTiers
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

            productsHtml += `
            <div class="product-block">
              <div class="product-header">
                <span class="product-name">${pr.productType} — ${pr.dimensions}</span>
                <span class="product-price">${productPriceHtml}</span>
              </div>
              <div class="details-list">${detailsHtml}</div>
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

        // Payment stages HTML for this tier
        let paymentHtml = '';
        if (ps.paymentStages && ps.paymentStages.length > 0) {
          const stagesItems = ps.paymentStages
            .map((st: any) => {
              const amount = Math.round(
                (tr.totalForClient * st.percentage) / 100,
              );
              return `<div class="payment-stage">
                <span class="payment-stage-label" data-i18n-stage="${st.stageNumber}" data-pct="${st.percentage}">Этап ${st.stageNumber}: ${st.percentage}%</span>
                <span class="payment-stage-amount">${fmt(amount)}</span>
              </div>`;
            })
            .join('');
          paymentHtml = `<div class="payment-section">
            <div class="payment-title" data-i18n="paymentTitle">Условия оплаты</div>
            ${stagesItems}
          </div>`;
        }

        return `
        <div id="tab-${tier}" class="tab-content" style="display:${idx === 0 ? 'block' : 'none'};">
          <div class="tier-title">${tierLabels[tier]}</div>
          ${roomsHtml}
          <div class="tier-total">
            <div class="total-inner-bar">
              <span class="total-label" data-i18n="total">Итого</span>
              ${grandTotalHtml}
            </div>
          </div>
          ${paymentHtml}
        </div>
        <div id="total-${tier}" class="total-bar" style="display:${idx === 0 ? 'flex' : 'none'};">
          <div class="total-inner-bar">
            <span class="total-label" data-i18n="total">Итого</span>
            ${grandTotalHtml}
          </div>
        </div>`;
      })
      .join('');

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
      transition: border-color 0.15s;
    }
    .product-block:hover {
      border-color: var(--accent);
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

    /* ─── Details list ─── */
    .details-list {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed var(--border);
      columns: 2;
      column-gap: 12px;
    }
    .detail-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding: 2px 0;
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
      display: block;
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
      padding: 18px;
      background: var(--payment-bg);
      border-radius: 14px;
      border: 1px solid var(--border);
    }
    .payment-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 12px;
    }
    .payment-stage {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px dashed var(--border);
    }
    .payment-stage:last-child { border-bottom: none; }
    .payment-stage-label {
      font-size: 13px;
      color: var(--text-secondary);
    }
    .payment-stage-amount {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
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
      display: flex;
      flex-direction: column;
      gap: 8px;
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
      .kp-header { box-shadow: none; }
      .print-btn { display: none !important; }
    }
    @media (max-width: 640px) {
      .page-wrapper { padding: 12px 12px 76px; }
      .kp-header { padding: 18px 14px 14px; }
      .kp-project { font-size: 18px; }
      .tabs-wrap { margin: 0 -12px 12px; padding: 4px 12px; }
      .product-block { padding: 14px 16px; }
      .total-bar { padding: 12px 16px; }
      .grand-new { font-size: 18px; }
      .details-list { columns: 1; }
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
    <button class="toolbar-btn lang-btn" id="lang-toggle" onclick="toggleLang()">RU</button>
  </div>

  ${
    ps.companyInfo
      ? `<div class="company-info">
    ${ps.companyInfo.logo ? `<img class="company-logo" src="${logoToDataUri(ps.companyInfo.logo)}" alt="${ps.companyInfo.name}" />` : ''}
    <div class="company-name">${ps.companyInfo.name}</div>
    ${ps.companyInfo.description ? `<div class="company-desc">${ps.companyInfo.description}</div>` : ''}
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

  ${contactsHtml}

  <button onclick="window.print()" class="print-btn no-print" data-i18n="print">Печать / PDF</button>
</div>

  <script>
    /* ── Tab switching ── */
    function showTab(tier) {
      document.querySelectorAll('.tab-content').forEach(function(el) { el.style.display = 'none'; });
      document.querySelectorAll('.tab-btn').forEach(function(el) { el.classList.remove('active'); });
      document.querySelectorAll('.total-bar').forEach(function(el) { el.style.display = 'none'; });
      var tab = document.getElementById('tab-' + tier);
      var btn = document.getElementById('tab-btn-' + tier);
      var total = document.getElementById('total-' + tier);
      if (tab) tab.style.display = 'block';
      if (btn) btn.classList.add('active');
      if (total) total.style.display = 'flex';
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
        print: 'Печать / PDF'
      },
      kz: {
        badge: 'Коммерциялық ұсыныс',
        total: 'Барлығы',
        paymentTitle: 'Төлем шарттары',
        stage: 'Кезең',
        contactsTitle: 'Байланыс',
        print: 'Басып шығару / PDF'
      }
    };
    function toggleLang() {
      KP_LANG = KP_LANG === 'ru' ? 'kz' : 'ru';
      document.getElementById('lang-toggle').textContent = KP_LANG.toUpperCase();
      var strings = I18N[KP_LANG];
      document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (strings[key]) el.textContent = strings[key];
      });
      document.querySelectorAll('[data-i18n-stage]').forEach(function(el) {
        var num = el.getAttribute('data-i18n-stage');
        var pct = el.getAttribute('data-pct');
        el.textContent = strings.stage + ' ' + num + ': ' + pct + '%';
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
  ) {
    const W = product.width;
    const H = product.height;
    const D = product.depth;
    const mainH =
      product.mezzanineEnabled && product.mezzanine?.height
        ? H - product.mezzanine.height
        : H;

    let materialCost = 0;
    let hardwareCost = 0;
    const details: any[] = [];

    /* Body material info — auto-select cheapest ЛДСП if not set */
    let bodyMatId = product.bodyMaterialId;
    let bodyMaterial = findMat(product, bodyMatId);
    let bodyPrice = matPrice.get(bodyMatId) ?? 0;

    if (!bodyMatId && userMaterials?.length) {
      const ldspMats = userMaterials
        .filter((um) => um.material?.materialType?.name === 'ЛДСП')
        .sort((a, b) => toNum(a.price) - toNum(b.price));
      if (ldspMats.length > 0) {
        const cheapest = ldspMats[0];
        bodyMatId = cheapest.materialId;
        bodyMaterial = cheapest.material;
        bodyPrice = toNum(cheapest.price);
      }
    }

    const sheetL = bodyMaterial?.length ?? 2800;
    const sheetW = bodyMaterial?.width ?? 2070;
    const sheetArea = (sheetL / 1000) * (sheetW / 1000); // m²

    /* ═══ Collect ALL body ЛДСП area (mm²) ═══ */
    let bodyAreaMm2 = 0;
    let totalSectionQty = 0;
    let totalShelfQty = 0;

    // Top + bottom (always)
    bodyAreaMm2 += W * D * 2;

    // Side panels: from sections (2 per section) or basic box (2)
    if (product.sectionsEnabled && product.sections?.length > 0) {
      for (const sec of product.sections) {
        if (!sec.mezzanineId) {
          totalSectionQty += sec.qty;
          bodyAreaMm2 += mainH * D * 2 * sec.qty;
        }
      }
    } else {
      bodyAreaMm2 += D * mainH * 2;
    }

    // Partitions
    if (product.partitionsEnabled && product.partitions) {
      for (const part of product.partitions) {
        if (!part.mezzanineId) {
          const partH = Math.min(part.height, mainH);
          bodyAreaMm2 += D * partH * part.qty;
        }
      }
    }

    // Shelves
    if (product.shelvesEnabled && product.shelves) {
      for (const sh of product.shelves) {
        if (!sh.mezzanineId) {
          bodyAreaMm2 += sh.width * D * sh.qty;
          totalShelfQty += sh.qty;
        }
      }
    }

    // Drawers body material: (front×2 + bottom + side×2) × qty
    if (product.drawersEnabled && product.drawers) {
      for (const dr of product.drawers) {
        if (!dr.mezzanineId) {
          bodyAreaMm2 +=
            (dr.width * dr.height * 2 + dr.width * D + dr.height * D * 2) *
            dr.qty;
        }
      }
    }

    // ЛДСП facades with SAME material as body → add to body area
    if (product.facadesEnabled && product.facades) {
      for (const f of product.facades) {
        if (!f.mezzanineId && f.isLdsp) {
          const facadeH = Math.min(f.height, mainH);
          bodyAreaMm2 += f.width * facadeH * f.qty;
        }
      }
    }

    /* ═══ Mezzanine body ═══ */
    let mezTotalShelfQty = 0;
    let mezBodyAreaMm2 = 0; // собирается отдельно, потом объединяется или нет
    if (product.mezzanineEnabled && product.mezzanine) {
      const mez = product.mezzanine;
      const mezH = mez.height;

      // top + bottom
      mezBodyAreaMm2 += W * D * 2;

      // sides from sections or basic
      if (mez.sectionsEnabled && mez.sections?.length > 0) {
        for (const sec of mez.sections) {
          mezBodyAreaMm2 += mezH * D * 2 * sec.qty;
        }
      } else {
        mezBodyAreaMm2 += D * mezH * 2;
      }

      if (mez.partitionsEnabled && mez.partitions) {
        for (const part of mez.partitions) {
          const partH = Math.min(part.height, mezH);
          mezBodyAreaMm2 += D * partH * part.qty;
        }
      }

      if (mez.shelvesEnabled && mez.shelves) {
        for (const sh of mez.shelves) {
          mezBodyAreaMm2 += sh.width * D * sh.qty;
          mezTotalShelfQty += sh.qty;
        }
      }

      if (mez.drawersEnabled && mez.drawers) {
        for (const dr of mez.drawers) {
          mezBodyAreaMm2 +=
            (dr.width * dr.height * 2 + dr.width * D + dr.height * D * 2) *
            dr.qty;
        }
      }

      // Mezzanine ЛДСП facades with same body material
      if (mez.facadesEnabled && mez.facades) {
        for (const f of mez.facades) {
          if (f.isLdsp) {
            const facadeH = Math.min(f.height, mezH);
            mezBodyAreaMm2 += f.width * facadeH * f.qty;
          }
        }
      }

      /* Если материал антресоли = как корпус (bodyMaterialId == null), суммируем площадь.
         Иначе считаем отдельно по calcType материала антресоли. */
      if (!mez.bodyMaterialId) {
        // Как корпус — добавляем в общую площадь
        bodyAreaMm2 += mezBodyAreaMm2;
      }
      // else: обрабатывается ниже, после подсчёта body sheets
    }

    /* Calculate body sheets */
    const bodyAreaM2 = bodyAreaMm2 / 1_000_000;
    const bodySheets = sheetArea > 0 ? Math.ceil(bodyAreaM2 / sheetArea) : 0;
    const bodyCost = bodySheets * bodyPrice;
    materialCost += bodyCost;
    details.push({
      id: 'body',
      type: 'material',
      label: 'Корпус осн.',
      materialId: bodyMatId,
      materialType: 'ЛДСП',
      brand: bodyMaterial?.brand ?? '',
      qty: bodySheets,
      unit: 'л.',
      unitPrice: bodyPrice,
      cost: Math.round(bodyCost),
      enabled: true,
    });

    /* ═══ Mezzanine separate material ═══ */
    let mezBodySheets = 0;
    if (
      product.mezzanineEnabled &&
      product.mezzanine?.bodyMaterialId &&
      mezBodyAreaMm2 > 0
    ) {
      const mezMat =
        product.mezzanine.bodyMaterial ??
        findMat(product, product.mezzanine.bodyMaterialId);
      const mezMatPrice = matPrice.get(product.mezzanine.bodyMaterialId) ?? 0;
      const mezCalcType = mezMat?.calcType ?? 'SHEET';

      if (mezCalcType === 'SHEET') {
        const mezSheetL = mezMat?.length ?? 2800;
        const mezSheetW = mezMat?.width ?? 2070;
        const mezSheetArea = (mezSheetL / 1000) * (mezSheetW / 1000);
        const mezAreaM2 = mezBodyAreaMm2 / 1_000_000;
        mezBodySheets =
          mezSheetArea > 0 ? Math.ceil(mezAreaM2 / mezSheetArea) : 0;
        const mezCost = mezBodySheets * mezMatPrice;
        materialCost += mezCost;
        details.push({
          id: 'mez-body',
          type: 'material',
          label: 'Корпус антр.',
          materialId: product.mezzanine.bodyMaterialId,
          materialType: mezMat?.materialType?.name ?? 'ЛДСП',
          brand: mezMat?.brand ?? '',
          qty: mezBodySheets,
          unit: 'л.',
          unitPrice: mezMatPrice,
          cost: Math.round(mezCost),
          enabled: true,
        });
      } else {
        // SQM — считаем по площади в м²
        const mezAreaM2 = mezBodyAreaMm2 / 1_000_000;
        const mezCost = mezAreaM2 * mezMatPrice;
        materialCost += mezCost;
        details.push({
          id: 'mez-body',
          type: 'material',
          label: 'Корпус антр.',
          materialId: product.mezzanine.bodyMaterialId,
          materialType: mezMat?.materialType?.name ?? '',
          brand: mezMat?.brand ?? '',
          qty: Math.round(mezAreaM2 * 100) / 100,
          unit: 'м²',
          unitPrice: mezMatPrice,
          cost: Math.round(mezCost),
          enabled: true,
        });
      }
    }

    /* ═══ ЛДСП facades with DIFFERENT material ═══ */
    let otherLdspSheets = 0;
    const calcDiffLdsp = (facades: any[], maxH: number, prefix: string) => {
      if (!facades) return;
      const ldspMap = new Map<string, number>();
      for (const f of facades) {
        if (f.materialId && f.material?.materialType?.name === 'ЛДСП') {
          const facadeH = Math.min(f.height, maxH);
          ldspMap.set(
            f.materialId,
            (ldspMap.get(f.materialId) ?? 0) + f.width * facadeH * f.qty,
          );
        }
      }
      for (const [matId, areaMm2] of ldspMap) {
        const mat = findMat(product, matId);
        const price = matPrice.get(matId) ?? 0;
        const sL = mat?.length ?? 2800;
        const sW2 = mat?.width ?? 2070;
        const sArea = (sL / 1000) * (sW2 / 1000);
        const aM2 = areaMm2 / 1_000_000;
        const sheets = sArea > 0 ? Math.ceil(aM2 / sArea) : 0;
        const cost = sheets * price;
        materialCost += cost;
        otherLdspSheets += sheets;
        details.push({
          id: `facade-ldsp-${prefix}-${matId}`,
          type: 'material',
          label: `${prefix} ЛДСП (${mat?.brand ?? ''})`,
          materialId: matId,
          materialType: 'ЛДСП',
          brand: mat?.brand ?? '',
          qty: sheets,
          unit: 'л.',
          unitPrice: price,
          cost: Math.round(cost),
          enabled: true,
        });
      }
    };
    if (product.facadesEnabled)
      calcDiffLdsp(
        product.facades?.filter((f: any) => !f.mezzanineId),
        mainH,
        'Фасад осн.',
      );
    if (product.mezzanineEnabled && product.mezzanine?.facadesEnabled)
      calcDiffLdsp(
        product.mezzanine?.facades,
        product.mezzanine.height,
        'Фасад антр.',
      );

    /* ═══ Non-ЛДСП facades ═══ */
    let nonLdspFacadePerimLm = 0;
    const calcNonLdspFacades = (
      facades: any[],
      maxH: number,
      prefix: string,
    ) => {
      if (!facades) return;
      for (const f of facades) {
        if (
          !f.isLdsp &&
          f.materialId &&
          f.material?.materialType?.name !== 'ЛДСП'
        ) {
          const mat = findMat(product, f.materialId);
          const price = matPrice.get(f.materialId) ?? 0;
          const calcType = mat?.calcType ?? 'SQM';
          const facadeH = Math.min(f.height, maxH);
          const area = (f.width / 1000) * (facadeH / 1000) * f.qty;
          let cost = 0;
          if (calcType === 'SHEET') {
            const sL = mat?.length ?? 2800;
            const sW2 = mat?.width ?? 2070;
            const sArea = (sL / 1000) * (sW2 / 1000);
            cost = sArea > 0 ? Math.ceil(area / sArea) * price : 0;
          } else if (calcType === 'SQM') {
            cost = area * price;
          } else {
            cost = (f.width / 1000) * f.qty * price;
          }
          materialCost += cost;

          // accumulate perimeter for edge banding
          nonLdspFacadePerimLm += ((2 * (f.width + facadeH)) / 1000) * f.qty;

          let qty: number;
          let unit: string;
          let unitPrice: number;
          if (calcType === 'SQM') {
            qty = Math.round(area * 100) / 100;
            unit = 'м²';
            unitPrice = price;
          } else if (calcType === 'LM') {
            qty = Math.round((f.width / 1000) * f.qty * 100) / 100;
            unit = 'п.м.';
            unitPrice = price;
          } else {
            // SHEET
            qty = f.qty;
            unit = 'шт.';
            unitPrice = Math.round(cost / f.qty);
          }

          details.push({
            id: `facade-${prefix}-${f.materialId}-${f.width}x${facadeH}`,
            type: 'material',
            label: `${prefix} ${mat?.materialType?.name ?? ''} ${f.width}×${facadeH}, ${f.qty} шт`,
            materialId: f.materialId,
            materialType: mat?.materialType?.name ?? '',
            brand: mat?.brand ?? '',
            qty,
            unit,
            unitPrice,
            cost: Math.round(cost),
            enabled: true,
          });
        }
      }
    };
    if (product.facadesEnabled)
      calcNonLdspFacades(
        product.facades?.filter((f: any) => !f.mezzanineId),
        mainH,
        'Фасад осн.',
      );
    if (product.mezzanineEnabled && product.mezzanine?.facadesEnabled)
      calcNonLdspFacades(
        product.mezzanine?.facades,
        product.mezzanine.height,
        'Фасад антр.',
      );

    /* ═══ Back wall ═══ */
    if (product.backWallEnabled && product.backWallMaterialId) {
      const bwMat = findMat(product, product.backWallMaterialId);
      const bwPrice = matPrice.get(product.backWallMaterialId) ?? 0;
      const bwCalc = bwMat?.calcType ?? 'SHEET';
      const bwAreaM2 = (W / 1000) * (mainH / 1000);
      let bwCost = 0;
      let bwQty = 0;
      let bwUnit = 'м²';
      if (bwCalc === 'SHEET') {
        const sL = bwMat?.length ?? 2800;
        const sW2 = bwMat?.width ?? 2070;
        const sArea = (sL / 1000) * (sW2 / 1000);
        bwQty = sArea > 0 ? Math.ceil(bwAreaM2 / sArea) : 0;
        bwCost = bwQty * bwPrice;
        bwUnit = 'л.';
      } else {
        bwQty = +bwAreaM2.toFixed(2);
        bwCost = bwAreaM2 * bwPrice;
        bwUnit = 'м²';
      }
      materialCost += bwCost;
      details.push({
        id: 'backwall',
        type: 'material',
        label: `Зад. стенка осн. ${bwMat?.materialType?.name ?? 'ХДФ'} ${W}×${mainH}`,
        materialId: product.backWallMaterialId,
        materialType: bwMat?.materialType?.name ?? 'ХДФ',
        brand: bwMat?.brand ?? '',
        qty: bwQty,
        unit: bwUnit,
        unitPrice: Math.round(bwQty > 0 ? bwCost / bwQty : 0),
        cost: Math.round(bwCost),
        enabled: true,
      });
    }

    // Mezzanine back wall
    if (
      product.mezzanineEnabled &&
      product.mezzanine?.backWallEnabled &&
      product.mezzanine?.backWallMaterialId
    ) {
      const mez = product.mezzanine;
      const bwMat = findMat(product, mez.backWallMaterialId);
      const bwPrice = matPrice.get(mez.backWallMaterialId) ?? 0;
      const bwCalc = bwMat?.calcType ?? 'SHEET';
      const bwAreaM2 = (W / 1000) * (mez.height / 1000);
      let bwCost = 0;
      let bwQty = 0;
      let bwUnit = 'м²';
      if (bwCalc === 'SHEET') {
        const sL = bwMat?.length ?? 2800;
        const sW2 = bwMat?.width ?? 2070;
        const sArea = (sL / 1000) * (sW2 / 1000);
        bwQty = sArea > 0 ? Math.ceil(bwAreaM2 / sArea) : 0;
        bwCost = bwQty * bwPrice;
        bwUnit = 'л.';
      } else {
        bwQty = +bwAreaM2.toFixed(2);
        bwCost = bwAreaM2 * bwPrice;
        bwUnit = 'м²';
      }
      materialCost += bwCost;
      details.push({
        id: 'mez-backwall',
        type: 'material',
        label: `Зад. стенка антр. ${bwMat?.materialType?.name ?? 'ХДФ'} ${W}×${mez.height}`,
        materialId: mez.backWallMaterialId,
        materialType: bwMat?.materialType?.name ?? 'ХДФ',
        brand: bwMat?.brand ?? '',
        qty: bwQty,
        unit: bwUnit,
        unitPrice: Math.round(bwQty > 0 ? bwCost / bwQty : 0),
        cost: Math.round(bwCost),
        enabled: true,
      });
    }

    /* ═══ False facades ═══ */
    let falseFacadePerimLm = 0;
    if (
      product.falseFacadesEnabled &&
      product.falseFacadeQty > 0 &&
      product.falseFacadeMaterialId
    ) {
      const ffMat = findMat(product, product.falseFacadeMaterialId);
      const ffPrice = matPrice.get(product.falseFacadeMaterialId) ?? 0;
      const ffCalc = ffMat?.calcType ?? 'SQM';
      const ffH = mainH; // ограничение по высоте основной части
      const ffAreaM2 = (D / 1000) * (ffH / 1000) * product.falseFacadeQty;
      let ffCost = 0;
      let ffQty = 0;
      let ffUnit = 'м²';
      if (ffCalc === 'SHEET') {
        const sL = ffMat?.length ?? 2800;
        const sW2 = ffMat?.width ?? 2070;
        const sArea = (sL / 1000) * (sW2 / 1000);
        ffQty = sArea > 0 ? Math.ceil(ffAreaM2 / sArea) : 0;
        ffCost = ffQty * ffPrice;
        ffUnit = 'л.';
      } else if (ffCalc === 'LM') {
        ffQty = +((ffH / 1000) * product.falseFacadeQty).toFixed(2);
        ffCost = ffQty * ffPrice;
        ffUnit = 'м.п.';
      } else {
        ffQty = +ffAreaM2.toFixed(2);
        ffCost = ffAreaM2 * ffPrice;
        ffUnit = 'м²';
      }
      materialCost += ffCost;
      // accumulate perimeter for edge banding
      falseFacadePerimLm += ((2 * (D + ffH)) / 1000) * product.falseFacadeQty;
      details.push({
        id: 'false-facade',
        type: 'material',
        label: `Фальш осн. ${ffMat?.materialType?.name ?? ''} ${D}×${ffH}, ${product.falseFacadeQty} шт`,
        materialId: product.falseFacadeMaterialId,
        materialType: ffMat?.materialType?.name ?? '',
        brand: ffMat?.brand ?? '',
        qty: ffQty,
        unit: ffUnit,
        unitPrice: Math.round(ffQty > 0 ? ffCost / ffQty : 0),
        cost: Math.round(ffCost),
        enabled: true,
      });
    }

    if (
      product.mezzanineEnabled &&
      product.mezzanine?.falseFacadesEnabled &&
      product.mezzanine?.falseFacadeQty > 0
    ) {
      const mez = product.mezzanine;
      if (mez.falseFacadeMaterialId) {
        const mezFfMat = findMat(product, mez.falseFacadeMaterialId);
        const ffPrice = matPrice.get(mez.falseFacadeMaterialId) ?? 0;
        const ffCalc = mezFfMat?.calcType ?? 'SQM';
        const ffH = mez.height; // ограничение по высоте антресоли
        const ffAreaM2 = (D / 1000) * (ffH / 1000) * mez.falseFacadeQty;
        let ffCost = 0;
        let ffQty = 0;
        let ffUnit = 'м²';
        if (ffCalc === 'SHEET') {
          const sL = mezFfMat?.length ?? 2800;
          const sW2 = mezFfMat?.width ?? 2070;
          const sArea = (sL / 1000) * (sW2 / 1000);
          ffQty = sArea > 0 ? Math.ceil(ffAreaM2 / sArea) : 0;
          ffCost = ffQty * ffPrice;
          ffUnit = 'л.';
        } else if (ffCalc === 'LM') {
          ffQty = +((ffH / 1000) * mez.falseFacadeQty).toFixed(2);
          ffCost = ffQty * ffPrice;
          ffUnit = 'м.п.';
        } else {
          ffQty = +ffAreaM2.toFixed(2);
          ffCost = ffAreaM2 * ffPrice;
          ffUnit = 'м²';
        }
        materialCost += ffCost;
        // accumulate perimeter for edge banding
        falseFacadePerimLm += ((2 * (D + ffH)) / 1000) * mez.falseFacadeQty;
        details.push({
          id: 'mez-false-facade',
          type: 'material',
          label: `Фальш антр. ${mezFfMat?.materialType?.name ?? ''} ${D}×${ffH}, ${mez.falseFacadeQty} шт`,
          materialId: mez.falseFacadeMaterialId,
          materialType: mezFfMat?.materialType?.name ?? '',
          brand: mezFfMat?.brand ?? '',
          qty: ffQty,
          unit: ffUnit,
          unitPrice: Math.round(ffQty > 0 ? ffCost / ffQty : 0),
          cost: Math.round(ffCost),
          enabled: true,
        });
      }
    }

    /* ═══ Countertop ═══ */
    if (product.countertopEnabled && product.countertop) {
      const ct = product.countertop;
      if (ct.materialId) {
        const ctMat = findMat(product, ct.materialId);
        const ctPrice = matPrice.get(ct.materialId) ?? 0;
        const ctCalc = ctMat?.calcType ?? 'SHEET';
        let ctCost = 0;
        let ctQty = 0;
        let ctUnit = 'м²';
        if (ctCalc === 'SHEET') {
          const sL = ctMat?.length ?? 2800;
          ctQty = Math.ceil(ct.width / sL);
          ctCost = ctQty * ctPrice;
          ctUnit = 'л.';
        } else if (ctCalc === 'SQM') {
          const areaM2 = (ct.width / 1000) * (ct.depth / 1000);
          ctQty = +areaM2.toFixed(2);
          ctCost = areaM2 * ctPrice;
          ctUnit = 'м²';
        } else {
          ctQty = +(ct.width / 1000).toFixed(2);
          ctCost = (ct.width / 1000) * ctPrice;
          ctUnit = 'м.п.';
        }
        materialCost += ctCost;
        details.push({
          id: 'countertop',
          type: 'material',
          label: `Столешница ${ctMat?.materialType?.name ?? ''} ${ct.width}×${ct.depth}`,
          materialId: ct.materialId,
          materialType: ctMat?.materialType?.name ?? '',
          brand: ctMat?.brand ?? '',
          qty: ctQty,
          unit: ctUnit,
          unitPrice: Math.round(ctQty > 0 ? ctCost / ctQty : 0),
          cost: Math.round(ctCost),
          enabled: true,
        });
      }
      if (ct.apronEnabled && ct.apronMaterialId) {
        const apMat = findMat(product, ct.apronMaterialId);
        const apPrice = matPrice.get(ct.apronMaterialId) ?? 0;
        const apCalc = apMat?.calcType ?? 'SHEET';
        const apW = ct.apronWidth ?? ct.width;
        const apH = ct.apronHeight ?? 600;
        let apCost = 0;
        let apQty = 0;
        let apUnit = 'м²';
        if (apCalc === 'SHEET') {
          const sL = apMat?.length ?? 2800;
          apQty = Math.ceil(apW / sL);
          apCost = apQty * apPrice;
          apUnit = 'л.';
        } else if (apCalc === 'SQM') {
          const areaM2 = (apW / 1000) * (apH / 1000);
          apQty = +areaM2.toFixed(2);
          apCost = areaM2 * apPrice;
          apUnit = 'м²';
        } else {
          apQty = +(apW / 1000).toFixed(2);
          apCost = (apW / 1000) * apPrice;
          apUnit = 'м.п.';
        }
        materialCost += apCost;
        details.push({
          id: 'apron',
          type: 'material',
          label: `Фартук ${apMat?.materialType?.name ?? ''} ${apW}×${apH}`,
          materialId: ct.apronMaterialId,
          materialType: apMat?.materialType?.name ?? '',
          brand: apMat?.brand ?? '',
          qty: apQty,
          unit: apUnit,
          unitPrice: Math.round(apQty > 0 ? apCost / apQty : 0),
          cost: Math.round(apCost),
          enabled: true,
        });
      }
    }

    /* ═══════════ HARDWARE ═══════════ */

    /* Hinges: ≤699→2, 700-1199→3, 1200-1699→4, 1700-2199→5, ... */
    let totalHinges = 0;
    const calcHinges = (facades: any[], maxH: number) => {
      if (!facades) return;
      for (const f of facades) {
        const facadeH = Math.min(f.height, maxH);
        const perFacade = 2 + Math.max(0, Math.floor((facadeH - 200) / 500));
        totalHinges += perFacade * f.qty;
      }
    };
    if (product.facadesEnabled)
      calcHinges(
        product.facades?.filter((f: any) => !f.mezzanineId),
        mainH,
      );
    if (product.mezzanineEnabled && product.mezzanine?.facadesEnabled)
      calcHinges(product.mezzanine?.facades, product.mezzanine.height);
    if (totalHinges > 0) {
      const hingePrice = hwPrice.get('Петли') ?? 0;
      const hingeCost = totalHinges * hingePrice;
      hardwareCost += hingeCost;
      details.push({
        id: 'hinges',
        type: 'hardware',
        label: `Петли (${totalHinges} шт.)`,
        hardwareType: 'Петли',
        brand: '',
        qty: totalHinges,
        unit: 'шт.',
        unitPrice: hingePrice,
        cost: Math.round(hingeCost),
        enabled: true,
      });
    }

    /* Handles */
    let totalHandles = 0;
    const collectHandles = (facades: any[], drawers: any[]) => {
      for (const f of facades ?? []) {
        if (f.handleQty > 0) totalHandles += f.handleQty * f.qty;
      }
      for (const dr of drawers ?? []) {
        if (dr.handleQty > 0) totalHandles += dr.handleQty * dr.qty;
      }
    };
    collectHandles(
      product.facadesEnabled
        ? product.facades?.filter((f: any) => !f.mezzanineId)
        : [],
      product.drawersEnabled
        ? product.drawers?.filter((d: any) => !d.mezzanineId)
        : [],
    );
    if (product.mezzanineEnabled && product.mezzanine) {
      collectHandles(
        product.mezzanine.facadesEnabled ? product.mezzanine.facades : [],
        product.mezzanine.drawersEnabled ? product.mezzanine.drawers : [],
      );
    }
    if (totalHandles > 0) {
      const handlePrice = hwPrice.get('Ручки') ?? 0;
      const handleCost = totalHandles * handlePrice;
      hardwareCost += handleCost;
      details.push({
        id: 'handles',
        type: 'hardware',
        label: `Ручки (${totalHandles} шт.)`,
        hardwareType: 'Ручки',
        brand: '',
        qty: totalHandles,
        unit: 'шт.',
        unitPrice: handlePrice,
        cost: Math.round(handleCost),
        enabled: true,
      });
    }

    /* Legs: only for main sections (NOT mezzanine per TZ) */
    if (totalSectionQty > 0) {
      const wSection = W / totalSectionQty;
      const legsPerSection =
        4 + 2 * Math.max(0, Math.floor((wSection - 200) / 500));
      const totalLegs = legsPerSection * totalSectionQty;
      const legPrice = hwPrice.get('Ножки') ?? 0;
      const legCost = totalLegs * legPrice;
      hardwareCost += legCost;
      details.push({
        id: 'legs',
        type: 'hardware',
        label: `Ножки (${totalLegs} шт.)`,
        hardwareType: 'Ножки',
        brand: '',
        qty: totalLegs,
        unit: 'шт.',
        unitPrice: legPrice,
        cost: Math.round(legCost),
        enabled: true,
      });
    }

    /* Shelf holders: 4 × sum(shelf_qty) */
    const totalShelfHolders = 4 * (totalShelfQty + mezTotalShelfQty);
    if (totalShelfHolders > 0) {
      const shPrice = hwPrice.get('Полкодержатели') ?? 0;
      const shCost = totalShelfHolders * shPrice;
      hardwareCost += shCost;
      details.push({
        id: 'shelf-holders',
        type: 'hardware',
        label: `Полкодержатели (${totalShelfHolders} шт.)`,
        hardwareType: 'Полкодержатели',
        brand: '',
        qty: totalShelfHolders,
        unit: 'шт.',
        unitPrice: shPrice,
        cost: Math.round(shCost),
        enabled: true,
      });
    }

    /* Drawer slides: 1 per drawer */
    let totalSlides = 0;
    if (product.drawersEnabled && product.drawers) {
      for (const dr of product.drawers) {
        if (!dr.mezzanineId) totalSlides += dr.qty;
      }
    }
    if (
      product.mezzanineEnabled &&
      product.mezzanine?.drawersEnabled &&
      product.mezzanine?.drawers
    ) {
      for (const dr of product.mezzanine.drawers) {
        totalSlides += dr.qty;
      }
    }
    if (totalSlides > 0) {
      const slidePrice =
        hwPrice.get('Направляющие') ?? hwPrice.get('Тандем') ?? 0;
      const slideCost = totalSlides * slidePrice;
      hardwareCost += slideCost;
      details.push({
        id: 'slides',
        type: 'hardware',
        label: `Направляющие (${totalSlides} шт.)`,
        hardwareType: 'Направляющие',
        brand: '',
        qty: totalSlides,
        unit: 'шт.',
        unitPrice: slidePrice,
        cost: Math.round(slideCost),
        enabled: true,
      });
    }

    /* Konfirmats (approximate) */
    const konfPrice = hwPrice.get('Конфирмат') ?? 0;
    const konfQty = 20;
    const konfCost = konfQty * konfPrice;
    hardwareCost += konfCost;
    if (konfCost > 0) {
      details.push({
        id: 'konfirmats',
        type: 'hardware',
        label: `Конфирмат (${konfQty} шт.)`,
        hardwareType: 'Конфирмат',
        brand: '',
        qty: konfQty,
        unit: 'шт.',
        unitPrice: konfPrice,
        cost: Math.round(konfCost),
        enabled: true,
      });
    }

    /* ═══ Edge banding (м.п.) ═══ */
    // ЛДСП корпуса (main+mez) × 25 + ЛДСП фасады другого мат. × 25
    // + периметр не-ЛДСП фасадов + периметр фальш-фасадов
    const edgeLm =
      (bodySheets + mezBodySheets) * 25 +
      otherLdspSheets * 25 +
      nonLdspFacadePerimLm +
      falseFacadePerimLm;

    // Find edge material from user materials (type = Кромка)
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

    /* ═══ Extras ═══ */
    let extrasCost = 0;
    if (product.extrasEnabled && product.extras) {
      for (const ex of product.extras) {
        const c = toNum(ex.price);
        extrasCost += c;
        details.push({
          id: `extra-${ex.id}`,
          type: 'extra',
          label: `Доп: ${ex.name}`,
          qty: 1,
          unit: 'шт.',
          unitPrice: Math.round(c),
          cost: Math.round(c),
          enabled: true,
        });
      }
    }

    const cleanPrice = materialCost + hardwareCost + extrasCost;

    return {
      productId: product.id,
      productType: product.productType.name,
      dimensions: `${W}×${H}×${D}`,
      materialCost: Math.round(materialCost),
      hardwareCost: Math.round(hardwareCost),
      extrasCost: Math.round(extrasCost),
      cleanPrice: Math.round(cleanPrice),
      bodySheets,
      totalSheets: bodySheets + otherLdspSheets + mezBodySheets,
      edgeLm,
      bodyAreaMm2,
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
  return label.replace(/\s*\(\d+\s*(шт\.|м\.п\.|листов)\)/g, '').trim();
}

function findMat(product: any, materialId: string): any {
  if (product.bodyMaterial?.id === materialId) return product.bodyMaterial;
  if (product.backWallMaterial?.id === materialId)
    return product.backWallMaterial;
  if (product.falseFacadeMaterial?.id === materialId)
    return product.falseFacadeMaterial;
  for (const f of product.facades ?? []) {
    if (f.material?.id === materialId) return f.material;
  }
  if (product.countertop?.material?.id === materialId)
    return product.countertop.material;
  if (product.countertop?.apronMaterial?.id === materialId)
    return product.countertop.apronMaterial;
  if (product.mezzanine?.bodyMaterial?.id === materialId)
    return product.mezzanine.bodyMaterial;
  if (product.mezzanine?.backWallMaterial?.id === materialId)
    return product.mezzanine.backWallMaterial;
  if (product.mezzanine?.falseFacadeMaterial?.id === materialId)
    return product.mezzanine.falseFacadeMaterial;
  for (const f of product.mezzanine?.facades ?? []) {
    if (f.material?.id === materialId) return f.material;
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
    if (items.length < 2) {
      materials[typeName] = [
        { ...items[0], tier: 'standard' },
        { ...items[0], tier: 'comfort' },
        { ...items[0], tier: 'premium' },
      ];
      continue;
    }

    const sorted = [...items].sort((a: any, b: any) => a.price - b.price);
    const minP = sorted[0].price;
    const maxP = sorted[sorted.length - 1].price;
    const avg = (minP + maxP) / 2;

    let comfIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const diff = Math.abs(sorted[i].price - avg);
      if (
        diff < minDiff ||
        (diff === minDiff && sorted[i].price < sorted[comfIdx].price)
      ) {
        minDiff = diff;
        comfIdx = i;
      }
    }

    materials[typeName] = [
      { ...sorted[0], tier: 'standard' },
      { ...sorted[comfIdx], tier: 'comfort' },
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
    if (items.length < 2) {
      hardware[typeName] = [
        { ...items[0], tier: 'standard' },
        { ...items[0], tier: 'comfort' },
        { ...items[0], tier: 'premium' },
      ];
      continue;
    }

    const sorted = [...items].sort((a: any, b: any) => a.price - b.price);
    const minP = sorted[0].price;
    const maxP = sorted[sorted.length - 1].price;
    const avg = (minP + maxP) / 2;

    let comfIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const diff = Math.abs(sorted[i].price - avg);
      if (
        diff < minDiff ||
        (diff === minDiff && sorted[i].price < sorted[comfIdx].price)
      ) {
        minDiff = diff;
        comfIdx = i;
      }
    }

    hardware[typeName] = [
      { ...sorted[0], tier: 'standard' },
      { ...sorted[comfIdx], tier: 'comfort' },
      { ...sorted[sorted.length - 1], tier: 'premium' },
    ];
  }

  return { materials, hardware };
}
