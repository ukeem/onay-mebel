import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { AllExceptionsFilter } from '../src/filters/all-exceptions.filter';
import { UploadsController } from '../src/uploads/uploads.controller';
import {
  MAX_UPLOAD_SIZE,
  UploadsService,
} from '../src/uploads/uploads.service';

describe('upload request limits (e2e)', () => {
  let app: INestApplication<App>;
  const saveFile = jest.fn();

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        {
          provide: UploadsService,
          useValue: { saveFile, deleteFile: jest.fn() },
        },
      ],
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
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => saveFile.mockReset());

  it('returns 413 and never calls storage for an oversized file', async () => {
    const response = await request(app.getHttpServer())
      .post('/uploads')
      .attach('file', Buffer.alloc(MAX_UPLOAD_SIZE + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(413);
    expect(saveFile).not.toHaveBeenCalled();
  });

  it('returns 400 and never calls storage for an unexpected file field', async () => {
    const response = await request(app.getHttpServer())
      .post('/uploads')
      .attach('unexpected', Buffer.from('not-an-image'), {
        filename: 'small.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(saveFile).not.toHaveBeenCalled();
  });
});
