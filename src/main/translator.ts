import { GoogleGenerativeAI, ChatSession, Part } from "@google/generative-ai";
import { languageConfigs, LanguageConfig } from "./language-configs";

// --- Define a GENERALIZED Response Structure ---
interface GeneralTranslationResponse {
  translation: {
    text: string;
    pronunciation: string;
    formality: "formal" | "polite" | "casual" | "intimate";
  };
  breakdown: {
    words: {
      original: string;
      targetWord: string; // Generalized from 'korean'
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
              description: "The complete translation",
            },
            pronunciation: {
              type: "string",
              description: "Romanized pronunciation",
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
                    description: "Original word",
                  },
                  targetWord: {
                    type: "string",
                    description: "Translated word in target language",
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
                    description: "Usage notes",
                  },
                },
                required: [
                  "original",
                  "targetWord",
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

  constructor(apiKey: string, targetLanguageCode: string = "ko") {
    if (!apiKey) {
      throw new Error("API key missing.");
    }
    // --- Select language config based on code ---
    const selectedConfig = languageConfigs[targetLanguageCode];
    if (!selectedConfig) {
      throw new Error(
        `Unsupported language code: ${targetLanguageCode}. Available: ${Object.keys(
          languageConfigs
        ).join(", ")}`
      );
    }
    this.currentLanguageConfig = selectedConfig;
    console.log(
      `Translator initialized for language: ${this.currentLanguageConfig.languageName}`
    );

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: this.currentLanguageConfig.systemPrompt,
    });
  }

  async translateText(text: string): Promise<GeneralTranslationResponse> {
    try {
      console.log(
        `Starting chat with model: ${
          this.model.model
        } for text: "${text.substring(0, 50)}..." using ${
          this.currentLanguageConfig.languageName
        } config.`
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
        const jsonData: GeneralTranslationResponse = JSON.parse(responseText);

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
