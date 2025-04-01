import {
  GoogleGenerativeAI,
  GenerateContentResult,
  ChatSession,
  Part,
} from "@google/generative-ai";

// Define the structure for a translation entry
interface TranslationResponse {
  translation: {
    text: string;
    pronunciation: string;
    formality: "formal" | "polite" | "casual" | "intimate";
  };
  breakdown: {
    words: {
      original: string;
      korean: string;
      pronunciation: string;
      partOfSpeech: string;
      notes?: string;
    }[];
  };
  tips?: string[];
  alternatives?: {
    text: string;
    pronunciation: string;
    context: string;
  }[];
}

// --- Configuration for Different Languages ---
interface LanguageConfig {
  systemPrompt: string;
  fewShotHistory: { role: string; parts: Part[] }[];
}

// --- Korean Configuration (Extracted from example_call.ts) ---
const koreanConfig: LanguageConfig = {
  systemPrompt:
    'You are a Korean language expert. Translate the provided text into natural Korean and break it down for language learners. Focus on brevity while maintaining educational value.\n\n## Response Format\n\nRespond ONLY with valid JSON following this structure:\n\n```json\n{\n  "translation": {\n    "text": "Korean translation",\n    "pronunciation": "Romanized pronunciation",\n    "formality": "formal/polite/casual/intimate"\n  },\n  "breakdown": {\n    "words": [\n      {\n        "original": "Original word",\n        "korean": "Korean word",\n        "pronunciation": "Romanized pronunciation",\n        "partOfSpeech": "noun/verb/etc.",\n        "notes": "Brief usage notes"\n      }\n      // Add entry for each key word\n    ]\n  },\n  "tips": [\n    "Cultural insight or usage tip",\n    "Pronunciation or context advice"\n    // 2-3 brief tips maximum\n  ],\n  "alternatives": [\n    {\n      "text": "Alternative expression",\n      "pronunciation": "Romanized pronunciation",\n      "context": "When to use this alternative"\n    }\n    // 1-2 useful alternatives maximum\n  ]\n}\n```\n\n## Guidelines\n\n- Keep all explanations concise (1-2 sentences max)\n- Use standard romanization\n- Focus on practical usage rather than linguistic theory\n- Prioritize common vocabulary and expressions\n- Include only the most essential cultural context\n- Default to polite form (-요/-습니다) unless context suggests otherwise',
  fewShotHistory: [
    {
      role: "user",
      parts: [{ text: "hey what are you up to? wanna grab coffee later?" }],
    },
    {
      role: "model",
      parts: [
        {
          text: JSON.stringify(
            {
              translation: {
                text: "안녕, 뭐하고 있어? 나중에 커피 마실래?",
                pronunciation:
                  "Annyeong, mwohago isseo? Najunge keopi masillae?",
                formality: "casual",
              },
              breakdown: {
                words: [
                  {
                    original: "hey",
                    korean: "안녕",
                    pronunciation: "annyeong",
                    partOfSpeech: "interjection",
                    notes: "Informal greeting among friends.",
                  },
                  {
                    original: "what are you up to",
                    korean: "뭐하고 있어?",
                    pronunciation: "mwohago isseo?",
                    partOfSpeech: "phrase",
                    notes: "Informal way to ask what someone is doing.",
                  },
                  {
                    original: "wanna",
                    korean: "~할래?",
                    pronunciation: "~hallae?",
                    partOfSpeech: "verb phrase",
                    notes: "Casual suggestion or invitation ending.",
                  },
                  {
                    original: "grab coffee",
                    korean: "커피 마시다",
                    pronunciation: "keopi masida",
                    partOfSpeech: "verb phrase",
                    notes: "Common expression meaning to drink coffee.",
                  },
                  {
                    original: "later",
                    korean: "나중에",
                    pronunciation: "najunge",
                    partOfSpeech: "adverb",
                    notes: "Refers to a time later than now.",
                  },
                ],
              },
              tips: [
                "'안녕' is typically used among peers, not with superiors.",
                "Use '~할래?' only with close friends for casual suggestions.",
              ],
              alternatives: [
                {
                  text: "뭐해? 커피 마실래?",
                  pronunciation: "Mwohae? Keopi masillae?",
                  context: "Even more casual, for very close friends.",
                },
              ],
            },
            null,
            2
          ),
        },
      ],
    },
    {
      role: "user",
      parts: [
        { text: "I believe we all have the power to make our own destiny." },
      ],
    },
    {
      role: "model",
      parts: [
        {
          text: JSON.stringify(
            {
              translation: {
                text: "저는 우리 모두가 자신의 운명을 만들 힘이 있다고 믿습니다.",
                pronunciation:
                  "Jeoneun uri modu-ga jasineui unmyeong-eul mandeul him-i issdago midseumnida.",
                formality: "formal",
              },
              breakdown: {
                words: [
                  {
                    original: "I",
                    korean: "저",
                    pronunciation: "jeo",
                    partOfSpeech: "pronoun",
                    notes: "Formal 'I', used in respectful situations.",
                  },
                  {
                    original: "believe",
                    korean: "믿습니다",
                    pronunciation: "midseumnida",
                    partOfSpeech: "verb",
                    notes: "Formal form of 'to believe'.",
                  },
                  {
                    original: "we all",
                    korean: "우리 모두가",
                    pronunciation: "uri modu-ga",
                    partOfSpeech: "pronoun",
                    notes: "Inclusive pronoun meaning 'all of us'.",
                  },
                  {
                    original: "have the power",
                    korean: "힘이 있다",
                    pronunciation: "him-i itda",
                    partOfSpeech: "verb",
                    notes: "Phrase meaning 'to have power'.",
                  },
                  {
                    original: "to make",
                    korean: "만들",
                    pronunciation: "mandeul",
                    partOfSpeech: "verb",
                    notes: "Root form of 'to make'.",
                  },
                  {
                    original: "our own",
                    korean: "자신의",
                    pronunciation: "jasin-ui",
                    partOfSpeech: "adjective",
                    notes: "Referring to one's own.",
                  },
                  {
                    original: "destiny",
                    korean: "운명",
                    pronunciation: "unmyeong",
                    partOfSpeech: "noun",
                    notes: "Fate or destiny.",
                  },
                ],
              },
              tips: [
                "In Korean, '믿다' can also mean 'to trust' depending on context.",
                "When expressing belief formally, it's polite to use '믿습니다'.",
              ],
              alternatives: [
                {
                  text: "저는 우리가 우리의 인생을 스스로 개척할 수 있다고 믿습니다.",
                  pronunciation:
                    "Jeoneun uriga uriui insaeng-eul seuseuro gaecheokhal su itda-go midseumnida.",
                  context:
                    "Use this to emphasize crafting one's life actively.",
                },
              ],
            },
            null,
            2
          ),
        },
      ],
    },
  ],
};
// --- End Korean Configuration ---

