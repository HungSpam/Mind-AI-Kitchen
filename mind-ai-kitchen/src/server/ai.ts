import { z } from 'zod';
import { setTimeout as delay } from 'node:timers/promises';
import { ApiError } from './http';

export const aiModel = () => process.env.GEMINI_MODEL || 'gemini-flash-latest';

function getMockAIResponse<T>(prompt: string, schema: z.ZodType<T>, imageBase64?: string): T {
  // 1. Vision recognition mock
  if (imageBase64) {
    return schema.parse({
      ingredients: [
        { name: 'Mì Ý Spaghetti', box2d: [240, 70, 470, 520] },
        { name: 'Hành tây', box2d: [240, 580, 520, 800] },
        { name: 'Sốt Bolognese', box2d: [560, 50, 820, 200] },
        { name: 'Thịt xay', box2d: [550, 260, 820, 490] },
        { name: 'Dầu ô liu', box2d: [670, 600, 810, 740] },
        { name: 'Gia vị muối', box2d: [670, 790, 810, 940] },
      ],
    });
  }

  // 2. Recipe generation mock
  if (prompt.includes('công thức nấu ăn') || prompt.includes('ingredientIds')) {
    try {
      const match = prompt.match(/\{[\s\S]*\}$/);
      const parsedBody = match ? JSON.parse(match[0]) : null;
      const ingList: Array<{ id: string; name: string }> = parsedBody?.ingredients || [];
      const availableIds = ingList.map((i) => i.id);
      const mainName = ingList[0]?.name || 'thịt và rau củ';
      const secondName = ingList[1]?.name || 'gia vị';

      return schema.parse({
        name:
          ingList.length > 1
            ? `Món ngon từ ${mainName} và ${secondName}`
            : `Món ngon từ ${mainName}`,
        summary: `Món ăn thơm ngon, dễ chế biến kết hợp hài hòa từ ${ingList.map((i) => i.name).join(', ')}.`,
        minutes: 25,
        difficulty: 'Dễ',
        ingredientIds: availableIds.length > 0 ? availableIds : ['mock-ing-1'],
        steps: [
          {
            id: 1,
            text: 'Sơ chế và rửa sạch các nguyên liệu, thái miếng vừa ăn và để ráo nước.',
            durationSeconds: 180,
          },
          {
            id: 2,
            text: 'Làm nóng chảo với lửa vừa, cho dầu ăn và các nguyên liệu vào xào chín săn đều.',
            durationSeconds: 300,
          },
          {
            id: 3,
            text: 'Nêm nếm gia vị vừa khẩu vị, đảo đều tay trong 2 phút cho ngấm đều sốt.',
            durationSeconds: 120,
          },
          {
            id: 4,
            text: 'Trình bày món ăn đẹp mắt ra đĩa, rắc chút tiêu lên trên và thưởng thức khi còn nóng.',
            durationSeconds: 60,
          },
        ],
      });
    } catch {
      // Fallback below
    }
  }

  // 3. Suggestions mock
  return schema.parse({
    suggestions: ['Hành lá', 'Tiêu xay', 'Tỏi băm', 'Dầu hào'],
  });
}

export async function generateJSON<T>(
  prompt: string,
  schema: z.ZodType<T>,
  imageBase64?: string,
  signal?: AbortSignal,
  forceMock?: boolean,
): Promise<T> {
  const isMock =
    process.env.NODE_ENV !== 'test' &&
    (forceMock !== undefined
      ? forceMock
      : process.env.MOCK_AI === 'true' ||
        process.env.BYPASS_AI === 'true' ||
        process.env.NEXT_PUBLIC_MOCK_AI === 'true');

  if (isMock) {
    // Artificial small delay for realistic UX testing transition
    await new Promise((resolve) => setTimeout(resolve, 350));
    return getMockAIResponse(prompt, schema, imageBase64);
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key)
    throw new ApiError(
      503,
      'AI_NOT_CONFIGURED',
      'AI chưa được kết nối. Bạn vẫn có thể chuẩn bị nguyên liệu và xem công thức đã lưu.',
    );
  const jsonSchema = z.toJSONSchema(schema);
  const parts: object[] = [{ text: prompt }];
  if (imageBase64)
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } });
  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(45_000)])
    : AbortSignal.timeout(45_000);
  let response!: Response;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' +
          encodeURIComponent(aiModel()) +
          ':generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseJsonSchema: jsonSchema,
              temperature: 0.3,
              maxOutputTokens: 8192,
            },
          }),
          signal: requestSignal,
          cache: 'no-store',
        },
      );
      if (![500, 502, 503, 504].includes(response.status) || attempt === 2) break;
      // Retry only transient provider errors, within one deadline for the entire request.
      await response.body?.cancel();
      await delay(500 * 2 ** attempt, undefined, { signal: requestSignal });
    }
  } catch {
    throw new ApiError(
      504,
      'AI_TIMEOUT',
      'AI phản hồi quá lâu hoặc yêu cầu đã bị hủy. Vui lòng thử lại.',
    );
  }
  if (!response.ok) {
    // Keep upstream payloads private; distinguish configuration errors from service outages.
    if (response.status === 400 || response.status === 422)
      throw new ApiError(
        502,
        'AI_REQUEST_REJECTED',
        'AI không chấp nhận yêu cầu xử lý. Cần kiểm tra cấu hình nhận diện.',
        response.status,
      );
    if (response.status === 401 || response.status === 403)
      throw new ApiError(
        503,
        'AI_AUTH',
        'Kết nối AI chưa được cấp quyền. Vui lòng kiểm tra cấu hình dịch vụ.',
        response.status,
      );
    if (response.status === 404)
      throw new ApiError(
        503,
        'AI_MODEL_NOT_FOUND',
        'Model AI đang cấu hình không khả dụng.',
        response.status,
      );
    if (response.status === 429)
      throw new ApiError(
        429,
        'AI_RATE_LIMIT',
        'AI đang bị giới hạn lượt sử dụng. Vui lòng thử lại sau.',
        response.status,
      );
    throw new ApiError(
      503,
      'AI_UNAVAILABLE',
      'AI đang không sẵn sàng. Vui lòng thử lại sau.',
      response.status,
    );
  }
  try {
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts
      ?.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
      .map((p: { text: string }) => p.text)
      .join('');
    return schema.parse(JSON.parse(text));
  } catch {
    throw new ApiError(502, 'AI_FORMAT', 'Câu trả lời chưa đạt yêu cầu. Hãy thử tạo lại.');
  }
}
