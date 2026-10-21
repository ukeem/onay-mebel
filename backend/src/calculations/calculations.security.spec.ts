import * as fs from 'fs';
import { CalculationsService } from './calculations.service';
import { isBoundedSnapshot } from './dto/snapshot-limits';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('commercial proposal security', () => {
  const attack = '</script><script>window.attackMarker=1</script>';

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('keeps HTML, attribute, script and URL payloads inert', () => {
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
    const html = service.generateProposal(data, {
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

  it('keeps a canonical uploaded logo in the generated document', () => {
    jest.mocked(fs.existsSync).mockReturnValue(true);
    jest.mocked(fs.statSync).mockReturnValue({ size: 3 } as fs.Stats);
    jest.mocked(fs.readFileSync).mockReturnValue(Buffer.from([1, 2, 3]));
    const service = new CalculationsService({} as never, {} as never);

    const html = service.generateProposal(
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

    expect(html).toContain('src="data:image/webp;base64,AQID"');
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
});
