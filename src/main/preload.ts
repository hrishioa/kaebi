import { contextBridge, ipcRenderer } from "electron";
import type { TranslationEntry, GroupedHistory } from "./history-manager"; // Import types

// Define the API structure exposed to the renderer process
export interface ExposedApi {
  translate: (text: string) => Promise<TranslationEntry | { error: string }>;
  getHistory: () => Promise<GroupedHistory>;
  clearHistory: () => Promise<void>;
  loadTranslation: (entry: TranslationEntry) => Promise<void>; // Added for loading specific history items
  onTranslationLoading: (callback: (originalText: string) => void) => void;
  onShowTranslation: (
    callback: (result: TranslationEntry, langCode: string) => void
  ) => void;
  onTranslationError: (
    callback: (originalText: string, error: string) => void
  ) => void;
  onEmptyState: (callback: () => void) => void;
  onHistoryCleared: (callback: () => void) => void; // Added for history clear confirmation
}

// Expose specific IPC channels to the renderer process
// for security reasons (avoid exposing ipcRenderer directly)
contextBridge.exposeInMainWorld("api", {
  translate: (text: string) => ipcRenderer.invoke("translate-text", text),
  getHistory: () => ipcRenderer.invoke("get-history"),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  loadTranslation: (entry: TranslationEntry) =>
    ipcRenderer.invoke("load-translation", entry),
  onTranslationLoading: (callback: (originalText: string) => void) => {
    ipcRenderer.on("translation-loading", (_, originalText) =>
      callback(originalText)
    );
  },
  onShowTranslation: (
    callback: (result: TranslationEntry, langCode: string) => void
  ) => {
    ipcRenderer.on("show-translation", (_, result, langCode) =>
      callback(result, langCode)
    );
  },
  onTranslationError: (
    callback: (originalText: string, error: string) => void
  ) => {
    ipcRenderer.on("translation-error", (_, originalText, error) =>
      callback(originalText, error)
    );
  },
  onEmptyState: (callback: () => void) => {
    ipcRenderer.on("empty-state", () => callback());
  },
  onHistoryCleared: (callback: () => void) => {
    ipcRenderer.on("history-cleared", () => callback());
  },
});
