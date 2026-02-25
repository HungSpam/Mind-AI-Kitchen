import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { ingredients } = body;

        if (!ingredients || ingredients.length === 0) {
            return NextResponse.json({ error: 'Missing ingredients' }, { status: 400 });
        }

        const prompt = `Tôi đang có các nguyên liệu sau trong tủ lạnh: ${ingredients.map((i: { name: string }) => i.name).join(', ')}.
Gợi ý cho tôi thêm 4-5 nguyên liệu CƠ BẢN HOẶC GIA VỊ (tỏi, hành, chanh, sả, trứng, rau thơm...) mà tôi nên chuẩn bị thêm để nấu thành một món ăn ngon từ danh sách trên.
🚨 CHỈ trả về mảng chuỗi JSON chứa tên nguyên liệu, KHÔNG CÓ BẤT KỲ ĐỊNH DẠNG MARKDOWN, GIẢI THÍCH HAY VĂN BẢN NÀO KHÁC.
Ví dụ: ["Tỏi băm", "Hành lá", "Tiêu đen", "Nước mắm"]`;

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

        const suggestions = JSON.parse(text);
        return NextResponse.json(suggestions);

    } catch (error) {
        console.error('Error generating suggestions:', error);
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
    }
}
