import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

/* ================================================================
   CALCULATION ENGINE
   Три уровня цен:
   - Чистая (материалы + услуги, себестоимость)
   - Цеховая (чистая + сборка%)
   - Рыночная (цеховая * коэф ИЛИ цеховая + фикс наценка)
   ================================================================ */

@Injectable()
export class CalculationsService {
  constructor(private prisma: PrismaService) {}

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
                    backWallMaterial: true,
                    falseFacadeMaterial: true,
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
    let totalBodySheets = 0;
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
        totalBodySheets += pr.bodySheets;
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

    /* ═══ Market price (for % calculations) ═══ */
    const marketPrice = (productsSum + workshopTotal) * 2;

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

    if (profitType === 'COEF') {
      const base = (productsSum + workshopTotal) * profitValue;
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
      for (const [typeName, items] of Object.entries(
        tierPrices.materials as Record<string, any[]>,
      )) {
        const tierItem = items.find((i: any) => i.tier === tier);
        if (tierItem) tierMatPrice.set(typeName, tierItem.price);
      }
      const tierHwPrice = new Map<string, number>();
      for (const [typeName, items] of Object.entries(
        tierPrices.hardware as Record<string, any[]>,
      )) {
        const tierItem = items.find((i: any) => i.tier === tier);
        if (tierItem) tierHwPrice.set(typeName, tierItem.price);
      }

      // Recalculate productsSum for this tier
      let tierProductsSum = 0;
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

      const tMarketPrice = (tierProductsSum + tWorkshopTotal) * 2;
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

      if (profitType === 'COEF') {
        const base = (tierProductsSum + tWorkshopTotal) * profitValue;
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
      data: { data: data as any },
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
  generateProposal(data: any): string {
    const d = data;
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
      for (const room of rooms) {
        for (const pr of room.products) {
          const key = `${room.roomType}::${pr.productType}::${pr.dimensions}::${totalProductCount}`;
          let pSum = 0;
          for (const det of pr.details ?? []) {
            if (det.enabled !== false) {
              pSum += det.qty * det.unitPrice;
            }
          }
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

      let totalForClient: number;
      if (profitType === 'COEF') {
        const base = (productsSum + workshopTotal) * profitValue;
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
          let roomTotalBeforeDiscount = 0;
          let roomTotal = 0;

          for (const pr of room.products) {
            const key = `${room.roomType}::${pr.productType}::${pr.dimensions}::${productIdx}`;
            const pt = tr.productTotals.get(key);
            const finalPrice = pt?.finalPrice ?? 0;
            const finalPriceBeforeDiscount = pt?.finalPriceBeforeDiscount ?? 0;
            roomTotalBeforeDiscount += finalPriceBeforeDiscount;
            roomTotal += finalPrice;
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

              const priceHtml =
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
        const discountBadge =
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

        return `
        <div id="tab-${tier}" class="tab-content" style="display:${idx === 0 ? 'block' : 'none'};">
          <div class="tier-title">${tierLabels[tier]}</div>
          ${roomsHtml}
          <div class="tier-total">
            <div class="total-inner-bar">
              <span class="total-label">Итого</span>
              ${grandTotalHtml}
            </div>
          </div>
        </div>
        <div id="total-${tier}" class="total-bar" style="display:${idx === 0 ? 'flex' : 'none'};">
          <div class="total-inner-bar">
            <span class="total-label">Итого</span>
            ${grandTotalHtml}
          </div>
        </div>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Коммерческое предложение — ${d.projectName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      background: #fff;
      padding: 0;
      margin: 0;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .page-wrapper {
      max-width: 800px;
      margin: 0 auto;
      padding: 16px 16px 72px;
    }

    /* Header */
    .kp-header {
      text-align: center;
      margin-bottom: 20px;
      padding: 20px 16px 16px;
    }
    .kp-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .kp-project {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .kp-meta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .kp-meta-item {
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .kp-meta-item svg { width: 13px; height: 13px; }

    /* Tabs */
    .tabs-wrap {
      position: sticky;
      top: 0;
      z-index: 10;
      margin: 0 -16px 16px;
      padding: 6px 16px;
      background: #fff;
    }
    .tabs-inner {
      display: flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 10px;
    }
    .tab-btn {
      flex: 1;
      padding: 8px 6px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      background: transparent;
      color: #94a3b8;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: center;
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: #64748b;
    }
    .tab-btn.active {
      background: #fff !important;
      color: #0f172a !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    /* Room */
    .room-block {
      margin-bottom: 16px;
    }
    .room-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0 6px;
      margin-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .room-icon {
      width: 16px; height: 16px;
      color: #94a3b8;
      flex-shrink: 0;
    }
    .room-name {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* Product */
    .product-block {
      margin-bottom: 10px;
      background: #fafbfc;
      border-radius: 12px;
      padding: 14px 16px;
      border: 1px solid #f1f5f9;
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
      color: #1e293b;
    }
    .product-price {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
    }

    /* Details list */
    .details-list {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #e2e8f0;
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
      background: #cbd5e1;
      flex-shrink: 0;
      margin-top: 6px;
    }
    .detail-name {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    .brand { color: #94a3b8; font-size: 11px; }

    /* Prices */
    .price-current {
      font-weight: 700;
      color: #0f172a;
    }
    .price-old {
      text-decoration: line-through;
      color: #94a3b8;
      font-size: 13px;
      margin-right: 6px;
    }
    .price-new {
      font-weight: 700;
      color: #059669;
    }

    /* Total bar — fixed bottom */
    .total-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 20px;
      background: #fff;
      border-top: 1px solid #e2e8f0;
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
      color: #64748b;
    }
    .total-prices {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .grand-old {
      font-size: 13px;
      text-decoration: line-through;
      color: #94a3b8;
      white-space: nowrap;
    }
    .grand-new {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      white-space: nowrap;
      letter-spacing: -0.02em;
    }
    .discount-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      background: #ecfdf5;
      color: #059669;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
    }

    /* Tier title (print only) */
    .tier-title {
      display: none;
    }
    /* Tier total (print only, inline) */
    .tier-total {
      display: none;
    }

    /* Print btn */
    .print-btn {
      display: none;
    }

    @media print {
      body { background: #fff; }
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
    }
    @media (max-width: 640px) {
      .page-wrapper { padding: 12px 12px 68px; }
      .kp-header { padding: 16px 12px 12px; }
      .kp-project { font-size: 16px; }
      .tabs-wrap { margin: 0 -12px 12px; padding: 4px 12px; }
      .product-block { padding: 12px 14px; }
      .total-bar { padding: 10px 16px; }
      .grand-new { font-size: 18px; }
      .details-list { columns: 1; }
    }
  </style>
</head>
<body>
<div class="page-wrapper">
  <div class="kp-header">
    <div class="kp-title">Коммерческое предложение</div>
    <div class="kp-project">${d.projectName}</div>
    <div class="kp-meta">
      ${d.clientData ? `<span class="kp-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${d.clientData}</span>` : ''}
      <span class="kp-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${new Date(d.calculatedAt).toLocaleDateString('ru-RU')}</span>
    </div>
  </div>

  ${enabledTiers.length >= 1 ? `<div class="tabs-wrap no-print"><div class="tabs-inner">${tabButtonsHtml}</div></div>` : ''}

  ${tabContentsHtml}

  <button onclick="window.print()" class="print-btn no-print">Печать / PDF</button>
</div>

  <script>
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
          bodyAreaMm2 += D * part.height * part.qty;
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
          bodyAreaMm2 += f.width * f.height * f.qty;
        }
      }
    }

    /* ═══ Mezzanine body ЛДСП ═══ */
    let mezTotalShelfQty = 0;
    if (product.mezzanineEnabled && product.mezzanine) {
      const mez = product.mezzanine;
      const mezH = mez.height;

      // top + bottom
      bodyAreaMm2 += W * D * 2;

      // sides from sections or basic
      if (mez.sectionsEnabled && mez.sections?.length > 0) {
        for (const sec of mez.sections) {
          bodyAreaMm2 += mezH * D * 2 * sec.qty;
        }
      } else {
        bodyAreaMm2 += D * mezH * 2;
      }

      if (mez.partitionsEnabled && mez.partitions) {
        for (const part of mez.partitions) {
          bodyAreaMm2 += D * part.height * part.qty;
        }
      }

      if (mez.shelvesEnabled && mez.shelves) {
        for (const sh of mez.shelves) {
          bodyAreaMm2 += sh.width * D * sh.qty;
          mezTotalShelfQty += sh.qty;
        }
      }

      if (mez.drawersEnabled && mez.drawers) {
        for (const dr of mez.drawers) {
          bodyAreaMm2 +=
            (dr.width * dr.height * 2 + dr.width * D + dr.height * D * 2) *
            dr.qty;
        }
      }

      // Mezzanine ЛДСП facades with same body material
      if (mez.facadesEnabled && mez.facades) {
        for (const f of mez.facades) {
          if (f.isLdsp) {
            bodyAreaMm2 += f.width * f.height * f.qty;
          }
        }
      }
    }

    /* Calculate body sheets */
    const bodyAreaM2 = bodyAreaMm2 / 1_000_000;
    const bodySheets = sheetArea > 0 ? Math.ceil(bodyAreaM2 / sheetArea) : 0;
    const bodyCost = bodySheets * bodyPrice;
    materialCost += bodyCost;
    details.push({
      id: 'body',
      type: 'material',
      label: 'Корпус ЛДСП',
      materialId: bodyMatId,
      materialType: 'ЛДСП',
      brand: bodyMaterial?.brand ?? '',
      qty: bodySheets,
      unit: 'листов',
      unitPrice: bodyPrice,
      cost: Math.round(bodyCost),
      enabled: true,
    });

    /* ═══ ЛДСП facades with DIFFERENT material ═══ */
    let otherLdspSheets = 0;
    const diffLdspMap = new Map<string, number>();
    const collectDiffLdsp = (facades: any[]) => {
      if (!facades) return;
      for (const f of facades) {
        if (f.materialId && f.material?.materialType?.name === 'ЛДСП') {
          diffLdspMap.set(
            f.materialId,
            (diffLdspMap.get(f.materialId) ?? 0) + f.width * f.height * f.qty,
          );
        }
      }
    };
    if (product.facadesEnabled)
      collectDiffLdsp(product.facades?.filter((f: any) => !f.mezzanineId));
    if (product.mezzanineEnabled && product.mezzanine?.facadesEnabled)
      collectDiffLdsp(product.mezzanine?.facades);

    for (const [matId, areaMm2] of diffLdspMap) {
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
        id: `facade-ldsp-${matId}`,
        type: 'material',
        label: `Фасад ЛДСП (${mat?.brand ?? ''})`,
        materialId: matId,
        materialType: 'ЛДСП',
        brand: mat?.brand ?? '',
        qty: sheets,
        unit: 'листов',
        unitPrice: price,
        cost: Math.round(cost),
        enabled: true,
      });
    }

    /* ═══ Non-ЛДСП facades ═══ */
    const calcNonLdspFacades = (facades: any[]) => {
      if (!facades) return;
      for (const f of facades) {
        if (!f.isLdsp && f.materialId) {
          const mat = findMat(product, f.materialId);
          const price = matPrice.get(f.materialId) ?? 0;
          const calcType = mat?.calcType ?? 'SQM';
          const area = (f.width / 1000) * (f.height / 1000) * f.qty;
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
          details.push({
            id: `facade-${f.materialId}-${f.width}x${f.height}`,
            type: 'material',
            label: `Фасад ${mat?.materialType?.name ?? ''} ${f.width}×${f.height}`,
            materialId: f.materialId,
            materialType: mat?.materialType?.name ?? '',
            brand: mat?.brand ?? '',
            qty: f.qty,
            unit: 'шт.',
            unitPrice: Math.round(cost / f.qty),
            cost: Math.round(cost),
            enabled: true,
          });
        }
      }
    };
    if (product.facadesEnabled)
      calcNonLdspFacades(product.facades?.filter((f: any) => !f.mezzanineId));
    if (product.mezzanineEnabled && product.mezzanine?.facadesEnabled)
      calcNonLdspFacades(product.mezzanine?.facades);

    /* ═══ Back wall ═══ */
    if (product.backWallEnabled && product.backWallMaterialId) {
      const bwMat = findMat(product, product.backWallMaterialId);
      const bwPrice = matPrice.get(product.backWallMaterialId) ?? 0;
      const bwCalc = bwMat?.calcType ?? 'SHEET';
      let bwCost = 0;
      if (bwCalc === 'SHEET') {
        const sL = bwMat?.length ?? 2800;
        const sW2 = bwMat?.width ?? 2070;
        const sArea = (sL / 1000) * (sW2 / 1000);
        const area = (W / 1000) * (mainH / 1000);
        bwCost = sArea > 0 ? Math.ceil(area / sArea) * bwPrice : 0;
      } else {
        bwCost = (W / 1000) * (mainH / 1000) * bwPrice;
      }
      materialCost += bwCost;
      details.push({
        id: 'backwall',
        type: 'material',
        label: 'Задняя стенка',
        materialId: product.backWallMaterialId,
        materialType: bwMat?.materialType?.name ?? 'ХДФ',
        brand: bwMat?.brand ?? '',
        qty: 1,
        unit: 'шт.',
        unitPrice: Math.round(bwCost),
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
      let bwCost = 0;
      if (bwCalc === 'SHEET') {
        const sL = bwMat?.length ?? 2800;
        const sW2 = bwMat?.width ?? 2070;
        const sArea = (sL / 1000) * (sW2 / 1000);
        const area = (W / 1000) * (mez.height / 1000);
        bwCost = sArea > 0 ? Math.ceil(area / sArea) * bwPrice : 0;
      } else {
        bwCost = (W / 1000) * (mez.height / 1000) * bwPrice;
      }
      materialCost += bwCost;
      details.push({
        id: 'mez-backwall',
        type: 'material',
        label: 'Антресоль задняя стенка',
        materialId: mez.backWallMaterialId,
        materialType: bwMat?.materialType?.name ?? 'ХДФ',
        brand: bwMat?.brand ?? '',
        qty: 1,
        unit: 'шт.',
        unitPrice: Math.round(bwCost),
        cost: Math.round(bwCost),
        enabled: true,
      });
    }

    /* ═══ False facades ═══ */
    if (
      product.falseFacadesEnabled &&
      product.falseFacadeQty > 0 &&
      product.falseFacadeMaterialId
    ) {
      const ffMat = findMat(product, product.falseFacadeMaterialId);
      const ffPrice = matPrice.get(product.falseFacadeMaterialId) ?? 0;
      const area = (D / 1000) * (H / 1000) * product.falseFacadeQty;
      const ffCost = area * ffPrice;
      materialCost += ffCost;
      details.push({
        id: 'false-facade',
        type: 'material',
        label: `Фальш-фасады (${product.falseFacadeQty} шт.)`,
        materialId: product.falseFacadeMaterialId,
        materialType: ffMat?.materialType?.name ?? '',
        brand: ffMat?.brand ?? '',
        qty: product.falseFacadeQty,
        unit: 'шт.',
        unitPrice: Math.round(ffCost / product.falseFacadeQty),
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
        const area = (D / 1000) * (mez.height / 1000) * mez.falseFacadeQty;
        const ffCost = area * ffPrice;
        materialCost += ffCost;
        details.push({
          id: 'mez-false-facade',
          type: 'material',
          label: `Антресоль фальш-фасады (${mez.falseFacadeQty})`,
          materialId: mez.falseFacadeMaterialId,
          materialType: mezFfMat?.materialType?.name ?? '',
          brand: mezFfMat?.brand ?? '',
          qty: mez.falseFacadeQty,
          unit: 'шт.',
          unitPrice: Math.round(ffCost / mez.falseFacadeQty),
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
        if (ctCalc === 'SHEET') {
          // Per TZ: count sheets by length only
          const sL = ctMat?.length ?? 2800;
          const sheets = Math.ceil(ct.width / sL);
          ctCost = sheets * ctPrice;
        } else if (ctCalc === 'SQM') {
          ctCost = (ct.width / 1000) * (ct.depth / 1000) * ctPrice;
        } else {
          ctCost = (ct.width / 1000) * ctPrice;
        }
        materialCost += ctCost;
        details.push({
          id: 'countertop',
          type: 'material',
          label: 'Столешница',
          materialId: ct.materialId,
          materialType: ctMat?.materialType?.name ?? '',
          brand: ctMat?.brand ?? '',
          qty: 1,
          unit: 'шт.',
          unitPrice: Math.round(ctCost),
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
        if (apCalc === 'SHEET') {
          const sL = apMat?.length ?? 2800;
          const sheets = Math.ceil(apW / sL);
          apCost = sheets * apPrice;
        } else if (apCalc === 'SQM') {
          apCost = (apW / 1000) * (apH / 1000) * apPrice;
        } else {
          apCost = (apW / 1000) * apPrice;
        }
        materialCost += apCost;
        details.push({
          id: 'apron',
          type: 'material',
          label: 'Фартук',
          materialId: ct.apronMaterialId,
          materialType: apMat?.materialType?.name ?? '',
          brand: apMat?.brand ?? '',
          qty: 1,
          unit: 'шт.',
          unitPrice: Math.round(apCost),
          cost: Math.round(apCost),
          enabled: true,
        });
      }
    }

    /* ═══════════ HARDWARE ═══════════ */

    /* Hinges: Qty = Σ((2 + max(0, ceil((H_facade - 700) / 500))) × qty) */
    let totalHinges = 0;
    const calcHinges = (facades: any[]) => {
      if (!facades) return;
      for (const f of facades) {
        const perFacade = 2 + Math.max(0, Math.ceil((f.height - 700) / 500));
        totalHinges += perFacade * f.qty;
      }
    };
    if (product.facadesEnabled)
      calcHinges(product.facades?.filter((f: any) => !f.mezzanineId));
    if (product.mezzanineEnabled && product.mezzanine?.facadesEnabled)
      calcHinges(product.mezzanine?.facades);
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
        2 * (2 + Math.max(0, Math.ceil((wSection - 700) / 500)));
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
    // TZ: (sheet_length + sheet_width) × body_sheets — rough estimate
    const totalSheets = bodySheets + otherLdspSheets;
    const edgeLm = ((sheetL + sheetW) / 1000) * bodySheets;

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
      totalSheets,
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
