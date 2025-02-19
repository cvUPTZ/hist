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
قم بتحليل النص التاريخي العربي التالي واستخراج الكيانات وعلاقاتها.
يجب أن يكون الإخراج كائن JSON صالحًا فقط بدون أي تنسيق إضافي أو علامات أو شرح.
يجب أن يكون الرد بالتنسيق التالي تمامًا بدون أي نص آخر:
\`\`\`json
{
  "entities": {
    "characters": [{"name": "string", "title": "string", "description": "string"}],
    "places": [{"name": "string", "type": "string", "description": "string"}],
    "events": [{"name": "string", "type": "string", "description": "string", "date": "string"}],
    "dates": [{"date": "string", "calendar": "string", "description": "string"}]
  },
  "relationships": [
    {"source": "string", "target": "string", "type": "string", "description": "string"}
  ]
}
\`\`\`

النص المراد تحليله: ${text}

يرجى ملاحظة ما يلي:
* يجب أن تكون الأسماء باللغة العربية.
* يجب أن تكون التواريخ بالتنسيق dd/mm/yyyy إذا أمكن.
* حاول أن تكون الأوصاف موجزة وبلغة عربية سليمة.
* إذا لم يتم العثور على كيان أو علاقة، يجب أن تكون القائمة الخاصة به فارغة ([]).
* عند استخراج الشخصيات ، ركز على الشخصيات الهامة أو المؤثرة في القصة / النص.
`;

// Helper function to parse JSON safely and provide default values
const parseAnalysisResult = (responseText: string): AnalysisResult => {
  try {
    const parsed = JSON.parse(responseText);

    const createSafeArray = <T>(arr: any): T[] =>
      Array.isArray(arr) ? arr : [];

    // Validate and provide defaults
    return {
      entities: {
        characters: createSafeArray(parsed.entities?.characters),
        places: createSafeArray(parsed.entities?.places),
        events: createSafeArray(parsed.entities?.events),
        dates: createSafeArray(parsed.entities?.dates),
      },
      relationships: createSafeArray(parsed.relationships),
    };
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    console.log("Raw response:", responseText);

    // Return empty data structure on parse error
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
      let responseText = response.text();

      // Clean up the response to ensure it's valid JSON
      responseText = responseText.trim();

      // Remove any markdown code block indicators
      responseText = responseText.replace(/```json\n/g, "");
      responseText = responseText.replace(/```\n/g, "");
      responseText = responseText.replace(/```/g, "");

      // Handle potential line breaks and spaces
      responseText = responseText.trim();

      return responseText;
    };

    const responseText = await retryWithExponentialBackoff(generateContent);

    return parseAnalysisResult(responseText);
  } catch (error) {
    console.error("Error analyzing text:", error);
    throw error;
  }
}
