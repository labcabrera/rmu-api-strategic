import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { HttpExceptionFilter } from '../modules/shared/interfaces/http/http-exception.filter.js';

/** Comma-separated list, without blanks. */
export const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);

const IMPORT_ROUTES = /^\/v1\/(factions|strategic-games)\/[^/]+\/(character|faction)-imports\/?$/;

type ParsedRequest = Request & { _body?: boolean };

/**
 * Reads the JSON body of the import routes with its own limit: a larger body is a 413 `export-too-large`, and a body
 * that is not JSON a 400 `export-invalid-file`, both in the error format of the API. It marks the request as parsed,
 * as body-parser does, so the global parser skips it.
 */
function importBodyParser(limit: number) {
  return (req: ParsedRequest, res: Response, next: NextFunction) => {
    if (req._body || !(req.headers['content-type'] ?? '').includes('json')) {
      next();
      return;
    }
    const fail = (statusCode: number, error: string, code: string, message: string, details?: unknown) =>
      res
        .status(statusCode)
        .json({ statusCode, error, code, message, ...(details ? { details } : {}), timestamp: new Date().toISOString(), path: req.path });
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    req.on('data', (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > limit) {
        done = true;
        req.removeAllListeners('data');
        req.resume();
        fail(413, 'PayloadTooLargeError', 'export-too-large', `The file is larger than ${limit} bytes`, { maxBytes: limit });
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        req.body = text.length > 0 ? (JSON.parse(text) as unknown) : {};
      } catch {
        fail(400, 'ValidationError', 'export-invalid-file', 'The file is not valid JSON');
        return;
      }
      req._body = true;
      next();
    });
    req.on('error', (error: Error) => {
      if (done) return;
      done = true;
      next(error);
    });
  };
}

/**
 * The HTTP setup shared by main.ts and the e2e suite (spec 018): client IPs from the proxy, security headers, CORS
 * only for the configured origins, validation and the error format.
 */
export function configureHttp(app: NestExpressApplication) {
  const config = app.get(ConfigService);
  // Behind Caddy the client is the first untrusted address in X-Forwarded-For, which the throttler counts.
  app.set('trust proxy', config.get<string>('RMU_TRUST_PROXY'));
  // The Swagger UI pages run their own scripts, so only /api-docs goes without a Content-Security-Policy.
  const apiHeaders = helmet();
  const docsHeaders = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    (req.path.startsWith('/api-docs') ? docsHeaders : apiHeaders)(req, res, next),
  );
  // Browsers reach the API through the gateway on the same origin: without a list there is no CORS at all.
  const origins = splitList(config.get<string>('RMU_CORS_ORIGINS'));
  if (origins.length > 0) app.enableCors({ origin: origins });
  app.enableShutdownHooks();
  // Export files of spec 024 go above the 100 KB of the global JSON parser. Mounted before it, this parser reads the
  // import routes first, and the global one then leaves the parsed body alone.
  app.use(IMPORT_ROUTES, importBodyParser(config.get<number>('RMU_STRATEGIC_IMPORT_MAX_BYTES') ?? 5 * 1024 * 1024));
  // Unknown body fields are dropped, not rejected (whitelist without forbidNonWhitelisted).
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
}
