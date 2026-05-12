export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const Errors = {
  badRequest: (message: string, code = "BAD_REQUEST") => new HttpError(400, code, message),
  unauthorized: (message = "Not authenticated", code = "UNAUTHORIZED") =>
    new HttpError(401, code, message),
  forbidden: (message = "Forbidden", code = "FORBIDDEN") => new HttpError(403, code, message),
  notFound: (message = "Not found", code = "NOT_FOUND") => new HttpError(404, code, message),
  conflict: (message: string, code = "CONFLICT") => new HttpError(409, code, message),
  unprocessable: (message: string, code = "UNPROCESSABLE") => new HttpError(422, code, message),
  internal: (message = "Internal error", code = "INTERNAL") => new HttpError(500, code, message),
};
