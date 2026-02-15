import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  /* ── list (own projects) ── */
  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: {
        rooms: {
          include: { roomType: true, _count: { select: { products: true } } },
        },
        _count: { select: { calculations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ── single ── */
  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            roomType: true,
            products: { include: { productType: true } },
          },
        },
        calculations: true,
      },
    });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId)
      throw new ForbiddenException('Нет доступа к проекту');
    return project;
  }

  /* ── create ── */
  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: { userId, name: dto.name, clientData: dto.clientData },
    });
  }

  /* ── update ── */
  async update(id: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.ensureOwner(id, userId);
    return this.prisma.project.update({
      where: { id: project.id },
      data: { ...dto },
    });
  }

  /* ── delete ── */
  async remove(id: string, userId: string) {
    await this.ensureOwner(id, userId);
    return this.prisma.project.delete({ where: { id } });
  }

  /* ── duplicate ── */
  async duplicate(id: string, userId: string) {
    const src = await this.findForDuplicate(id, userId);

    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.project.create({
        data: {
          userId,
          name: `${src.name} (копия)`,
          clientData: src.clientData,
        },
      });

      for (const room of src.rooms) {
        const newRoom = await tx.room.create({
          data: {
            projectId: copy.id,
            roomTypeId: room.roomTypeId,
          },
        });

        for (const product of room.products) {
          const newProduct = await tx.product.create({
            data: {
              roomId: newRoom.id,
              productTypeId: product.productTypeId,
              width: product.width,
              height: product.height,
              depth: product.depth,
              bodyMaterialId: product.bodyMaterialId,
              sectionsEnabled: product.sectionsEnabled,
              backWallEnabled: product.backWallEnabled,
              backWallMaterialId: product.backWallMaterialId,
              partitionsEnabled: product.partitionsEnabled,
              shelvesEnabled: product.shelvesEnabled,
              facadesEnabled: product.facadesEnabled,
              falseFacadesEnabled: product.falseFacadesEnabled,
              falseFacadeQty: product.falseFacadeQty,
              falseFacadeMaterialId: product.falseFacadeMaterialId,
              drawersEnabled: product.drawersEnabled,
              mezzanineEnabled: product.mezzanineEnabled,
              countertopEnabled: product.countertopEnabled,
              extrasEnabled: product.extrasEnabled,
            },
          });

          /* sub-components */
          for (const sec of product.sections) {
            await tx.productSection.create({
              data: { productId: newProduct.id, qty: sec.qty },
            });
          }
          for (const part of product.partitions) {
            await tx.productPartition.create({
              data: {
                productId: newProduct.id,
                height: part.height,
                qty: part.qty,
              },
            });
          }
          for (const sh of product.shelves) {
            await tx.productShelf.create({
              data: { productId: newProduct.id, width: sh.width, qty: sh.qty },
            });
          }
          for (const f of product.facades) {
            await tx.productFacade.create({
              data: {
                productId: newProduct.id,
                materialId: f.materialId,
                isLdsp: f.isLdsp,
                width: f.width,
                height: f.height,
                qty: f.qty,
                handleQty: f.handleQty,
              },
            });
          }
          for (const dr of product.drawers) {
            await tx.productDrawer.create({
              data: {
                productId: newProduct.id,
                width: dr.width,
                height: dr.height,
                qty: dr.qty,
                handleQty: dr.handleQty,
              },
            });
          }
          for (const ex of product.extras) {
            await tx.productExtra.create({
              data: {
                productId: newProduct.id,
                name: ex.name,
                price: ex.price,
              },
            });
          }
          if (product.mezzanine) {
            const mez = product.mezzanine;
            const newMez = await tx.productMezzanine.create({
              data: {
                productId: newProduct.id,
                height: mez.height,
                sectionsEnabled: mez.sectionsEnabled,
                partitionsEnabled: mez.partitionsEnabled,
                shelvesEnabled: mez.shelvesEnabled,
                facadesEnabled: mez.facadesEnabled,
                falseFacadesEnabled: mez.falseFacadesEnabled,
                falseFacadeQty: mez.falseFacadeQty,
                falseFacadeMaterialId: mez.falseFacadeMaterialId,
                drawersEnabled: mez.drawersEnabled,
                backWallEnabled: mez.backWallEnabled,
                backWallMaterialId: mez.backWallMaterialId,
              },
            });
            for (const sec of mez.sections) {
              await tx.productSection.create({
                data: {
                  productId: newProduct.id,
                  mezzanineId: newMez.id,
                  qty: sec.qty,
                },
              });
            }
            for (const part of mez.partitions) {
              await tx.productPartition.create({
                data: {
                  productId: newProduct.id,
                  mezzanineId: newMez.id,
                  height: part.height,
                  qty: part.qty,
                },
              });
            }
            for (const sh of mez.shelves) {
              await tx.productShelf.create({
                data: {
                  productId: newProduct.id,
                  mezzanineId: newMez.id,
                  width: sh.width,
                  qty: sh.qty,
                },
              });
            }
            for (const f of mez.facades) {
              await tx.productFacade.create({
                data: {
                  productId: newProduct.id,
                  mezzanineId: newMez.id,
                  materialId: f.materialId,
                  isLdsp: f.isLdsp,
                  width: f.width,
                  height: f.height,
                  qty: f.qty,
                  handleQty: f.handleQty,
                },
              });
            }
            for (const dr of mez.drawers) {
              await tx.productDrawer.create({
                data: {
                  productId: newProduct.id,
                  mezzanineId: newMez.id,
                  width: dr.width,
                  height: dr.height,
                  qty: dr.qty,
                  handleQty: dr.handleQty,
                },
              });
            }
          }
          if (product.countertop) {
            const ct = product.countertop;
            await tx.productCountertop.create({
              data: {
                productId: newProduct.id,
                materialId: ct.materialId,
                isLdsp: ct.isLdsp,
                width: ct.width,
                depth: ct.depth,
                apronEnabled: ct.apronEnabled,
                apronMaterialId: ct.apronMaterialId,
                apronIsLdsp: ct.apronIsLdsp,
                apronWidth: ct.apronWidth,
                apronHeight: ct.apronHeight,
              },
            });
          }
        }
      }

      return copy;
    });
  }

  /* ── helper: find for duplicate with full sub-components ── */
  private async findForDuplicate(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            products: {
              include: {
                sections: true,
                partitions: true,
                shelves: true,
                facades: true,
                drawers: true,
                extras: true,
                mezzanine: {
                  include: {
                    sections: true,
                    partitions: true,
                    shelves: true,
                    facades: true,
                    drawers: true,
                  },
                },
                countertop: true,
              },
            },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId)
      throw new ForbiddenException('Нет доступа к проекту');
    return project;
  }

  /* ── helper ── */
  private async ensureOwner(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId)
      throw new ForbiddenException('Нет доступа к проекту');
    return project;
  }
}
