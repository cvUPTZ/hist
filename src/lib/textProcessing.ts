import { GoogleGenerativeAI } from "@google/generative-ai";

interface Entity {
  text: string;
  type: "person" | "place" | "event" | "date" | "other";
  confidence: number;
  indices: [number, number];
}

interface ProcessedText {
  entities: {
    people: string[];
    places: string[];
    events: string[];
    dates: string[];
    others: string[]; // Added 'other' category
  };
  relationships: Array<{
    source: string;
    target: string;
    type: string;
    description?: string;
  }>;
}

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
        console.log(`Retry ${i + 1}/${maxRetries}ms`);
        await delay(delayTime);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

const analyzeEntitiesWithGemini = async (text: string): Promise<Entity[]> => {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      قم بتحليل النص العربي التالي واستخراج الكيانات وتحديد نوعها (شخص، مكان، حدث، تاريخ، أو غير ذلك).
      يجب أن يكون الإخراج عبارة عن مصفوفة JSON صالحة. كل كائن في المصفوفة يجب أن يحتوي على:
      - text: النص المستخرج
      - type: نوع الكيان (person, place, event, date, other)
      - confidence: قيمة بين 0 و 1 تمثل مدى الثقة في تحديد النوع
      - indices: مصفوفة تحتوي على فهرسين: بداية ونهاية النص المستخرج في النص الأصلي

      مثال على الإخراج:
      \`\`\`json
      [
        {"text": "صلاح الدين الأيوبي", "type": "person", "confidence": 0.95, "indices": [5, 20]},
        {"text": "حطين", "type": "place", "confidence": 0.90, "indices": [35, 40]},
        {"text": "1187", "type": "date", "confidence": 0.85, "indices": [25, 29]},
        {"text": "معركة", "type": "event", "confidence": 0.80, "indices": [30, 34]}
      ]
      \`\`\`

      النص المراد تحليله: ${text}
    `;

    const generateContent = async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let responseText = response.text();

      responseText = responseText.trim();
      responseText = responseText.replace(/```json\n/g, "");
      responseText = responseText.replace(/```\n/g, "");
      responseText = responseText.replace(/```/g, "");
      responseText = responseText.trim();

      return responseText;
    };

    const responseText = await retryWithExponentialBackoff(generateContent);

    try {
      const parsedEntities: any[] = JSON.parse(responseText);

      // Validate and map to Entity interface
      const entities: Entity[] = parsedEntities.map((item: any) => ({
        // Added explicit 'any' type
        text: item.text,
        type: item.type,
        confidence: item.confidence,
        indices: item.indices,
      }));

      return entities;
    } catch (e) {
      console.error("Failed to parse Gemini response:", e);
      console.log("Raw response:", responseText);
      return [];
    }
  } catch (error) {
    console.error("Error analyzing text with Gemini:", error);
    return [];
  }
};

const analyzeRelationshipsWithGemini = async (
  text: string,
  entities: Entity[],
): Promise<ProcessedText["relationships"]> => {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
            قم بتحليل النص العربي التالي واستخراج العلاقات بين الكيانات الموجودة.
            يجب أن يكون الإخراج عبارة عن مصفوفة JSON صالحة. كل كائن في المصفوفة يجب أن يحتوي على:
            - source: نص الكيان المصدر
            - target: نص الكيان الهدف
            - type: نوع العلاقة (مثل "authored"، "located_in"، "part_of"، "related_to", "military", "governed_by")
            - description: وصف موجز للعلاقة

            الكيانات الموجودة في النص:
            \`\`\`json
            ${JSON.stringify(entities, null, 2)}
            \`\`\`

            مثال على الإخراج:
            \`\`\`json
            [
              {"source": "صلاح الدين الأيوبي", "target": "حطين", "type": "military", "description": "قاد صلاح الدين الأيوبي المسلمين في معركة حطين."},
              {"source": "حطين", "target": "فلسطين", "type": "located_in", "description": "تقع حطين في فلسطين"}
            ]
            \`\`\`

            النص المراد تحليله: ${text}
        `;

    const generateContent = async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let responseText = response.text();

      responseText = responseText.trim();
      responseText = responseText.replace(/```json\n/g, "");
      responseText = responseText.replace(/```\n/g, "");
      responseText = responseText.replace(/```/g, "");
      responseText = responseText.trim();

      return responseText;
    };

    const responseText = await retryWithExponentialBackoff(generateContent);

    try {
      const parsedRelationships: any[] = JSON.parse(responseText);

      const relationships: ProcessedText["relationships"] =
        parsedRelationships.map((item: any) => ({
          // added explicit 'any'
          source: item.source,
          target: item.target,
          type: item.type,
          description: item.description,
        }));

      return relationships;
    } catch (e) {
      console.error("Failed to parse Gemini response:", e);
      console.log("Raw response:", responseText);
      return [];
    }
  } catch (error) {
    console.error("Error analyzing relationships with Gemini:", error);
    return [];
  }
};

export const processText = async (text: string): Promise<ProcessedText> => {
  const entities = await analyzeEntitiesWithGemini(text);
  const relationships = await analyzeRelationshipsWithGemini(text, entities);

  const result: ProcessedText = {
    entities: {
      people: [],
      places: [],
      events: [],
      dates: [],
      others: [],
    },
    relationships: relationships,
  };

  // Group entities by type
  entities.forEach((entity) => {
    switch (entity.type) {
      case "person":
        if (!result.entities.people.includes(entity.text)) {
          result.entities.people.push(entity.text);
        }
        break;
      case "place":
        if (!result.entities.places.includes(entity.text)) {
          result.entities.places.push(entity.text);
        }
        break;
      case "event":
        if (!result.entities.events.includes(entity.text)) {
          result.entities.events.push(entity.text);
        }
        break;
      case "date":
        if (!result.entities.dates.includes(entity.text)) {
          result.entities.dates.push(entity.text);
        }
        break;
      default:
        if (!result.entities.others.includes(entity.text)) {
          result.entities.others.push(entity.text);
        }
        break;
    }
  });

  return result;
};
