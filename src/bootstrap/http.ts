import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DomainExceptionFilter } from '../modules/shared/interfaces/http/domain-exception.filter.js';

/** The HTTP setup shared by main.ts and the e2e suite: CORS, validation and the error filter. */
export function configureHttp(app: NestExpressApplication) {
  app.enableCors();
  app.enableShutdownHooks();
  // Unknown body fields are dropped, not rejected (whitelist without forbidNonWhitelisted).
  app.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true }, whitelist: true }));
  app.useGlobalFilters(new DomainExceptionFilter());
}
