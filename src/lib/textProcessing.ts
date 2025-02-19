interface Entity {
  text: string;
  type: "person" | "place" | "event" | "date";
  confidence: number;
}

interface ProcessedText {
  entities: {
    people: string[];
    places: string[];
    events: string[];
    dates: string[];
  };
  relationships: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

const detectEntities = (text: string): Entity[] => {
  const entities: Entity[] = [];

  // Arabic patterns
  const datePatterns = [
    // Hijri dates
    /\b(\d{1,4})\s*(هـ|هجري|للهجرة)\b/g,
    // Gregorian dates with Arabic markers
    /\b(\d{1,4})\s*(م|ميلادي|للميلاد)\b/g,
    // Year mentions
    /\b(سنة|عام)\s+(\d{1,4})\b/g,
    // Century mentions
    /\b(القرن)\s+[\u0660-\u0669]{1,2}\b/g,
  ];

  const namePatterns = [
    // Common Arabic name prefixes
    /\b(ابن|أبو|أبي|بن|عبد|ال)\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){1,3}\b/g,
    // Names with titles
    /\b(الإمام|الشيخ|السلطان|الخليفة|الملك|الأمير|العالم|القاضي)\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){1,3}\b/g,
    // Names with Al-
    /\b(ال|آل)[\u0600-\u06FF]+\b/g,
  ];

  const placePatterns = [
    // Places with prefixes
    /\b(مدينة|بلاد|مملكة|خلافة|دولة|إمارة|سلطنة)\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){0,2}\b/g,
    // Major Islamic cities
    /\b(مكة|المدينة|بغداد|دمشق|القاهرة|الأندلس|قرطبة|فاس|تونس|صنعاء|حلب|الكوفة|البصرة)\b/g,
    // Regions
    /\b(الشام|العراق|مصر|المغرب|الأندلس|خراسان|الحجاز|اليمن)\b/g,
  ];

  const eventPatterns = [
    // Military events
    /\b(معركة|غزوة|فتح|حصار|سقوط)\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){0,3}\b/g,
    // Political events
    /\b(ثورة|انقلاب|تأسيس|بيعة|عزل|تولية)\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){0,3}\b/g,
    // Cultural events
    /\b(مجلس|حلقة|مدرسة)\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){0,3}\b/g,
  ];

  // Helper function to process patterns
  const processPatterns = (
    patterns: RegExp[],
    type: Entity["type"],
    baseConfidence: number,
  ) => {
    patterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Avoid duplicates
        if (!entities.some((e) => e.text === match![0])) {
          entities.push({
            text: match[0],
            type,
            confidence: baseConfidence - index * 0.1, // Decrease confidence for secondary patterns
          });
        }
      }
    });
  };

  // Process all patterns
  processPatterns(datePatterns, "date", 0.9);
  processPatterns(namePatterns, "person", 0.85);
  processPatterns(placePatterns, "place", 0.8);
  processPatterns(eventPatterns, "event", 0.75);

  // Detect relationships based on proximity and context
  const relationships: Array<{
    source: string;
    target: string;
    type: string;
  }> = [];

  // Find relationships between entities that appear close to each other
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const distance =
        text.indexOf(entities[j].text) - text.indexOf(entities[i].text);
      if (distance > 0 && distance < 100) {
        // Entities within 100 characters
        // Check for relationship indicators between entities
        const textBetween = text.substring(
          text.indexOf(entities[i].text) + entities[i].text.length,
          text.indexOf(entities[j].text),
        );

        // Common Arabic relationship indicators
        if (textBetween.match(/\b(كتب|ألف|صنف)\b/)) {
          relationships.push({
            source: entities[i].text,
            target: entities[j].text,
            type: "authored",
          });
        } else if (textBetween.match(/\b(في عهد|في زمن|في فترة)\b/)) {
          relationships.push({
            source: entities[i].text,
            target: entities[j].text,
            type: "during",
          });
        }
      }
    }
  }

  return entities;
};

export const processText = (text: string): ProcessedText => {
  const entities = detectEntities(text);

  const result: ProcessedText = {
    entities: {
      people: [],
      places: [],
      events: [],
      dates: [],
    },
    relationships: [],
  };

  // Group entities by type and remove duplicates
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
    }
  });

  return result;
};
