import { GoogleGenAI } from "@google/genai";

export async function generateAppIcon() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A modern, minimalist app icon for a Hong Kong bus ETA application called "Tuen Mun K-Line". The icon should feature a stylized bus front integrated with a location pin. Use a vibrant color palette of deep blue and bright orange. Flat design, clean lines, professional look, centered on a white background, high resolution.',
        },
      ],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