export class TranslationService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private generationConfig = {
    temperature: 0.8,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        translation: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The complete Korean translation",
            },
            pronunciation: {
              type: "string",
              description: "Romanized pronunciation of the translation",
            },
            formality: {
              type: "string",
              description: "The level of formality used in the translation",
              enum: ["formal", "polite", "casual", "intimate"],
            },
          },
          required: ["text", "pronunciation", "formality"],
        },
        breakdown: {
          type: "object",
          properties: {
            words: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original: {
                    type: "string",
                    description: "Original word from source text",
                  },
                  korean: {
                    type: "string",
                    description: "Korean translation of this word",
                  },
                  pronunciation: {
                    type: "string",
                    description: "Romanized pronunciation",
                  },
                  partOfSpeech: {
                    type: "string",
                    description: "Grammatical role",
                  },
                  notes: {
                    type: "string",
                    description: "Brief notes about usage",
                  },
                },
                required: [
                  "original",
                  "korean",
                  "pronunciation",
                  "partOfSpeech",
                ],
              },
            },
          },
          required: ["words"],
        },
        tips: {
          type: "array",
          items: {
            type: "string",
            description: "Brief cultural or usage tips",
          },
        },
        alternatives: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "Alternative expression" },
              pronunciation: {
                type: "string",
                description: "Romanized pronunciation",
              },
              context: {
                type: "string",
                description: "When to use this alternative",
              },
            },
            required: ["text", "pronunciation", "context"],
          },
        },
      },
      required: ["translation", "breakdown"],
    },
  };
  private currentLanguageConfig: LanguageConfig;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(
        "Gemini API key is missing. Please provide it via GEMINI_API_KEY environment variable."
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.currentLanguageConfig = koreanConfig;
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: this.currentLanguageConfig.systemPrompt,
    });
  }

  async translateText(text: string): Promise<TranslationResponse> {
    try {
      console.log(
        `Starting chat with model: ${
          this.model.model
        } for text: "${text.substring(0, 50)}..."`
      );
      const chatSession: ChatSession = this.model.startChat({
        generationConfig: this.generationConfig,
        history: this.currentLanguageConfig.fewShotHistory,
      });

      const result = await chatSession.sendMessage(text);

      const response = result.response;
      const responseText = response.text();
      console.log(
        "API raw response text:",
        responseText.substring(0, 200) +
          (responseText.length > 200 ? "..." : "")
      );

      try {
        const jsonData: TranslationResponse = JSON.parse(responseText);

        if (!jsonData.translation || !jsonData.breakdown) {
          console.error(
            "Invalid JSON structure (missing core properties):",
            jsonData
          );
          throw new Error(
            "Translation failed: Invalid JSON structure from API."
          );
        }
        console.log("Successfully parsed JSON response.");
        return jsonData;
      } catch (parseError) {
        console.error(
          "Failed to parse API response as JSON:",
          responseText,
          parseError
        );
        throw new Error(
          `Translation failed: Could not parse API response. Raw: ${responseText.substring(
            0,
            100
          )}`
        );
      }
    } catch (error) {
      console.error("Error during chat session or processing response:", error);
      if (error instanceof Error) {
        throw new Error(`Translation API error: ${error.message}`);
      } else {
        throw new Error("An unknown error occurred during translation.");
      }
    }
  }
}
