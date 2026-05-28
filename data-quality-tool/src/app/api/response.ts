export function success(data: unknown, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function error(message: string, code = 'INTERNAL_ERROR', status = 500) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export function notFound(message = '资源不存在') {
  return error(message, 'NOT_FOUND', 404);
}

export function badRequest(message: string) {
  return error(message, 'BAD_REQUEST', 400);
}
