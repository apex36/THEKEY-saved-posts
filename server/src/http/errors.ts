/**
 * Domain errors carrying their exact HTTP status. The API's onError handler is
 * the single place that turns them into responses; bodies expose only the
 * machine `code` — the web app maps codes to localized strings.
 */
/** Literal statuses matter: a plain `number` would collapse Eden's per-status response types into an index signature. */
export type ApiErrorStatus = 400 | 401 | 403 | 404;

export class ApiError extends Error {
  constructor(readonly status: ApiErrorStatus, readonly code: string) {
    super(code);
  }
}

export class UnauthorizedError extends ApiError {
  constructor() {
    super(401, 'UNAUTHENTICATED');
  }
}

export class ForbiddenError extends ApiError {
  constructor(code: 'NOT_ENROLLED' | 'NOT_MODERATOR') {
    super(403, code);
  }
}

export class NotFoundError extends ApiError {
  constructor(code: 'POST_NOT_FOUND' | 'COURSE_NOT_FOUND') {
    super(404, code);
  }
}

export class BadRequestError extends ApiError {
  constructor(code: 'INVALID_CURSOR') {
    super(400, code);
  }
}
