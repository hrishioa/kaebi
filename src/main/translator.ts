import {
  GoogleGenerativeAI,
  // HarmCategory, // Not explicitly used, can be removed if desired
  // HarmBlockThreshold, // Not explicitly used
  GenerateContentResult,
  ChatSession,
} from "@google/generative-ai";

// Define the expected JSON response structure based on example_call.ts
// (You might want to move this to a shared types.ts file later)
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

export class TranslationService {
  private genAI: GoogleGenerativeAI;
  private model: any; // Adjust type if specific model type is available
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

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(
        "Gemini API key is missing. Please provide it via GEMINI_API_KEY environment variable."
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // --- Revert to the model used in the example ---
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Use the model from example_call.ts
      // System instruction (remains the same)
      systemInstruction:
        'You are a Korean language expert. Translate the provided text into natural Korean and break it down for language learners. Focus on brevity while maintaining educational value.\n\n## Response Format\n\nRespond ONLY with valid JSON following this structure:\n\n```json\n{\n  "translation": {\n    "text": "Korean translation",\n    "pronunciation": "Romanized pronunciation",\n    "formality": "formal/polite/casual/intimate"\n  },\n  "breakdown": {\n    "words": [\n      {\n        "original": "Original word",\n        "korean": "Korean word",\n        "pronunciation": "Romanized pronunciation",\n        "partOfSpeech": "noun/verb/etc.",\n        "notes": "Brief usage notes"\n      }\n      // Add entry for each key word\n    ]\n  },\n  "tips": [\n    "Cultural insight or usage tip",\n    "Pronunciation or context advice"\n    // 2-3 brief tips maximum\n  ],\n  "alternatives": [\n    {\n      "text": "Alternative expression",\n      "pronunciation": "Romanized pronunciation",\n      "context": "When to use this alternative"\n    }\n    // 1-2 useful alternatives maximum\n  ]\n}\n```\n\n## Guidelines\n\n- Keep all explanations concise (1-2 sentences max)\n- Use standard romanization\n- Focus on practical usage rather than linguistic theory\n- Prioritize common vocabulary and expressions\n- Include only the most essential cultural context\n- Default to polite form (-요/-습니다) unless context suggests otherwise',
    });
  }

  // Non-streaming translation method based on example_call.ts structure
  async translateText(text: string): Promise<TranslationResponse> {
    try {
      console.log(
        `Starting chat with model: ${
          this.model.model
        } for text: "${text.substring(0, 50)}..."`
      );
      // Start a new chat session for each translation request
      const chatSession: ChatSession = this.model.startChat({
        generationConfig: this.generationConfig,
        history: [], // No history needed for single-turn translation
      });

      // Send the text as a message
      const result = await chatSession.sendMessage(text);

      const response = result.response;
      const responseText = response.text();
      console.log(
        "API raw response text:",
        responseText.substring(0, 200) +
          (responseText.length > 200 ? "..." : "")
      ); // Log truncated response

      // Attempt to parse directly
      try {
        const jsonData: TranslationResponse = JSON.parse(responseText);

        // Basic validation (check if core properties exist)
        if (!jsonData.translation || !jsonData.breakdown) {
          console.error(
            "Invalid JSON structure received (missing core properties):",
            jsonData
          );
          throw new Error(
            "Translation failed: Invalid JSON structure received from API."
          );
        }
        console.log("Successfully parsed JSON response.");
        return jsonData;
      } catch (parseError) {
        // This catch block handles errors if JSON.parse fails
        console.error(
          "Failed to parse API response as JSON:",
          responseText,
          parseError
        );
        // Include the raw text in the error for debugging
        throw new Error(
          `Translation failed: Could not parse API response. Raw: ${responseText.substring(
            0,
            100
          )}`
        );
      }
    } catch (error) {
      // This catch block handles errors from the API call itself (e.g., network issues, API key errors)
      console.error("Error during chat session or processing response:", error);
      if (error instanceof Error) {
        // Re-throw with a more specific message
        throw new Error(`Translation API error: ${error.message}`);
      } else {
        throw new Error("An unknown error occurred during translation.");
      }
    }
  }

  // Optional: Implement streamTranslation if needed later, spec requires it but example didn't use streaming.
  // async streamTranslation(text: string) {
  //   // ... Implementation using Gemini streaming API ...
  // }
}
