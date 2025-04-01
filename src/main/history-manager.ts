import Store from "electron-store";

// Define the structure for a translation entry
// Using the structure from translator.ts for the 'translation' part
export interface TranslationEntry {
  original: string;
  translation: any; // Store the full JSON response from Gemini
  timestamp: number;
}

// Define the structure for grouped history
export type GroupedHistory = Record<string, TranslationEntry[]>;

// Define the schema for the electron-store
export type StoreSchema = {
  translationHistory: TranslationEntry[];
};

export class HistoryManager {
  private store: Store<StoreSchema>; // Use the defined schema
  private cache: Map<string, TranslationEntry>; // Cache for quick lookups
  private readonly historyKey = "translationHistory";
  private readonly maxHistorySize = 100;
  private readonly maxCacheSize = 20; // Cache the most recent entries

  constructor(store: Store<StoreSchema>) {
    // Expect the typed store
    this.store = store;
    this.cache = new Map();
    this.loadCacheFromHistory();
  }

  private loadCacheFromHistory(): void {
    const history = this.getHistory();
    // Load the most recent items into the cache
    history.slice(0, this.maxCacheSize).forEach((entry) => {
      // Ensure we don't cache errored entries if they somehow get saved
      if (entry.original && entry.translation && !entry.translation.error) {
        this.cache.set(entry.original, entry);
      }
    });
    console.log(`Cache loaded with ${this.cache.size} items.`);
  }

  getHistory(): TranslationEntry[] {
    // Retrieve history using the key, default to empty array
    // Workaround: Use 'as any' to bypass type checking for get/set
    return (this.store as any).get(this.historyKey, []);
  }

  addToHistory(entry: TranslationEntry): void {
    let history = this.getHistory();
    history.unshift(entry);

    if (history.length > this.maxHistorySize) {
      history = history.slice(0, this.maxHistorySize);
    }

    // Persist the updated history using the key
    (this.store as any).set(this.historyKey, history);
    console.log(`Entry added to history. New size: ${history.length}`);

    this.cache.set(entry.original, entry);
    if (this.cache.size > this.maxCacheSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }

  getLastTranslation(): TranslationEntry | null {
    const history = this.getHistory();
    return history.length > 0 ? history[0] : null;
  }

  getFromCache(text: string): TranslationEntry | null {
    return this.cache.get(text) || null;
  }

  clearHistory(): void {
    // Clear history using the key
    (this.store as any).set(this.historyKey, []);
    this.cache.clear();
    console.log("History and cache cleared.");
  }

  groupHistoryByDate(): GroupedHistory {
    const history = this.getHistory();
    const grouped: GroupedHistory = {};

    history.forEach((entry) => {
      // Use locale-specific date string for grouping key
      const date = new Date(entry.timestamp).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });

    console.log(
      `History grouped by date into ${Object.keys(grouped).length} groups.`
    );
    return grouped;
  }
}
