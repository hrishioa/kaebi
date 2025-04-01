const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const fs = require("node:fs");
const mime = require("mime-types");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction:
    'You are a Korean language expert. Translate the provided text into natural Korean and break it down for language learners. Focus on brevity while maintaining educational value.\n\n## Response Format\n\nRespond ONLY with valid JSON following this structure:\n\n```json\n{\n  "translation": {\n    "text": "Korean translation",\n    "pronunciation": "Romanized pronunciation",\n    "formality": "formal/polite/casual/intimate"\n  },\n  "breakdown": {\n    "words": [\n      {\n        "original": "Original word",\n        "korean": "Korean word",\n        "pronunciation": "Romanized pronunciation",\n        "partOfSpeech": "noun/verb/etc.",\n        "notes": "Brief usage notes"\n      }\n      // Add entry for each key word\n    ]\n  },\n  "tips": [\n    "Cultural insight or usage tip",\n    "Pronunciation or context advice"\n    // 2-3 brief tips maximum\n  ],\n  "alternatives": [\n    {\n      "text": "Alternative expression",\n      "pronunciation": "Romanized pronunciation",\n      "context": "When to use this alternative"\n    }\n    // 1-2 useful alternatives maximum\n  ]\n}\n```\n\n## Guidelines\n\n- Keep all explanations concise (1-2 sentences max)\n- Use standard romanization\n- Focus on practical usage rather than linguistic theory\n- Prioritize common vocabulary and expressions\n- Include only the most essential cultural context\n- Default to polite form (-요/-습니다) unless context suggests otherwise',
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseModalities: [],
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
              required: ["original", "korean", "pronunciation", "partOfSpeech"],
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
            text: {
              type: "string",
              description: "Alternative expression",
            },
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

async function run() {
  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [{ text: "hey what are you up to? wanna grab coffee later?" }],
      },
      {
        role: "model",
        parts: [
          {
            text: '{\n  "translation": {\n    "text": "뭐해? 나중에 커피 마실래?",\n    "pronunciation": "mwo-hae? na-jung-e keo-pi ma-sil-lae?",\n    "formality": "intimate"\n  },\n  "breakdown": {\n    "words": [\n      {\n        "original": "what are you up to",\n        "korean": "뭐해",\n        "pronunciation": "mwo-hae",\n        "partOfSpeech": "verb",\n        "notes": "Casual way to ask what someone is doing"\n      },\n      {\n        "original": "later",\n        "korean": "나중에",\n        "pronunciation": "na-jung-e",\n        "partOfSpeech": "adverb",\n        "notes": "Time adverb with particle -에"\n      },\n      {\n        "original": "coffee",\n        "korean": "커피",\n        "pronunciation": "keo-pi",\n        "partOfSpeech": "noun",\n        "notes": "Loanword from English"\n      },\n      {\n        "original": "wanna grab",\n        "korean": "마실래",\n        "pronunciation": "ma-sil-lae",\n        "partOfSpeech": "verb",\n        "notes": "Using -ㄹ래 ending for suggestions"\n      }\n    ]\n  },\n  "tips": [\n    "This extremely casual phrasing is only appropriate with close friends",\n    "Korean text messages are typically much shorter than English ones",\n    "The -ㄹ래 ending is used for casual invitations and suggestions"\n  ],\n  "alternatives": [\n    {\n      "text": "지금 뭐 해? 나중에 커피 마시자",\n      "pronunciation": "ji-geum mwo hae? na-jung-e keo-pi ma-si-ja",\n      "context": "Using \'let\'s\' form as a more direct suggestion between friends"\n    }\n  ]\n}',
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
            text: '{\n  "translation": {\n    "text": "저는 우리 모두가 자신의 운명을 만들 수 있는 힘을 가지고 있다고 믿습니다.",\n    "pronunciation": "jeo-neun u-ri mo-du-ga ja-sin-ui un-myeong-eul man-deul su it-neun him-eul ga-ji-go it-da-go mid-seub-ni-da.",\n    "formality": "polite"\n  },\n  "breakdown": {\n    "words": [\n      {\n        "original": "I",\n        "korean": "저는",\n        "pronunciation": "jeo-neun",\n        "partOfSpeech": "pronoun",\n        "notes": "Humble form of \'I\' with subject particle -는"\n      },\n      {\n        "original": "believe",\n        "korean": "믿습니다",\n        "pronunciation": "mid-seub-ni-da",\n        "partOfSpeech": "verb",\n        "notes": "Polite formal ending -ㅂ니다"\n      },\n      {\n        "original": "we all",\n        "korean": "우리 모두가",\n        "pronunciation": "u-ri mo-du-ga",\n        "partOfSpeech": "pronoun",\n        "notes": "우리 (we) + 모두 (all) + subject particle 가"\n      },\n      {\n        "original": "destiny",\n        "korean": "운명을",\n        "pronunciation": "un-myeong-eul",\n        "partOfSpeech": "noun",\n        "notes": "운명 (fate) + object particle 을"\n      },\n      {\n        "original": "to make",\n        "korean": "만들 수 있는",\n        "pronunciation": "man-deul su it-neun",\n        "partOfSpeech": "verb",\n        "notes": "만들다 (make) + 수 있다 (can) construction"\n      },\n      {\n        "original": "power",\n        "korean": "힘을",\n        "pronunciation": "him-eul",\n        "partOfSpeech": "noun",\n        "notes": "힘 (strength) + object particle 을"\n      }\n    ]\n  },\n  "tips": [\n    "The formal -ㅂ니다 ending adds weight to philosophical statements",\n    "The pattern -(으)ㄹ 수 있다 means \'to be able to do something\'",\n    "Using 저 instead of 나 shows respect to listeners"\n  ],\n  "alternatives": [\n    {\n      "text": "우리는 모두 자신의 운명을 스스로 개척할 힘이 있어요.",\n      "pronunciation": "u-ri-neun mo-du ja-sin-ui un-myeong-eul seu-seu-ro gae-cheok-hal him-i i-sseo-yo.",\n      "context": "More conversational version with the same meaning"\n    }\n  ]\n}',
          },
        ],
      },
    ],
  });

  const result = await chatSession.sendMessage(
    "This would be a sentence to translate."
  );
  // TODO: Following code needs to be updated for client-side apps.
  const candidates = result.response.candidates;
  for (
    let candidate_index = 0;
    candidate_index < candidates.length;
    candidate_index++
  ) {
    for (
      let part_index = 0;
      part_index < candidates[candidate_index].content.parts.length;
      part_index++
    ) {
      const part = candidates[candidate_index].content.parts[part_index];
      if (part.inlineData) {
        try {
          const filename = `output_${candidate_index}_${part_index}.${mime.extension(
            part.inlineData.mimeType
          )}`;
          fs.writeFileSync(
            filename,
            Buffer.from(part.inlineData.data, "base64")
          );
          console.log(`Output written to: ${filename}`);
        } catch (err) {
          console.error(err);
        }
      }
    }
  }
  console.log(result.response.text());
}

run();
