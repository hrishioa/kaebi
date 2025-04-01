import type { Part } from "@google/generative-ai";

// --- Configuration Structure for Different Languages ---
export interface LanguageConfig {
  languageName: string; // e.g., "Korean"
  targetLanguageCode: string; // e.g., "ko"
  systemPrompt: string;
  fewShotHistory: { role: string; parts: Part[] }[];
  // modelName?: string; // Optional: Could specify model per language
}

// --- Korean Configuration (Extracted from translator.ts / example_call.ts) ---
const koreanConfig: LanguageConfig = {
  languageName: "Korean",
  targetLanguageCode: "ko",
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
          // Using JSON.stringify ensures valid JSON within the history text part
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
                    targetWord: "뭐해",
                    pronunciation: "mwo-hae",
                    partOfSpeech: "verb",
                    notes: "Casual way to ask what someone is doing",
                  },
                  {
                    original: "later",
                    targetWord: "나중에",
                    pronunciation: "na-jung-e",
                    partOfSpeech: "adverb",
                    notes: "Time adverb with particle -에",
                  },
                  {
                    original: "coffee",
                    targetWord: "커피",
                    pronunciation: "keo-pi",
                    partOfSpeech: "noun",
                    notes: "Loanword from English",
                  },
                  {
                    original: "wanna grab",
                    targetWord: "마실래",
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
            0
          ), // Using 0 for minimal spacing in history
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
                    targetWord: "저는",
                    pronunciation: "jeo-neun",
                    partOfSpeech: "pronoun",
                    notes: "Humble form of 'I' with subject particle -는",
                  },
                  {
                    original: "believe",
                    targetWord: "믿습니다",
                    pronunciation: "mid-seub-ni-da",
                    partOfSpeech: "verb",
                    notes: "Polite formal ending -ㅂ니다",
                  },
                  {
                    original: "we all",
                    targetWord: "우리 모두가",
                    pronunciation: "u-ri mo-du-ga",
                    partOfSpeech: "pronoun",
                    notes: "우리 (we) + 모두 (all) + subject particle 가",
                  },
                  {
                    original: "destiny",
                    targetWord: "운명을",
                    pronunciation: "un-myeong-eul",
                    partOfSpeech: "noun",
                    notes: "운명 (fate) + object particle 을",
                  },
                  {
                    original: "to make",
                    targetWord: "만들 수 있는",
                    pronunciation: "man-deul su it-neun",
                    partOfSpeech: "verb",
                    notes: "만들다 (make) + 수 있다 (can) construction",
                  },
                  {
                    original: "power",
                    targetWord: "힘을",
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
            0
          ), // Using 0 for minimal spacing in history
        },
      ],
    },
  ],
};
// --- End Korean Configuration ---

