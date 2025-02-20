import { GoogleGenerativeAI } from "@google/generative-ai";
import Ajv from "ajv";

// Initialisation du validateur JSON Schema
const ajv = new Ajv({ allErrors: true });
const analysisSchema = {
  type: "object",
  properties: {
    entities: {
      type: "object",
      properties: {
        characters: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
        places: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
        events: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
        dates: {
          type: "array",
          items: {
            type: "object",
            properties: { date: { type: "string" } },
            required: ["date"],
          },
        },
      },
      required: ["characters", "places", "events", "dates"],
    },
    relationships: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source: { type: "string" },
          target: { type: "string" },
          type: { type: "string" },
        },
        required: ["source", "target", "type"],
      },
    },
  },
  required: ["entities", "relationships"],
};
const validateAnalysis = ajv.compile(analysisSchema);

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
    } catch (error: any) {
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
Veuillez analyser le texte historique arabe suivant en extrayant de manière complète et détaillée toutes les entités et leurs relations.
Ne tronquez pas la réponse : fournissez une réponse complète sans texte superflu ni explications additionnelles.
La réponse doit être un objet JSON strictement valide et respecter exactement le format suivant, sans aucun ajout :

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

Texte à analyser: ${text}

Remarques :
* Les noms doivent être en arabe.
* Les dates doivent être au format dd/mm/yyyy si possible, avec les deux calendriers (hijri et grégorien) fournis.
* Les descriptions doivent être concises et en arabe correct.
* Mentionnez les sources et preuves des relations si disponibles.
* Évaluez la force des relations sur une échelle de 0 à 1.
* Extrayez et expliquez les termes historiques et scientifiques importants.
* Déterminez clairement les rôles et affiliations des personnages.
* Précisez l'importance des lieux et événements dans leur contexte historique.
`;

const cleanJsonResponse = (text: string): string => {
  try {
    let cleaned = text;
    // Logger la réponse brute pour débogage
    console.log("Réponse brute pour nettoyage :", text);

    // Supprimer les blocs de code markdown
    cleaned = cleaned
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    // Extraire l'objet JSON extérieur
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.slice(start, end + 1);
    }

    // Amélioration du nettoyage :
    // - Supprimer les caractères non imprimables (en incluant la plage pour l'arabe)
    cleaned = cleaned.replace(/[^\x20-\x7E\u0600-\u06FF]+/g, " ");
    // - Corriger les virgules superflues
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
    // - Corriger les problèmes d'espaces et de guillemets manquants
    cleaned = cleaned
      .replace(/}(\s*{)/g, "},$1")
      .replace(/](\s*\[)/g, "],$1")
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
      .replace(/:\s*([^[{,\s][^,}\]]*?)([,}\]])/g, ':"$1"$2')
      .replace(/\s+/g, " ")
      .replace(/:\s*(undefined|null|''|"")\s*([,}])/g, ':""$2')
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');

    // Tentative de parsing pour validation initiale
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch (e) {
      console.warn(
        "Nettoyage initial échoué, tentative de nettoyage approfondi...",
      );
      cleaned = cleaned
        .replace(/[^\x20-\x7E\u0600-\u06FF]+/g, "")
        .replace(/([{,]\s*)([^"\s]+)(\s*:)/g, '$1"$2"$3')
        .replace(/:(\s*)([^",{\[\s][^,}\]]*?)([,}\]])/g, ':"$2"$3');
      return cleaned;
    }
  } catch (error) {
    console.error("Erreur lors du nettoyage JSON :", error);
    return text;
  }
};

const parseAnalysisResult = (responseText: string): AnalysisResult => {
  try {
    console.log("Réponse brute :", responseText);

    const cleanedJson = cleanJsonResponse(responseText);
    console.log("JSON nettoyé :", cleanedJson);

    // Valider la structure JSON de base avec regex.
    if (!/^{[^]*"entities":\s*{[^]*}[^]*}$/.test(cleanedJson)) {
      throw new Error("Structure JSON invalide");
    }

    const parsed = JSON.parse(cleanedJson);

    // Validation complète avec le JSON Schema
    if (!validateAnalysis(parsed)) {
      console.error(
        "La validation du JSON Schema a échoué :",
        validateAnalysis.errors,
      );
      throw new Error("La validation du JSON Schema a échoué");
    }

    const result: AnalysisResult = {
      entities: {
        characters: [],
        places: [],
        events: [],
        dates: [],
      },
      relationships: [],
    };

    if (parsed?.entities) {
      Object.entries(result.entities).forEach(([key]) => {
        if (Array.isArray(parsed.entities[key])) {
          result.entities[key] = parsed.entities[key]
            .filter(
              (entity) => entity && typeof entity === "object" && entity.name,
            )
            .map((entity) => ({
              name: String(entity.name || ""),
              title: String(entity.title || ""),
              type: String(entity.type || ""),
              description: String(entity.description || ""),
              date: String(entity.date || ""),
              calendar: String(entity.calendar || ""),
            }));
        }
      });
    }

    if (Array.isArray(parsed?.relationships)) {
      result.relationships = parsed.relationships
        .filter(
          (rel) =>
            rel &&
            typeof rel === "object" &&
            rel.source &&
            rel.target &&
            rel.type,
        )
        .map((rel) => ({
          source: String(rel.source || ""),
          target: String(rel.target || ""),
          type: String(rel.type || ""),
          description: String(rel.description || ""),
        }));
    }

    // Implémentation du fallback pour une réponse incomplète
    if (
      result.entities.characters.length === 0 &&
      result.entities.places.length === 0 &&
      result.entities.events.length === 0 &&
      result.entities.dates.length === 0 &&
      result.relationships.length === 0
    ) {
      console.warn("Réponse incomplète détectée, utilisation du fallback...");
      return {
        entities: {
          characters: [{ name: "Aucune donnée disponible" }],
          places: [{ name: "Aucune donnée disponible" }],
          events: [{ name: "Aucune donnée disponible" }],
          dates: [{ name: "Aucune donnée disponible" }],
        },
        relationships: [],
      };
    }

    return result;
  } catch (e) {
    console.error("Échec de l'analyse de la réponse :", e);
    console.log("Réponse échouée :", responseText);
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
      throw new Error("La clé API Gemini n'est pas configurée");
    }

    // Limiter le nombre de tokens dans la réponse avec maxOutputTokens
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      maxOutputTokens: 1024,
    });
    const prompt = promptTemplate(text);

    const generateContent = async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      // Logger la réponse brute pour faciliter le débogage
      const responseText = await response.text();
      console.log("Réponse brute de Gemini :", responseText);
      return responseText;
    };

    const responseText = await retryWithExponentialBackoff(generateContent);
    return parseAnalysisResult(responseText);
  } catch (error) {
    console.error("Erreur lors de l'analyse du texte :", error);
    throw new Error("Échec de l'analyse du texte. Veuillez réessayer.");
  }
}
