export async function postJSON<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
  customHeaders?: Record<string, string>,
): Promise<T> {
  let isMockStored = false;
  try {
    isMockStored =
      typeof window !== 'undefined' && localStorage.getItem('mind_kitchen_mock_ai') === 'true';
  } catch {
    // Storage may be blocked. Keep the real service as the default.
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(isMockStored ? { 'x-mock-ai': 'true' } : {}),
    ...customHeaders,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error?.message || 'Chưa thể xử lý yêu cầu. Vui lòng thử lại.');
  return result.data as T;
}
