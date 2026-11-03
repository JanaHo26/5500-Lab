// base class for every error we expect and want to turn into a specific http reply
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, "VALIDATION_ERROR", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "DOUBLE_BOOKING", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, "NOT_FOUND", message);
  }
}
