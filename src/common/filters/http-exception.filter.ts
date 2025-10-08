import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = exceptionResponse;
      } else {
        message = exception.message;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    // Solo log para errores críticos (500+) o errores no controlados
    if (status >= 500) {
      this.logger.error(
        `Critical HTTP Exception: ${status} - ${request.method} ${request.url} - ${typeof message === 'string' ? message : JSON.stringify(message)}`
      );
    }

    // Respuesta limpia al cliente
    const errorResponse = {
      success: false,
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message || 'An error occurred',
      error: typeof message === 'object' && (message as any).error ? (message as any).error : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}