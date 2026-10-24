import { Injectable, Logger } from '@nestjs/common';
import { BadGatewayError, ValidationError } from '../../domain/errors/errors.js';

export interface HttpRequestOptions {
  /** Sent as `Authorization: Bearer <token>`. */
  token?: string;
  headers?: Record<string, string>;
}

/**
 * The HTTP status another API answered, on the error HttpClient throws for it. A caller that treats a status in a
 * special way (a 404 that means "absent") checks it with `upstreamStatus(error) === 404`.
 */
export interface UpstreamStatus {
  readonly upstreamStatus: number;
}

/** A 400 or 422 of another API: the request this API built from the client's data was rejected (answers 400). */
export class UpstreamValidationError extends ValidationError implements UpstreamStatus {
  constructor(
    message: string,
    public readonly upstreamStatus: number,
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, UpstreamValidationError.prototype);
  }
}

/** Any other non-2xx answer of another API (answers 502). */
export class UpstreamHttpError extends BadGatewayError implements UpstreamStatus {
  constructor(
    message: string,
    public readonly upstreamStatus: number,
  ) {
    super(message);
    this.name = 'BadGatewayError';
    Object.setPrototypeOf(this, UpstreamHttpError.prototype);
  }
}

/** The status another API answered, or undefined when the error is not an answer (network failure, other errors). */
export function upstreamStatus(error: unknown): number | undefined {
  return error instanceof UpstreamHttpError || error instanceof UpstreamValidationError ? error.upstreamStatus : undefined;
}

/**
 * The client of the other RMU APIs (spec 020, decision 5): JSON in and out over the global fetch of Node 24.
 *
 * Errors are domain errors, so the HTTP filter answers them:
 * - network failure (connection refused, unknown host…): `BadGatewayError('<host><path> is not available (<code>)')`;
 * - 400 or 422: `UpstreamValidationError('<host><path> answered <status>: <upstream message>')`, a ValidationError;
 * - any other non-2xx, 404 included: `UpstreamHttpError` (same text), a BadGatewayError.
 * Both carry the upstream status: callers that give a 404 its own meaning read it with `upstreamStatus(error)`.
 *
 * There is no timeout, as with axios before (F-strategic-11).
 */
@Injectable()
export class HttpClient {
  private readonly logger = new Logger(HttpClient.name);

  get<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  post<T>(url: string, body: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('POST', url, body, options);
  }

  patch<T>(url: string, body: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('PATCH', url, body, options);
  }

  put<T>(url: string, body: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('PUT', url, body, options);
  }

  delete<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  private async request<T>(method: string, url: string, body: unknown, options: HttpRequestOptions = {}): Promise<T> {
    const target = HttpClient.describe(url);
    const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    let payload: string | URLSearchParams | undefined;
    if (body instanceof URLSearchParams) {
      // A form (the token request): fetch sets application/x-www-form-urlencoded.
      payload = body;
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, { method, headers, body: payload });
    } catch (error) {
      const code = HttpClient.networkCode(error);
      this.logger.error(`${method} ${target} failed: ${code}`);
      throw new BadGatewayError(`${target} is not available (${code})`);
    }

    const text = await response.text();
    if (!response.ok) {
      const message = `${target} answered ${response.status}: ${HttpClient.upstreamMessage(text, response.statusText)}`;
      this.logger.error(`${method} ${message}`);
      if (response.status === 400 || response.status === 422) throw new UpstreamValidationError(message, response.status);
      throw new UpstreamHttpError(message, response.status);
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new UpstreamHttpError(`${target} answered ${response.status} with a body that is not JSON`, response.status);
    }
  }

  /** `<host><path>`, without the query string. */
  private static describe(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.host}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  /** The system error code of a failed fetch (`TypeError: fetch failed` with `cause.code`: ECONNREFUSED, ENOTFOUND…). */
  private static networkCode(error: unknown): string {
    const cause = error instanceof Error ? (error.cause as { code?: unknown } | undefined) : undefined;
    if (cause && typeof cause.code === 'string') return cause.code;
    return error instanceof Error ? error.message : String(error);
  }

  /** The `message` of an error body (string or array, as Nest answers), or the body itself. */
  private static upstreamMessage(text: string, statusText: string): string {
    if (!text) return statusText;
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed.message === 'string') return parsed.message;
      if (Array.isArray(parsed.message)) return parsed.message.map(String).join(', ');
    } catch {
      // not JSON: the text itself
    }
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }
}
