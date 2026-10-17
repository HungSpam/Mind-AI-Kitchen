import { z } from 'zod';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function readBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 40_000,
): Promise<T> {
  const origin = request.headers.get('origin');
  const allowed = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (origin && origin !== allowed) throw new ApiError(403, 'ORIGIN', 'Yêu cầu không hợp lệ.');
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new ApiError(415, 'CONTENT_TYPE', 'Yêu cầu phải là JSON.');
  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new ApiError(413, 'TOO_LARGE', 'Dữ liệu vượt giới hạn cho phép.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'EMPTY', 'Thiếu dữ liệu.');
  let size = 0;
  let text = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, 'TOO_LARGE', 'Dữ liệu vượt giới hạn cho phép.');
      }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError(400, 'JSON', 'Dữ liệu không đúng định dạng.');
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new ApiError(
      400,
      'VALIDATION',
      parsed.error.issues[0]?.message || 'Kiểm tra lại dữ liệu nhập.',
    );
  return parsed.data;
}
export function success(data: unknown) {
  return Response.json({ data, error: null }, { headers: { 'Cache-Control': 'no-store' } });
}
export function failure(error: unknown) {
  const known = error instanceof ApiError;
  const status = known ? error.status : 500;
  // Never log images, profiles, prompts, credentials or upstream error bodies.
  console.error(
    JSON.stringify({ event: 'api_error', status, code: known ? error.code : 'INTERNAL' }),
  );
  return Response.json(
    {
      data: null,
      error: {
        code: known ? error.code : 'INTERNAL',
        message: known ? error.message : 'Có lỗi xử lý. Vui lòng thử lại.',
      },
    },
    {
      status,
      headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) },
    },
  );
}
