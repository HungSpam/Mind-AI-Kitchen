import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64 } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
        }

        // Chuẩn hoá hình ảnh cho Gemini Vision API
        const imageData = imageBase64.split(',')[1] || imageBase64;

        const prompt = `Liệt kê tất cả thực phẩm trong ảnh BẰNG TIẾNG VIỆT. Trả về QUY ĐỊNH CHUẨN JSON (raw, KHÔNG format markdown):
{"ingredients":[{"id":"1","name":"Tên tiếng Việt (kèm số lượng nếu có)"}]}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { inlineData: { data: imageData, mimeType: 'image/jpeg' } },
                prompt
            ],
            config: {
                responseMimeType: 'application/json',
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("No response from AI");
        }

        const data = JSON.parse(text);
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error analyzing image:', error);
        return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
    }
}
