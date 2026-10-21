import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService security boundaries', () => {
  type UpsertMethod =
    | 'upsertSections'
    | 'upsertPartitions'
    | 'upsertShelves'
    | 'upsertFacades'
    | 'upsertDrawers'
    | 'upsertFalseFacades'
    | 'upsertCountertops'
    | 'upsertExtras';
  function createPrisma() {
    const emptyDelegate = () => ({
      findMany: jest.fn().mockResolvedValue([]),
    });
    const prisma = {
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 'product-user-a' }),
      },
      userMaterial: { findMany: jest.fn().mockResolvedValue([]) },
      userHardware: { findMany: jest.fn().mockResolvedValue([]) },
      userDefaults: { upsert: jest.fn().mockResolvedValue({}) },
      productSection: emptyDelegate(),
      productPartition: emptyDelegate(),
      productShelf: emptyDelegate(),
      productFacade: emptyDelegate(),
      productDrawer: emptyDelegate(),
      productFalseFacade: emptyDelegate(),
      productCountertop: emptyDelegate(),
      productExtra: emptyDelegate(),
      $transaction: jest.fn(),
    };
    return prisma;
  }

  const attacks: Array<[string, UpsertMethod, Record<string, unknown>]> = [
    [
      'sections',
      'upsertSections',
      { id: 'component-user-b', qty: 1, width: 1, height: 1, depth: 1 },
    ],
    [
      'partitions',
      'upsertPartitions',
      { id: 'component-user-b', qty: 1, height: 1, depth: 1 },
    ],
    [
      'shelves',
      'upsertShelves',
      { id: 'component-user-b', qty: 1, width: 1, depth: 1 },
    ],
    [
      'facades',
      'upsertFacades',
      { id: 'component-user-b', qty: 1, width: 1, height: 1 },
    ],
    [
      'drawers',
      'upsertDrawers',
      { id: 'component-user-b', qty: 1, width: 1, height: 1, depth: 1 },
    ],
    [
      'false facades',
      'upsertFalseFacades',
      { id: 'component-user-b', qty: 1, height: 1, depth: 1 },
    ],
    ['countertops', 'upsertCountertops', { id: 'component-user-b', width: 1 }],
    [
      'extras',
      'upsertExtras',
      { id: 'component-user-b', name: 'Extra', price: 1 },
    ],
  ];

  it('returns not found for a product outside the current tenant', async () => {
    const prisma = createPrisma();
    prisma.product.findFirst.mockResolvedValue(null);
    const service = new ProductsService(prisma as never);

    await expect(
      service.upsertExtras('product-user-b', [], 'user-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-user-b',
        room: { project: { userId: 'user-a' } },
      },
      select: { id: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(attacks)(
    'rejects user A substituting a user B %s ID',
    async (_label, method, item) => {
      const prisma = createPrisma();
      const service = new ProductsService(prisma as never);

      await expect(
        (
          service[method] as unknown as (
            productId: string,
            items: Record<string, unknown>[],
            userId: string,
          ) => Promise<unknown>
        )('product-user-a', [item], 'user-a'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects a custom material that is not available to the current user', async () => {
    const prisma = createPrisma();
    const service = new ProductsService(prisma as never);

    await expect(
      service.upsertPartitions(
        'product-user-a',
        [
          {
            qty: 1,
            height: 100,
            depth: 100,
            materialId: 'custom-material-user-b',
          },
        ],
        'user-a',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects custom hardware that is not available to the current user', async () => {
    const prisma = createPrisma();
    const service = new ProductsService(prisma as never);

    await expect(
      service.upsertShelves(
        'product-user-a',
        [
          {
            qty: 1,
            width: 100,
            depth: 100,
            holderHardwareId: 'custom-hardware-user-b',
          },
        ],
        'user-a',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps an enabled shared catalog material working', async () => {
    const prisma = createPrisma();
    prisma.userMaterial.findMany.mockResolvedValue([
      { materialId: 'shared-material' },
    ]);
    const tx = {
      productPartition: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'new-partition' }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (value: typeof tx) => unknown) => callback(tx),
    );
    const service = new ProductsService(prisma as never);

    await expect(
      service.upsertPartitions(
        'product-user-a',
        [
          {
            qty: 1,
            height: 100,
            depth: 100,
            materialId: 'shared-material',
          },
        ],
        'user-a',
      ),
    ).resolves.toEqual([{ id: 'new-partition' }]);
  });

  it('keeps enabled shared catalog hardware working', async () => {
    const prisma = createPrisma();
    prisma.userHardware.findMany.mockResolvedValue([
      { hardwareId: 'shared-hardware' },
    ]);
    const tx = {
      productShelf: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'new-shelf' }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (value: typeof tx) => unknown) => callback(tx),
    );
    const service = new ProductsService(prisma as never);

    await expect(
      service.upsertShelves(
        'product-user-a',
        [
          {
            qty: 1,
            width: 100,
            depth: 100,
            holderHardwareId: 'shared-hardware',
          },
        ],
        'user-a',
      ),
    ).resolves.toEqual([{ id: 'new-shelf' }]);
  });
});
