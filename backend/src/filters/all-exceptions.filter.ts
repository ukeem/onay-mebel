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
