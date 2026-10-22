import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from '../src/filters/all-exceptions.filter';
import { configureBodyParsers } from '../src/http-body-limits';

@Controller('body-limit')
class BodyLimitController {
  @Post()
  echo(@Body() body: unknown) {
    return body;
  }
}

describe('request body limits (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [BodyLimitController],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    configureBodyParsers(app as NestExpressApplication, 64 * 1024);
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns 413 before the controller receives oversized JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/body-limit')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ value: 'x'.repeat(70 * 1024) }));

    expect(response.status).toBe(413);
    const body = response.body as unknown as { message: string };
    expect(body.message).toBe('Размер запроса превышает допустимый лимит');
  });

  it('returns 400 for malformed JSON without terminating the process', async () => {
    const response = await request(app.getHttpServer())
      .post('/body-limit')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(400);
    const body = response.body as unknown as { message: string };
    expect(body.message).toBe('Unexpected end of JSON input');
  });

  it('accepts 1000 urlencoded parameters and rejects the 1001st', async () => {
    const atLimit = Array.from(
      { length: 1000 },
      (_, index) => `p${index}=1`,
    ).join('&');
    const accepted = await request(app.getHttpServer())
      .post('/body-limit')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(atLimit);
    expect(accepted.status).toBe(201);

    const overLimit = `${atLimit}&overflow=1`;
    const rejected = await request(app.getHttpServer())
      .post('/body-limit')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(overLimit);
    expect(rejected.status).toBe(413);
  });

  it('applies the byte limit to urlencoded bodies', async () => {
    const response = await request(app.getHttpServer())
      .post('/body-limit')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`value=${'x'.repeat(70 * 1024)}`);

    expect(response.status).toBe(413);
  });
});
