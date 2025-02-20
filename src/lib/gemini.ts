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

      if (
        error?.message?.includes("503") ||
        error?.message?.includes("overloaded")
      ) {
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
    characters: AnalyzedEntity[];
    places: AnalyzedEntity[];
    events: AnalyzedEntity[];
    dates: AnalyzedEntity[];
  };
  relationships: AnalyzedRelationship[];
}

const promptTemplate = (text: string) => `
قم بتحليل النص التاريخي العربي التالي واستخراج الكيانات وعلاقاتها بشكل مفصل.
يجب أن يكون الإخراج كائن JSON صالحًا فقط بدون أي تنسيق إضافي أو علامات أو شرح.
يجب أن يكون الرد بالتنسيق التالي تمامًا بدون أي نص آخر:
\`\`\`json
{
  "entities": {
    "characters": [{
      "name": "string",
      "title": "string",
      "description": "string",
      "role": "string",
      "period": "string",
      "achievements": ["string"],
      "affiliations": ["string"]
    }],
    "places": [{
      "name": "string",
      "type": "string",
      "description": "string",
      "significance": "string",
      "period": "string",
      "coordinates": {"lat": "string", "lng": "string"}
    }],
    "events": [{
      "name": "string",
      "type": "string",
      "description": "string",
      "date": "string",
      "location": "string",
      "participants": ["string"],
      "outcomes": ["string"],
      "significance": "string"
    }],
    "dates": [{
      "date": "string",
      "calendar": "string",
      "description": "string",
      "gregorian": "string",
      "hijri": "string",
      "significance": "string"
    }]
  },
  "relationships": [
    {
      "source": "string",
      "target": "string",
      "type": "string",
      "description": "string",
      "strength": "number",
      "timespan": "string",
      "evidence": "string"
    }
  ]
}
\`\`\`

النص المراد تحليله: ${text}

يرجى ملاحظة ما يلي:
* يجب أن تكون الأسماء باللغة العربية.
* يجب أن تكون التواريخ بالتنسيق dd/mm/yyyy إذا أمكن، مع توفير التقويمين الهجري والميلادي.
* حاول أن تكون الأوصاف موجزة وبلغة عربية سليمة.
* اذكر المصادر والأدلة للعلاقات حيثما أمكن.
* قم بتقييم قوة العلاقات على مقياس من 0 إلى 1.
* استخرج المصطلحات التاريخية والعلمية المهمة وشرحها.
* حدد الأدوار والانتماءات للشخصيات.
* اذكر أهمية الأماكن والأحداث في السياق التاريخي.
`;

const cleanJsonResponse = (text: string): string => {
  try {
    // Remove any markdown code block indicators and extra whitespace
    let cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    // Remove any non-JSON text before or after the JSON object
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }

    // Fix common JSON formatting issues
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/\\/g, "\\\\")
      .replace(/"\s+"/g, '" "')
      .replace(/(?<=["'}])\s+(?=[:,])/g, "")
      .replace(/undefined/g, '""')
      .replace(/\t/g, " ");

    return cleaned;
  } catch (error) {
    console.error("Error cleaning JSON:", error);
    return text;
  }
};

const parseAnalysisResult = (responseText: string): AnalysisResult => {
  try {
    const cleanedJson = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleanedJson);

    const createSafeArray = <T>(arr: any): T[] =>
      Array.isArray(arr) ? arr : [];

    const result: AnalysisResult = {
      entities: {
        characters: createSafeArray(parsed?.entities?.characters || []),
        places: createSafeArray(parsed?.entities?.places || []),
        events: createSafeArray(parsed?.entities?.events || []),
        dates: createSafeArray(parsed?.entities?.dates || []),
      },
      relationships: createSafeArray(parsed?.relationships || []),
    };

    // Validate required fields
    result.entities.characters = result.entities.characters.filter(
      (char) => char?.name,
    );
    result.entities.places = result.entities.places.filter(
      (place) => place?.name,
    );
    result.entities.events = result.entities.events.filter(
      (event) => event?.name,
    );
    result.entities.dates = result.entities.dates.filter((date) => date?.date);
    result.relationships = result.relationships.filter(
      (rel) => rel?.source && rel?.target && rel?.type,
    );

    return result;
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    console.log("Raw response:", responseText);
    console.log("Cleaned response attempted:", cleanJsonResponse(responseText));

    return {
      entities: {
        characters: [],
        places: [],
        events: [],
        dates: [],
      },
      relationships: [],
    };
  }
};

export async function analyzeText(text: string): Promise<AnalysisResult> {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = promptTemplate(text);

    const generateContent = async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    };

    const responseText = await retryWithExponentialBackoff(generateContent);
    return parseAnalysisResult(responseText);
  } catch (error) {
    console.error("Error analyzing text:", error);
    throw new Error("Failed to analyze text. Please try again.");
  }
}
