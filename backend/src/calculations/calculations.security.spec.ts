import { PayloadTooLargeException } from '@nestjs/common';
import * as fs from 'fs';
import {
  CalculationsService,
  PROPOSAL_HTML_BUDGET_BYTES,
  PROPOSAL_IMAGE_BUDGET_BYTES,
} from './calculations.service';
import { isBoundedSnapshot, SNAPSHOT_MAX_BYTES } from './dto/snapshot-limits';

describe('commercial proposal security', () => {
  const attack = '</script><script>window.attackMarker=1</script>';

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('keeps HTML, attribute, script and URL payloads inert', async () => {
    const service = new CalculationsService({} as never, {} as never);
    const data = {
      projectName: `Проект ${attack}`,
      clientData: `Клиент " onmouseover="window.attackMarker=2`,
      rooms: [
        {
          roomType: '<img src=x onerror=window.attackMarker=3>',
          products: [
            {
              productType: '<svg onload=window.attackMarker=4>',
              dimensions: '1x1',
              details: [
                {
                  enabled: true,
                  type: 'material',
                  label: attack,
                  brand: '"><img src=x onerror=window.attackMarker=5>',
                  qty: 1,
                  unitPrice: 1,
                  cost: 1,
                  image: 'javascript:alert(1)',
                },
              ],
            },
          ],
        },
      ],
      enabledTiers: ['standard'],
      totals: { reserve: 0, discount: 0 },
      calculatedAt: '2026-10-21T00:00:00.000Z',
    };
    const html = await service.generateProposal(data, {
      companyInfo: {
        name: '" autofocus onfocus=window.attackMarker=6 x="',
        logo: 'javascript:alert(2)',
        description: attack,
        descriptionKz: `Қазақша ${attack}`,
      },
      contacts: [
        { type: 'EMAIL', value: 'javascript:alert(3)" onclick="attack()' },
      ],
      paymentStages: [{ stageNumber: 1, percentage: 50, note: attack }],
    });

    expect(html).not.toContain(attack);
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('src="javascript:');
    expect(html).not.toContain('<img src=x onerror=window.attackMarker');
    expect(html).toContain('&lt;/script&gt;');
    expect(html).toContain('Қазақша');
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'none'");
  });

  it('keeps a canonical uploaded logo in the generated document', async () => {
    jest
      .spyOn(fs.promises, 'lstat')
      .mockResolvedValue({ size: 3, isFile: () => true } as fs.Stats);
    jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from([1, 2, 3]));
    const service = new CalculationsService({} as never, {} as never);

    const html = await service.generateProposal(
      {
        projectName: 'Ас үй',
        rooms: [],
        enabledTiers: ['standard'],
        totals: { reserve: 0, discount: 0 },
        calculatedAt: '2026-10-21T00:00:00.000Z',
      },
      {
        companyInfo: {
          name: 'Onay Mebel',
          logo: '/uploads/11111111-1111-4111-8111-111111111111.webp',
        },
      },
    );

    expect(html).toContain('"i0":"data:image/webp;base64,AQID"');
    expect(html).toContain('data-proposal-image="i0"');
  });

  it('reads and embeds one unique image once for twenty references', async () => {
    const oneMiB = Buffer.alloc(1024 * 1024, 7);
    const lstat = jest.spyOn(fs.promises, 'lstat').mockResolvedValue({
      size: oneMiB.length,
      isFile: () => true,
    } as fs.Stats);
    const readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(oneMiB);
    const image = '/uploads/11111111-1111-4111-8111-111111111111.webp';
    const details = Array.from({ length: 20 }, (_, index) => ({
      enabled: true,
      type: 'material',
      label: `Материал ${index}`,
      qty: 1,
      unitPrice: 1,
      cost: 1,
      image,
    }));
    const service = new CalculationsService({} as never, {} as never);

    const html = await service.generateProposal({
      projectName: 'Ас үй',
      rooms: [
        {
          roomType: 'Кухня',
          products: [{ productType: 'Шкаф', dimensions: '1x1', details }],
        },
      ],
      enabledTiers: ['standard'],
      totals: { reserve: 0, discount: 0 },
      calculatedAt: '2026-10-21T00:00:00.000Z',
    });

    expect(lstat).toHaveBeenCalledTimes(1);
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(html.match(/data:image\/webp;base64/g)).toHaveLength(1);
    expect(html.match(/data-proposal-image="i0"/g)).toHaveLength(20);
    expect(Buffer.byteLength(html)).toBeLessThan(2 * 1024 * 1024);
  });

  it('does not load images referenced only by disabled details', async () => {
    const lstat = jest.spyOn(fs.promises, 'lstat');
    const readFile = jest.spyOn(fs.promises, 'readFile');
    const service = new CalculationsService({} as never, {} as never);

    const html = await service.generateProposal({
      projectName: 'Disabled image',
      rooms: [
        {
          roomType: 'Кухня',
          products: [
            {
              productType: 'Шкаф',
              dimensions: '1x1',
              details: [
                {
                  enabled: false,
                  type: 'material',
                  label: 'Скрытый материал',
                  image: '/uploads/11111111-1111-4111-8111-111111111111.webp',
                },
              ],
            },
          ],
        },
      ],
      enabledTiers: ['standard'],
      totals: { reserve: 0, discount: 0 },
      calculatedAt: '2026-10-21T00:00:00.000Z',
    });

    expect(lstat).not.toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalled();
    expect(html).not.toContain('Скрытый материал');
    expect(html).not.toContain('data:image/webp;base64');
  });

  it('degrades later unique images before exceeding the shared image budget', async () => {
    const imageSize = 4 * 1024 * 1024;
    jest.spyOn(fs.promises, 'lstat').mockResolvedValue({
      size: imageSize,
      isFile: () => true,
    } as fs.Stats);
    const readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.alloc(imageSize, 1));
    const service = new CalculationsService({} as never, {} as never);

    const html = await service.generateProposal(
      {
        projectName: 'Budget',
        rooms: [
          {
            roomType: 'Кухня',
            products: [
              {
                productType: 'Шкаф',
                dimensions: '1x1',
                image: '/uploads/22222222-2222-4222-8222-222222222222.webp',
                details: [],
              },
            ],
          },
        ],
        enabledTiers: ['standard'],
        totals: { reserve: 0, discount: 0 },
        calculatedAt: '2026-10-21T00:00:00.000Z',
      },
      {
        companyInfo: {
          name: 'Company',
          logo: '/uploads/11111111-1111-4111-8111-111111111111.webp',
        },
      },
    );

    expect(PROPOSAL_IMAGE_BUDGET_BYTES).toBe(6 * 1024 * 1024);
    expect(fs.promises.lstat).toHaveBeenCalledTimes(2);
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(html.match(/data:image\/webp;base64/g)).toHaveLength(1);
    expect(html).not.toContain('data-proposal-image="i1"');
    expect(Buffer.byteLength(html)).toBeLessThan(PROPOSAL_HTML_BUDGET_BYTES);
  });

  it('omits unreadable images and returns a bounded proposal', async () => {
    jest
      .spyOn(fs.promises, 'lstat')
      .mockResolvedValue({ size: 10, isFile: () => true } as fs.Stats);
    jest.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('EIO'));
    const service = new CalculationsService({} as never, {} as never);

    const html = await service.generateProposal(
      {
        projectName: 'No image',
        rooms: [],
        enabledTiers: ['standard'],
        totals: { reserve: 0, discount: 0 },
        calculatedAt: '2026-10-21T00:00:00.000Z',
      },
      {
        companyInfo: {
          name: 'Company',
          logo: '/uploads/11111111-1111-4111-8111-111111111111.webp',
        },
      },
    );

    expect(html).not.toContain('data:image/webp;base64');
    expect(Buffer.byteLength(html)).toBeLessThan(PROPOSAL_HTML_BUDGET_BYTES);
  });

  it('rejects an oversized final HTML response', async () => {
    const service = new CalculationsService({} as never, {} as never);
    await expect(
      service.generateProposal({
        projectName: 'x'.repeat(PROPOSAL_HTML_BUDGET_BYTES),
        rooms: [],
        enabledTiers: ['standard'],
        totals: { reserve: 0, discount: 0 },
        calculatedAt: '2026-10-21T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});

describe('calculation snapshot limits', () => {
  it('accepts a normal snapshot and rejects excessive arrays, strings and depth', () => {
    expect(
      isBoundedSnapshot({ rooms: [{ products: [] }], projectName: 'Ас үй' }),
    ).toBe(true);
    expect(isBoundedSnapshot({ items: new Array(201).fill(1) })).toBe(false);
    expect(isBoundedSnapshot({ text: 'x'.repeat(5001) })).toBe(false);

    let nested: Record<string, unknown> = {};
    const root = nested;
    for (let i = 0; i < 14; i += 1) {
      nested.next = {};
      nested = nested.next as Record<string, unknown>;
    }
    expect(isBoundedSnapshot(root)).toBe(false);
  });

  it('enforces UTF-8 bytes, node count, object keys and finite numbers', () => {
    const byteHeavy = {
      items: Array.from({ length: 200 }, () =>
        Object.fromEntries(
          Array.from({ length: 100 }, (_, index) => [
            `k${index}`,
            'я'.repeat(40),
          ]),
        ),
      ),
    };
    expect(Buffer.byteLength(JSON.stringify(byteHeavy))).toBeGreaterThan(
      SNAPSHOT_MAX_BYTES,
    );
    expect(isBoundedSnapshot(byteHeavy)).toBe(false);

    const withinNodeLimit = Object.fromEntries(
      Array.from({ length: 120 }, (_, index) => [
        `k${index}`,
        new Array(200).fill(1),
      ]),
    );
    const overNodeLimit = Object.fromEntries(
      Array.from({ length: 125 }, (_, index) => [
        `k${index}`,
        new Array(200).fill(1),
      ]),
    );
    expect(isBoundedSnapshot(withinNodeLimit)).toBe(true);
    expect(isBoundedSnapshot(overNodeLimit)).toBe(false);

    expect(
      isBoundedSnapshot(
        Object.fromEntries(
          Array.from({ length: 200 }, (_, index) => [`k${index}`, index]),
        ),
      ),
    ).toBe(true);
    expect(
      isBoundedSnapshot(
        Object.fromEntries(
          Array.from({ length: 201 }, (_, index) => [`k${index}`, index]),
        ),
      ),
    ).toBe(false);
    expect(isBoundedSnapshot({ value: Number.NaN })).toBe(false);
    expect(isBoundedSnapshot({ value: Number.POSITIVE_INFINITY })).toBe(false);
  });
});
