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
                text: "뭐해? 나중에 커피 마실래?",
                pronunciation: "mwo-hae? na-jung-e keo-pi ma-sil-lae?",
                formality: "intimate",
              },
              breakdown: {
                words: [
                  {
                    original: "what are you up to",
                    korean: "뭐해",
                    pronunciation: "mwo-hae",
                    partOfSpeech: "verb",
                    notes: "Casual way to ask what someone is doing",
                  },
                  {
                    original: "later",
                    korean: "나중에",
                    pronunciation: "na-jung-e",
                    partOfSpeech: "adverb",
                    notes: "Time adverb with particle -에",
                  },
                  {
                    original: "coffee",
                    korean: "커피",
                    pronunciation: "keo-pi",
                    partOfSpeech: "noun",
                    notes: "Loanword from English",
                  },
                  {
                    original: "wanna grab",
                    korean: "마실래",
                    pronunciation: "ma-sil-lae",
                    partOfSpeech: "verb",
                    notes: "Using -ㄹ래 ending for suggestions",
                  },
                ],
              },
              tips: [
                "This extremely casual phrasing is only appropriate with close friends",
                "Korean text messages are typically much shorter than English ones",
                "The -ㄹ래 ending is used for casual invitations and suggestions",
              ],
              alternatives: [
                {
                  text: "지금 뭐 해? 나중에 커피 마시자",
                  pronunciation: "ji-geum mwo hae? na-jung-e keo-pi ma-si-ja",
                  context:
                    "Using 'let's' form as a more direct suggestion between friends",
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
                text: "저는 우리 모두가 자신의 운명을 만들 수 있는 힘을 가지고 있다고 믿습니다.",
                pronunciation:
                  "jeo-neun u-ri mo-du-ga ja-sin-ui un-myeong-eul man-deul su it-neun him-eul ga-ji-go it-da-go mid-seub-ni-da.",
                formality: "polite",
              },
              breakdown: {
                words: [
                  {
                    original: "I",
                    korean: "저는",
                    pronunciation: "jeo-neun",
                    partOfSpeech: "pronoun",
                    notes: "Humble form of 'I' with subject particle -는",
                  },
                  {
                    original: "believe",
                    korean: "믿습니다",
                    pronunciation: "mid-seub-ni-da",
                    partOfSpeech: "verb",
                    notes: "Polite formal ending -ㅂ니다",
                  },
                  {
                    original: "we all",
                    korean: "우리 모두가",
                    pronunciation: "u-ri mo-du-ga",
                    partOfSpeech: "pronoun",
                    notes: "우리 (we) + 모두 (all) + subject particle 가",
                  },
                  {
                    original: "destiny",
                    korean: "운명을",
                    pronunciation: "un-myeong-eul",
                    partOfSpeech: "noun",
                    notes: "운명 (fate) + object particle 을",
                  },
                  {
                    original: "to make",
                    korean: "만들 수 있는",
                    pronunciation: "man-deul su it-neun",
                    partOfSpeech: "verb",
                    notes: "만들다 (make) + 수 있다 (can) construction",
                  },
                  {
                    original: "power",
                    korean: "힘을",
                    pronunciation: "him-eul",
                    partOfSpeech: "noun",
                    notes: "힘 (strength) + object particle 을",
                  },
                ],
              },
              tips: [
                "The formal -ㅂ니다 ending adds weight to philosophical statements",
                "The pattern -(으)ㄹ 수 있다 means 'to be able to do something'",
                "Using 저 instead of 나 shows respect to listeners",
              ],
              alternatives: [
                {
                  text: "우리는 모두 자신의 운명을 스스로 개척할 힘이 있어요.",
                  pronunciation:
                    "u-ri-neun mo-du ja-sin-ui un-myeong-eul seu-seu-ro gae-cheok-hal him-i i-sseo-yo.",
                  context: "More conversational version with the same meaning",
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
