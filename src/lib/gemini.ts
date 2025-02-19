import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if it's a 503 error
      if (
        error?.message?.includes("503") ||
        error?.message?.includes("overloaded")
      ) {
        const delayTime = baseDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delayTime}ms`);
        await delay(delayTime);
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw lastError;
}

export async function analyzeText(text: string) {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured");
    }

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

    const generateContent = async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    };

    const responseText = await retryWithExponentialBackoff(generateContent);

    try {
      const parsed = JSON.parse(responseText);
      return {
        entities: {
          people: parsed.entities?.people || [],
          places: parsed.entities?.places || [],
          events: parsed.entities?.events || [],
          dates: parsed.entities?.dates || [],
        },
        relationships: parsed.relationships || [],
      };
    } catch (e) {
      console.error("Failed to parse Gemini response:", e);
      console.log("Raw response:", responseText);
      return {
        entities: {
          people: [],
          places: [],
          events: [],
          dates: [],
        },
        relationships: [],
      };
    }
  } catch (error) {
    console.error("Error analyzing text:", error);
    throw error; // Let the component handle the error
  }
}
