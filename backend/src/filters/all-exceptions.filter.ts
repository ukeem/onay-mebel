import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Глобальный фильтр ошибок:
 * - в production скрывает stack traces и внутренние детали
 * - логирует полную ошибку серверно
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isProduction = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = exceptionResponse;
      }
    } else if (isMulterError(exception)) {
      status =
        exception.code === 'LIMIT_FILE_SIZE'
          ? HttpStatus.PAYLOAD_TOO_LARGE
          : HttpStatus.BAD_REQUEST;
      message = {
        statusCode: status,
        message:
          status === HttpStatus.PAYLOAD_TOO_LARGE
            ? 'Файл превышает допустимый лимит'
            : 'Некорректный multipart-запрос',
      };
    } else if (isHttpParserError(exception)) {
      status = exception.status;
      message = {
        statusCode: status,
        message:
          status === HttpStatus.PAYLOAD_TOO_LARGE
            ? 'Размер запроса превышает допустимый лимит'
            : 'Некорректный запрос',
      };
    } else {
      // Unexpected error — log full details
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );

      if (!isProduction && exception instanceof Error) {
        message = {
          statusCode: status,
          message: exception.message,
          stack: exception.stack,
        };
      }
    }

    response
      .status(status)
      .json(
        typeof message === 'object' ? message : { statusCode: status, message },
      );
  }
}

function isMulterError(
  exception: unknown,
): exception is { name: 'MulterError'; code: string } {
  return (
    exception instanceof Error &&
    exception.name === 'MulterError' &&
    'code' in exception &&
    typeof (exception as { code?: unknown }).code === 'string'
  );
}

function isHttpParserError(
  exception: unknown,
): exception is { status: number } {
  if (!exception || typeof exception !== 'object' || !('status' in exception)) {
    return false;
  }
  const status = (exception as { status?: unknown }).status;
  return typeof status === 'number' && status >= 400 && status < 500;
}
