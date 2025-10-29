import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RawBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Capturar el rawBody antes de que NestJS lo procese
    if (request.body && typeof request.body === 'object') {
      // Crear una copia del body original
      request.rawBody = { ...request.body };
      console.log('🔍 RawBodyInterceptor - Captured rawBody:', JSON.stringify(request.rawBody, null, 2));
    }
    
    return next.handle();
  }
}
