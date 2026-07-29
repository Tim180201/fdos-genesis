export class FdosError extends Error {
  constructor(message, { code = "FDOS_ERROR", cause, details } = {}) {
    super(message, { cause });
    this.name = new.target.name;
    this.code = code;
    this.details = details || null;
  }
}

export class ValidationError extends FdosError {
  constructor(message, details) {
    super(message, { code: "VALIDATION_ERROR", details });
  }
}

export class AuthorizationError extends FdosError {
  constructor(message, details) {
    super(message, { code: "AUTHORIZATION_DENIED", details });
  }
}

export class ConflictError extends FdosError {
  constructor(message, details) {
    super(message, { code: "STATE_CONFLICT", details });
  }
}

export class IntegrityError extends FdosError {
  constructor(message, details) {
    super(message, { code: "INTEGRITY_ERROR", details });
  }
}

export class NotFoundError extends FdosError {
  constructor(message, details) {
    super(message, { code: "NOT_FOUND", details });
  }
}

export class PolicyError extends FdosError {
  constructor(message, details) {
    super(message, { code: "POLICY_DENIED", details });
  }
}
