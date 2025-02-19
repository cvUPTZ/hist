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
      
      if (error?.message?.includes("503") || error?.message?.includes("overloaded")) {
        const delayTime = baseDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delayTime}ms`);
        await delay(delayTime);
        continue;
      }
      
      throw error;
    }
  }

  throw lastError;
}

export interface AnalyzedEntity {
  name: string;
  title?: string;
  type?: string;
  description?: string;
  date?: string;
  calendar?: string;
}

export interface AnalyzedRelationship {
  source: string;
  target: string;
  type: string;
  description?: string;
}

export interface AnalysisResult {
  entities: {
    people: AnalyzedEntity[];
    places: AnalyzedEntity[];
    events: AnalyzedEntity[];
    dates: AnalyzedEntity[];
  };
  relationships: AnalyzedRelationship[];
}

export async function analyzeText(text: string): Promise<AnalysisResult> {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Analyze the following Arabic historical text and extract entities with their relationships.
Return ONLY a valid JSON object with no additional formatting, markdown, or explanation.
The response should be exactly in this format without any other text:
{
  "entities": {
    "people": [{"name": "string", "title": "string", "description": "string"}],
    "places": [{"name": "string", "type": "string", "description": "string"}],
    "events": [{"name": "string", "type": "string", "description": "string", "date": "string"}],
    "dates": [{"date": "string", "calendar": "string", "description": "string"}]
  },
  "relationships": [
    {"source": "string", "target": "string", "type": "string", "description": "string"}
  ]
}

Text to analyze: ${text}`;

    const generateContent = async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let responseText = response.text();
      
      // Clean up the response to ensure it's valid JSON
      responseText = responseText.trim();
      
      // Remove any markdown code block indicators
      responseText = responseText.replace(/```json\n/g, '');
      responseText = responseText.replace(/```\n/g, '');
      responseText = responseText.replace(/```/g, '');
      
      // Handle potential line breaks and spaces
      responseText = responseText.trim();
      
      return responseText;
    };

    const responseText = await retryWithExponentialBackoff(generateContent);

    try {
      const parsed = JSON.parse(responseText);
      
      // Validate the structure and provide defaults
      return {
        entities: {
          people: Array.isArray(parsed.entities?.people) ? parsed.entities.people : [],
          places: Array.isArray(parsed.entities?.places) ? parsed.entities.places : [],
          events: Array.isArray(parsed.entities?.events) ? parsed.entities.events : [],
          dates: Array.isArray(parsed.entities?.dates) ? parsed.entities.dates : [],
        },
        relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
      };
    } catch (e) {
      console.error("Failed to parse Gemini response:", e);
      console.log("Raw response:", responseText);
      
      // Return empty data structure on parse error
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
    throw error;
  }
}
