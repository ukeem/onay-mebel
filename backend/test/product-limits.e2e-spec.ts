import { ExecutionContext, INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { AllExceptionsFilter } from '../src/filters/all-exceptions.filter';
import { configureBodyParsers } from '../src/http-body-limits';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';

describe('product component array limits (e2e)', () => {
  let app: INestApplication<App>;
  const methods = {
    upsertSections: jest.fn(),
    upsertPartitions: jest.fn(),
    upsertShelves: jest.fn(),
    upsertFacades: jest.fn(),
    upsertDrawers: jest.fn(),
    upsertFalseFacades: jest.fn(),
    upsertCountertops: jest.fn(),
    upsertExtras: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: methods }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const httpRequest = context
            .switchToHttp()
            .getRequest<{ user?: { id: string } }>();
          httpRequest.user = { id: 'user-a' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    configureBodyParsers(app as NestExpressApplication);
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['sections', 'upsertSections'],
    ['partitions', 'upsertPartitions'],
    ['shelves', 'upsertShelves'],
    ['facades', 'upsertFacades'],
    ['drawers', 'upsertDrawers'],
    ['false-facades', 'upsertFalseFacades'],
    ['countertops', 'upsertCountertops'],
    ['extras', 'upsertExtras'],
  ] as const)(
    'rejects more than 100 %s before service execution',
    async (path, method) => {
      const response = await request(app.getHttpServer())
        .put(`/products/product-user-a/${path}`)
        .send(new Array(101).fill({}));

      expect(response.status).toBe(400);
      expect(methods[method]).not.toHaveBeenCalled();
    },
  );
});
