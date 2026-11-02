/**
 * `code` is stable and meant for clients (translations, specific handling): `not-found`, `version-conflict`... Each
 * class has a default code, and a more specific one can be passed. `message` is English text for people.
 */
export class DomainError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'internal-error',
    /** Optional data for clients, like the failures of a file by JSON path (spec 024). */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
export class NotFoundError extends DomainError {
  constructor(entity: string, id: number | string, code = 'not-found') {
    super(`${entity} ${id} not found`, 404, code);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code = 'conflict') {
    super(message, 409, code);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, code = 'validation', details?: unknown) {
    super(message, 400, code, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/** A well formed request that cannot be processed, like an export file of a newer format (spec 024): 422. */
export class UnprocessableError extends DomainError {
  constructor(message: string, code = 'unprocessable', details?: unknown) {
    super(message, 422, code, details);
    this.name = 'UnprocessableError';
    Object.setPrototypeOf(this, UnprocessableError.prototype);
  }
}

/** A request body above the configured limit (spec 024): 413. */
export class PayloadTooLargeError extends DomainError {
  constructor(message: string, code = 'payload-too-large', details?: unknown) {
    super(message, 413, code, details);
    this.name = 'PayloadTooLargeError';
    Object.setPrototypeOf(this, PayloadTooLargeError.prototype);
  }
}

export class InvalidSearchExpression extends DomainError {
  constructor(message: string) {
    super(message, 400, 'invalid-search');
    this.name = 'InvalidSearchExpression';
    Object.setPrototypeOf(this, InvalidSearchExpression.prototype);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string) {
    super(message, 401, 'unauthorized');
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string, code = 'forbidden') {
    super(message, 403, code);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class BadGatewayError extends DomainError {
  constructor(message: string, code = 'bad-gateway') {
    super(message, 502, code);
    this.name = 'BadGatewayError';
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}

/** Another API did not answer in time (spec 021, decision 7): 504. */
export class GatewayTimeoutError extends DomainError {
  constructor(message: string, code = 'upstream-timeout') {
    super(message, 504, code);
    this.name = 'GatewayTimeoutError';
    Object.setPrototypeOf(this, GatewayTimeoutError.prototype);
  }
}
