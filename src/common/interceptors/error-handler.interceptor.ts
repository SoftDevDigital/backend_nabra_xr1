import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorHandlerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorHandlerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Solo log para errores críticos (500+) o errores no controlados
        if (error.status >= 500 || !error.status) {
          this.logger.error(
            `Critical error in ${context.getClass().name}.${context.getHandler().name}: ${error.message}`
          );
        }

        // Re-lanzar el error sin modificar su estructura
        return throwError(() => error);
      }),
    );
  }
}
