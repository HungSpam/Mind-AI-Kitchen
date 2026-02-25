import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profile, ingredients, servings = 1 } = body;

    if (!profile || !ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: 'Missing profile or ingredients' }, { status: 400 });
    }

    const prompt = `Từ nguyên liệu đã cho, tạo 1 MÓN ĂN đáp ứng:
🚨 NGÔN NGỮ: TRẢ LỜI NGHIÊM NGẶT 100% BẰNG TIẾNG VIỆT (kể cả tên món, cách làm, nhận xét).
🚨 CẤM DÙNG NGUYÊN LIỆU CHÍNH (thịt/cá/rau...) KHÔNG CÓ TRONG DANH SÁCH.
🚨 CẤM thêm nguyên liệu ngoài vào "steps" hoặc "ingredients".
🚨 Gợi ý món thêm CHỈ ĐỂ ở "suggestedAdditions". ĐƯỢC DÙNG gia vị cơ bản (mắm/muối/tiêu/đường/dầu...).
🚨 TUYỆT ĐỐI KHÔNG SỬ DỤNG NHỮNG NGUYÊN LIỆU SAU VÌ NGUY HIỂM: ${profile.allergies || 'Không có dị ứng'}.
🚨 LƯU Ý KHẨU VỊ/GHÉT: ${profile.preferences || 'Không có'}.
Hồ sơ mục tiêu: Tạng ${profile.bodyType}|Mục tiêu ${profile.goal}|PHẦN ĂN: ${servings}. (Calories/Macros tính cho tổng số người).
Nguyên liệu có: ${ingredients.map((i: { name: string }) => i.name).join(', ')}

Trả về ĐÚNG CẤU TRÚC raw JSON sau (KHÔNG MARKDOWN):
{"name":"Tên món","calories":450,"time":"15 phút","difficulty":"Dễ/Vừa/Khó","ai_verdict":"Giải thích siêu ngắn","servings":${servings},"macros":{"protein":25,"carbs":40,"fat":15},"ingredients":["Nguyên liệu"],"suggestedAdditions":["Gợi ý"],"steps":[{"id":1,"text":"Bước 1"}]}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    const recipeData = JSON.parse(text);
    return NextResponse.json(recipeData);

  } catch (error) {
    console.error('Error generating recipe:', error);
    return NextResponse.json({ error: 'Failed to generate recipe' }, { status: 500 });
  }
}
