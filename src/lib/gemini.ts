import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || "");

export async function analyzeText(text: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `Analyze the following Arabic historical text and extract entities in the following categories:
  - People (including titles, roles)
  - Places (cities, regions, countries)
  - Events (battles, political events, cultural events)
  - Dates (both Hijri and Gregorian)
  - Relationships between entities

Text: ${text}

Provide the output in JSON format with the following structure:
{
  "entities": {
    "people": [{"name": "...", "title": "...", "description": "..."}],
    "places": [{"name": "...", "type": "...", "description": "..."}],
    "events": [{"name": "...", "type": "...", "description": "...", "date": "..."}],
    "dates": [{"date": "...", "calendar": "hijri|gregorian", "description": "..."}]
  },
  "relationships": [
    {"source": "...", "target": "...", "type": "...", "description": "..."}
  ]
}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    return null;
  }
}
