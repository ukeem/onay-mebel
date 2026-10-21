import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';

export const DEFAULT_JSON_BODY_LIMIT_BYTES = 2 * 1024 * 1024;
export const MAX_JSON_BODY_LIMIT_BYTES = 2 * 1024 * 1024;

export function configureBodyParsers(
  app: NestExpressApplication,
  limitBytes = readBodyLimit(),
) {
  app.use(json({ limit: limitBytes }));
  app.use(
    urlencoded({
      limit: limitBytes,
      extended: true,
      parameterLimit: 1000,
    }),
  );
}

function readBodyLimit(): number {
  const parsed = Number(process.env.JSON_BODY_LIMIT_BYTES);
  return Number.isSafeInteger(parsed) &&
    parsed >= 1024 &&
    parsed <= MAX_JSON_BODY_LIMIT_BYTES
    ? parsed
    : DEFAULT_JSON_BODY_LIMIT_BYTES;
}