// --- Malayalam Configuration ---
const malayalamConfig: LanguageConfig = {
  languageName: "Malayalam",
  targetLanguageCode: "ml",
  systemPrompt:
    'You are a Malayalam language expert. Translate the provided text into natural Malayalam and break it down for language learners. Focus on brevity while maintaining educational value.\n\n## Response Format\n\nRespond ONLY with valid JSON following this structure:\n\n```json\n{\n  "translation": {\n    "text": "Malayalam translation",\n    "pronunciation": "Romanized pronunciation",\n    "formality": "formal/polite/casual/intimate"\n  },\n  "breakdown": {\n    "words": [\n      {\n        "original": "Original word",\n        "malayalam": "Malayalam word",\n        "pronunciation": "Romanized pronunciation",\n        "partOfSpeech": "noun/verb/etc.",\n        "notes": "Brief usage notes"\n      }\n      // Add entry for each key word\n    ]\n  },\n  "tips": [\n    "Cultural insight or usage tip",\n    "Pronunciation or context advice"\n    // 2-3 brief tips maximum\n  ],\n  "alternatives": [\n    {\n      "text": "Alternative expression",\n      "pronunciation": "Romanized pronunciation",\n      "context": "When to use this alternative"\n    }\n    // 1-2 useful alternatives maximum\n  ]\n}\n```\n\n## Guidelines\n\n- Keep all explanations concise (1-2 sentences max)\n- Use standard romanization, making sure to capture Malayalam sounds accurately\n- Focus on practical usage rather than linguistic theory\n- Prioritize common vocabulary and expressions\n- Include only the most essential cultural context\n- Default to polite form unless context suggests otherwise',
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
                text: "എന്താ ചെയ്യുന്നേ? പിന്നീട് കാപ്പി കുടിക്കാൻ വരുന്നോ?",
                pronunciation:
                  "enthaa cheyyunne? pinniid kaappi kudikkaan varunno?",
                formality: "intimate",
              },
              breakdown: {
                words: [
                  {
                    original: "what are you up to",
                    targetWord: "എന്താ ചെയ്യുന്നേ",
                    pronunciation: "enthaa cheyyunne",
                    partOfSpeech: "interrogative phrase",
                    notes:
                      "Casual question form with -ഏ ending indicating familiarity",
                  },
                  {
                    original: "later",
                    targetWord: "പിന്നീട്",
                    pronunciation: "pinniid",
                    partOfSpeech: "adverb",
                    notes: "Temporal adverb meaning 'afterward' or 'later'",
                  },
                  {
                    original: "coffee",
                    targetWord: "കാപ്പി",
                    pronunciation: "kaappi",
                    partOfSpeech: "noun",
                    notes: "Loanword commonly used in Malayalam",
                  },
                  {
                    original: "wanna grab/drink",
                    targetWord: "കുടിക്കാൻ",
                    pronunciation: "kudikkaan",
                    partOfSpeech: "verb",
                    notes: "Infinitive form of 'to drink'",
                  },
                  {
                    original: "will you come",
                    targetWord: "വരുന്നോ",
                    pronunciation: "varunno",
                    partOfSpeech: "verb",
                    notes: "Question form of 'coming' with intimate tone",
                  },
                ],
              },
              tips: [
                "The -ഏ ending in 'ചെയ്യുന്നേ' indicates casual speech between friends",
                "Malayalam often uses 'will you come' (വരുന്നോ) structure for invitations",
                "The rising intonation at the end of questions is important in Malayalam",
              ],
              alternatives: [
                {
                  text: "എന്തൊക്കെ ഉണ്ട് വിശേഷം? നമുക്ക് പിന്നീട് ഒരു കാപ്പി കുടിക്കാം",
                  pronunciation:
                    "enthokke undu vishesham? namukku pinniid oru kaappi kudikkaam",
                  context:
                    "More elaborate way to ask 'what's up' and suggest coffee using 'let's' form",
                },
              ],
            },
            null,
            0
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
                text: "നമ്മുടെ സ്വന്തം വിധി നിർണയിക്കാനുള്ള ശക്തി നമ്മൾ എല്ലാവർക്കും ഉണ്ടെന്ന് ഞാൻ വിശ്വസിക്കുന്നു.",
                pronunciation:
                  "nammude swantham vidhi nirṇayikkaanuḷḷa śakthi nammaḷ ellāvarkkum uṇṭennu ñaan viśvasikkunnu.",
                formality: "polite",
              },
              breakdown: {
                words: [
                  {
                    original: "I",
                    targetWord: "ഞാൻ",
                    pronunciation: "ñaan",
                    partOfSpeech: "pronoun",
                    notes: "First person singular pronoun",
                  },
                  {
                    original: "believe",
                    targetWord: "വിശ്വസിക്കുന്നു",
                    pronunciation: "viśvasikkunnu",
                    partOfSpeech: "verb",
                    notes: "Present tense of 'to believe'",
                  },
                  {
                    original: "we all",
                    targetWord: "നമ്മൾ എല്ലാവർക്കും",
                    pronunciation: "nammaḷ ellāvarkkum",
                    partOfSpeech: "pronoun + universal quantifier",
                    notes: "Inclusive 'we' with 'all' including dative case",
                  },
                  {
                    original: "destiny",
                    targetWord: "വിധി",
                    pronunciation: "vidhi",
                    partOfSpeech: "noun",
                    notes:
                      "Can mean 'fate' or 'destiny', has cultural significance",
                  },
                  {
                    original: "to make/determine",
                    targetWord: "നിർണയിക്കാനുള്ള",
                    pronunciation: "nirṇayikkaanuḷḷa",
                    partOfSpeech: "verb",
                    notes:
                      "Infinitive form + possessive marker, means 'to determine'",
                  },
                  {
                    original: "power",
                    targetWord: "ശക്തി",
                    pronunciation: "śakthi",
                    partOfSpeech: "noun",
                    notes: "Common noun for 'power' or 'strength'",
                  },
                ],
              },
              tips: [
                "Malayalam sentences typically follow subject-object-verb order",
                "The quotative marker എന്ന് (ennu) with ഉണ്ട് (uṇṭ) creates the 'that' clause structure",
                "The word 'വിധി' (vidhi) has cultural significance in Malayalam philosophy",
              ],
              alternatives: [
                {
                  text: "നമ്മുടെ ഭാവി നമ്മൾ തന്നെ നിർമ്മിക്കുന്നതാണെന്ന് ഞാൻ കരുതുന്നു.",
                  pronunciation:
                    "nammude bhaavi nammaḷ thanne nirmikkunnathaannennu ñaan karuthunnu.",
                  context:
                    "Alternative using 'future' (ഭാവി) instead of 'destiny' and 'create' instead of 'determine'",
                },
              ],
            },
            null,
            0
          ),
        },
      ],
    },
  ],
};

export const languageConfigs: Record<string, LanguageConfig> = {
  ko: koreanConfig,
  ml: malayalamConfig,
};
