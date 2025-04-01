# Technical Specification: Korean Translation Menu Bar Application

## 1. Project Overview

A lightweight macOS menu bar application that provides instant Korean translations of clipboard content. The app sits unobtrusively in the menu bar, provides streaming translations with grammatical breakdowns, and maintains a searchable history to aid language learning.

### 1.1 Key Features

- Menu bar presence with minimal resource usage
- Automatic clipboard content translation to Korean
- Token-by-token streaming of translation results
- Markdown-formatted grammar breakdowns
- Translation history with organization by date
- Offline caching of common translations

## 2. Technical Stack

- **Framework**: Electron.js
- **Language**: TypeScript/JavaScript
- **Package Manager**: npm or yarn
- **Translation API**: Gemini
- **Data Storage**: electron-store for local persistence
- **UI Enhancement**: Markdown rendering

## 3. Architecture

### 3.1 Application Structure

```
korean-translator/
├── package.json
├── tsconfig.json
├── src/
│   ├── main/
│   │   ├── main.ts            # Main Electron process
│   │   ├── menu-bar.ts        # Menu bar implementation
│   │   ├── translator.ts      # Translation service
│   │   ├── history-manager.ts # History functionality
│   │   └── preload.ts         # Preload script for renderer
│   ├── renderer/
│   │   ├── index.html         # Main UI template
│   │   ├── styles/
│   │   │   ├── main.css       # Main styling
│   │   │   └── markdown.css   # Markdown styling
│   │   └── scripts/
│   │       ├── renderer.ts    # Renderer process logic
│   │       └── history-view.ts # History UI handling
│   └── shared/
│       ├── types.ts           # Type definitions
│       └── utils.ts           # Shared utilities
├── assets/                    # Icons and images
└── dist/                      # Compiled output
```

### 3.2 Component Interaction Diagram

```
┌───────────────────┐       ┌───────────────────┐
│                   │       │                   │
│   Menu Bar Icon   │◄─────►│   Main Process    │
│                   │       │                   │
└───────────────────┘       └──────────┬────────┘
                                       │
                                       ▼
┌───────────────────┐       ┌───────────────────┐
│                   │       │                   │
│  Renderer Process │◄─────►│ Translation API   │
│                   │       │                   │
└───────────────────┘       └───────────────────┘
        │
        ▼
┌───────────────────┐
│                   │
│  Local Storage    │
│                   │
└───────────────────┘
```

## 4. Detailed Requirements

### 4.1 Menu Bar Integration

- Always visible in the macOS menu bar
- Minimal memory footprint when idle
- Click to open/close translation interface
- Custom icon with active/inactive states

### 4.2 Translation Interface

- Clean, minimal dropdown panel approximately 320x400px
- Automatically detect and translate clipboard text
- Display original text and Korean translation
- Show grammatical breakdown with clear formatting
- Include pronunciation guide (romanization)
- Stream tokens as they arrive from API for immediate feedback

### 4.3 History Functionality

- Automatically save each translation with timestamp
- Group history entries by date
- Limit history to most recent 100 entries
- Allow viewing, searching, and reloading past translations
- If clipboard is empty, show most recent translation

### 4.4 Performance Considerations

- Pre-create window on app startup to minimize display latency
- Cache common translations to reduce API calls
- Efficient DOM updates for streaming tokens
- Graceful degradation when offline

## 5. Implementation Details

### 5.1 Main Process Setup

```typescript
// main.ts
import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
} from "electron";
import { menubar, Menubar } from "menubar";
import path from "path";
import Store from "electron-store";
import { TranslationService } from "./translator";
import { HistoryManager } from "./history-manager";

// Configure storage
const store = new Store();
const historyManager = new HistoryManager(store);
const translationService = new TranslationService();

let mb: Menubar;

app.whenReady().then(() => {
  // Create menubar
  mb = menubar({
    index: path.join(__dirname, "../renderer/index.html"),
    icon: path.join(__dirname, "../../assets/icon.png"),
    browserWindow: {
      width: 320,
      height: 400,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  });

  // Handle menubar interactions
  mb.on("ready", () => {
    console.log("Application is ready");
  });

  mb.on("after-show", () => {
    const clipboardText = clipboard.readText().trim();
    if (clipboardText) {
      handleTranslationRequest(clipboardText);
    } else {
      showLastTranslation();
    }
  });

  // Register IPC handlers
  setupIPCHandlers();
});

function setupIPCHandlers() {
  ipcMain.handle("translate-text", async (_, text) => {
    return handleTranslationRequest(text);
  });

  ipcMain.handle("get-history", async () => {
    return historyManager.getHistory();
  });

  ipcMain.handle("clear-history", async () => {
    return historyManager.clearHistory();
  });
}

async function handleTranslationRequest(text: string) {
  try {
    // Check cache first
    const cached = historyManager.getFromCache(text);
    if (cached) {
      mb.window?.webContents.send("cached-translation", cached);
      return cached;
    }

    // Start streaming translation
    const stream = await translationService.streamTranslation(text);
    let fullResponse = "";

    // Setup stream processing
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      fullResponse += token;
      mb.window?.webContents.send("translation-token", token);
    }

    // Save to history when complete
    const result = {
      original: text,
      translation: fullResponse,
      timestamp: Date.now(),
    };
    historyManager.addToHistory(result);

    return result;
  } catch (error) {
    console.error("Translation error:", error);
    mb.window?.webContents.send("translation-error", error.message);
    return { error: error.message };
  }
}

function showLastTranslation() {
  const lastTranslation = historyManager.getLastTranslation();
  if (lastTranslation) {
    mb.window?.webContents.send("show-translation", lastTranslation);
  } else {
    mb.window?.webContents.send("empty-state");
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
```

### 5.2 Translation Service

```typescript
// translator.ts
import { OpenAI } from "openai";

export class TranslationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });
  }

  async streamTranslation(text: string) {
    return this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Translate the following text to Korean.
                   Provide:
                   1. The Korean translation
                   2. Word-by-word breakdown
                   3. Grammatical explanation
                   4. Pronunciation guide
                   Format using Markdown for clear organization.`,
        },
        { role: "user", content: text },
      ],
      stream: true,
    });
  }

  async translateText(text: string) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Translate the following text to Korean.
                   Provide:
                   1. The Korean translation
                   2. Word-by-word breakdown
                   3. Grammatical explanation
                   4. Pronunciation guide
                   Format using Markdown for clear organization.`,
        },
        { role: "user", content: text },
      ],
    });

    return response.choices[0].message.content;
  }
}
```

### 5.3 History Manager

```typescript
// history-manager.ts
import { Store } from "electron-store";

interface TranslationEntry {
  original: string;
  translation: string;
  timestamp: number;
}

export class HistoryManager {
  private store: Store;
  private cache: Map<string, TranslationEntry>;

  constructor(store: Store) {
    this.store = store;
    this.cache = new Map();

    // Initialize cache from recent history
    const history = this.getHistory();
    history.slice(0, 20).forEach((entry) => {
      this.cache.set(entry.original, entry);
    });
  }

  getHistory(): TranslationEntry[] {
    return this.store.get("translationHistory", []) as TranslationEntry[];
  }

  addToHistory(entry: TranslationEntry): void {
    let history = this.getHistory();

    // Add to beginning of array
    history.unshift(entry);

    // Limit size
    if (history.length > 100) {
      history = history.slice(0, 100);
    }

    this.store.set("translationHistory", history);

    // Update cache
    this.cache.set(entry.original, entry);
  }

  getLastTranslation(): TranslationEntry | null {
    const history = this.getHistory();
    return history.length > 0 ? history[0] : null;
  }

  getFromCache(text: string): TranslationEntry | null {
    return this.cache.get(text) || null;
  }

  clearHistory(): void {
    this.store.set("translationHistory", []);
    this.cache.clear();
  }

  groupHistoryByDate(): Record<string, TranslationEntry[]> {
    const history = this.getHistory();
    const grouped: Record<string, TranslationEntry[]> = {};

    history.forEach((entry) => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });

    return grouped;
  }
}
```

### 5.4 Preload Script

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  translate: (text: string) => ipcRenderer.invoke("translate-text", text),
  getHistory: () => ipcRenderer.invoke("get-history"),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  onTranslationToken: (callback: (token: string) => void) => {
    ipcRenderer.on("translation-token", (_, token) => callback(token));
  },
  onCachedTranslation: (callback: (result: any) => void) => {
    ipcRenderer.on("cached-translation", (_, result) => callback(result));
  },
  onTranslationError: (callback: (error: string) => void) => {
    ipcRenderer.on("translation-error", (_, error) => callback(error));
  },
  onShowTranslation: (callback: (result: any) => void) => {
    ipcRenderer.on("show-translation", (_, result) => callback(result));
  },
  onEmptyState: (callback: () => void) => {
    ipcRenderer.on("empty-state", () => callback());
  },
});
```

### 5.5 Renderer Process

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Korean Translator</title>
    <link rel="stylesheet" href="styles/main.css" />
    <link rel="stylesheet" href="styles/markdown.css" />
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Korean Translator</h1>
        <button id="historyBtn">History</button>
      </div>

      <div id="translationContainer" class="content-area">
        <div id="originalText" class="section"></div>
        <div id="translationOutput" class="section markdown-body"></div>
        <div id="loadingIndicator" class="loading hidden">Translating...</div>
      </div>

      <div id="historyContainer" class="content-area hidden">
        <div id="historyList"></div>
      </div>

      <div id="emptyState" class="content-area hidden">
        <p>
          Copy text to your clipboard and it will automatically translate to
          Korean.
        </p>
      </div>
    </div>

    <script src="scripts/renderer.js"></script>
  </body>
</html>
```

```typescript
// renderer.ts
import { marked } from "marked";

// DOM elements
const translationContainer = document.getElementById(
  "translationContainer"
) as HTMLElement;
const historyContainer = document.getElementById(
  "historyContainer"
) as HTMLElement;
const originalText = document.getElementById("originalText") as HTMLElement;
const translationOutput = document.getElementById(
  "translationOutput"
) as HTMLElement;
const loadingIndicator = document.getElementById(
  "loadingIndicator"
) as HTMLElement;
const historyBtn = document.getElementById("historyBtn") as HTMLElement;
const emptyState = document.getElementById("emptyState") as HTMLElement;
const historyList = document.getElementById("historyList") as HTMLElement;

// State
let isInHistoryView = false;
let currentTranslationText = "";

// Show translation interface
function showTranslationView() {
  isInHistoryView = false;
  translationContainer.classList.remove("hidden");
  historyContainer.classList.add("hidden");
  emptyState.classList.add("hidden");
}

// Show history interface
function showHistoryView() {
  isInHistoryView = true;
  translationContainer.classList.add("hidden");
  historyContainer.classList.remove("hidden");
  emptyState.classList.add("hidden");

  loadHistory();
}

// Show empty state
function showEmptyState() {
  translationContainer.classList.add("hidden");
  historyContainer.classList.add("hidden");
  emptyState.classList.remove("hidden");
}

// Load and display history
async function loadHistory() {
  historyList.innerHTML = '<div class="loading">Loading history...</div>';

  try {
    const history = await window.api.getHistory();

    if (history.length === 0) {
      historyList.innerHTML =
        '<p class="empty-history">No translation history yet.</p>';
      return;
    }

    // Group by date
    const groupedHistory: Record<string, any[]> = {};
    history.forEach((entry) => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      if (!groupedHistory[date]) {
        groupedHistory[date] = [];
      }
      groupedHistory[date].push(entry);
    });

    // Create the HTML
    historyList.innerHTML = "";
    Object.entries(groupedHistory).forEach(([date, entries]) => {
      const section = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = `${date} (${entries.length})`;
      section.appendChild(summary);

      const entriesContainer = document.createElement("div");
      entriesContainer.className = "history-entries";

      entries.forEach((entry) => {
        const entryElement = document.createElement("div");
        entryElement.className = "history-entry";
        entryElement.innerHTML = `
          <div class="history-original">${entry.original}</div>
          <button class="load-translation-btn">Load</button>
        `;

        // Add event listener to load this translation
        const loadBtn = entryElement.querySelector(".load-translation-btn");
        loadBtn?.addEventListener("click", () => {
          loadSavedTranslation(entry);
        });

        entriesContainer.appendChild(entryElement);
      });

      section.appendChild(entriesContainer);
      historyList.appendChild(section);
    });
  } catch (error) {
    historyList.innerHTML = `<p class="error">Error loading history: ${error.message}</p>`;
  }
}

// Load a saved translation
function loadSavedTranslation(entry) {
  showTranslationView();
  originalText.textContent = entry.original;
  translationOutput.innerHTML = marked.parse(entry.translation);
}

// Start a new translation
async function startTranslation(text) {
  if (!text.trim()) {
    showEmptyState();
    return;
  }

  showTranslationView();
  originalText.textContent = text;
  translationOutput.innerHTML = "";
  loadingIndicator.classList.remove("hidden");
  currentTranslationText = "";

  // Request translation
  window.api.translate(text);
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Set up event listeners
  historyBtn.addEventListener("click", () => {
    if (isInHistoryView) {
      showTranslationView();
    } else {
      showHistoryView();
    }
  });

  // Listen for translation tokens
  window.api.onTranslationToken((token) => {
    loadingIndicator.classList.add("hidden");
    currentTranslationText += token;
    translationOutput.innerHTML = marked.parse(currentTranslationText);
  });

  // Listen for cached translations
  window.api.onCachedTranslation((result) => {
    loadingIndicator.classList.add("hidden");
    translationOutput.innerHTML = marked.parse(result.translation);
  });

  // Listen for errors
  window.api.onTranslationError((error) => {
    loadingIndicator.classList.add("hidden");
    translationOutput.innerHTML = `<div class="error">Error: ${error}</div>`;
  });

  // Listen for show translation requests
  window.api.onShowTranslation((result) => {
    loadSavedTranslation(result);
  });

  // Listen for empty state
  window.api.onEmptyState(() => {
    showEmptyState();
  });
});
```

### 5.6 CSS Styling

```css
/* main.css */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f7;
  color: #1d1d1f;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 400px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #d2d2d7;
}

.header h1 {
  font-size: 16px;
  margin: 0;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.hidden {
  display: none;
}

.section {
  margin-bottom: 15px;
  padding: 10px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

#originalText {
  font-weight: 500;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #86868b;
}

.error {
  color: #ff3b30;
  padding: 10px;
  border-radius: 5px;
  background-color: #fff2f2;
}

button {
  background-color: #0071e3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
}

button:hover {
  background-color: #0077ed;
}

/* History styles */
.history-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin-bottom: 10px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.history-original {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

details summary {
  cursor: pointer;
  padding: 10px 0;
  font-weight: 500;
}

.empty-history {
  text-align: center;
  color: #86868b;
  padding: 20px;
}
```

## 6. Packaging and Distribution

### 6.1 Package Configuration

```json
// package.json
{
  "name": "korean-translator",
  "version": "1.0.0",
  "description": "A menu bar app for Korean translations",
  "main": "dist/main/main.js",
  "scripts": {
    "start": "electron .",
    "build": "tsc",
    "watch": "tsc -w",
    "dev": "npm run build && npm run start",
    "pack": "electron-builder --dir",
    "dist": "electron-builder",
    "postinstall": "electron-builder install-app-deps"
  },
  "build": {
    "appId": "com.koreanTranslator.app",
    "productName": "Korean Translator",
    "mac": {
      "category": "public.app-category.utilities",
      "icon": "assets/icon.icns"
    },
    "files": ["dist/**/*", "assets/**/*", "package.json"]
  },
  "dependencies": {
    "electron-store": "^8.1.0",
    "marked": "^4.3.0",
    "menubar": "^9.3.0",
    "openai": "^4.0.0"
  },
  "devDependencies": {
    "electron": "^25.0.0",
    "electron-builder": "^24.4.0",
    "typescript": "^5.0.0"
  }
}
```

### 6.2 TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "sourceMap": true,
    "outDir": "dist",
    "strict": true,
    "lib": ["DOM", "ES2020"],
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

## 7. Environment Setup

### 7.1 API Key Configuration

Create a `.env` file (not committed to version control):

```
OPENAI_API_KEY=your_api_key_here
```

Add code in main.ts to load environment variables:

```typescript
import dotenv from "dotenv";
dotenv.config();
```

### 7.2 Development Process

1. Clone repository
2. `npm install` to install dependencies
3. Add `.env` file with OpenAI API key
4. `npm run dev` to build and start the application
5. `npm run dist` to create distributable

## 8. Error Handling and Edge Cases

1. **Network errors**: Show appropriate message with retry option
2. **Empty clipboard**: Show last translation or empty state
3. **API rate limiting**: Implement exponential backoff
4. **Large text**: Add character limit with warning
5. **Failed to start**: Provide troubleshooting steps in logs

## 9. Testing Plan

1. **Unit Tests**: Test individual components (translator, history manager)
2. **Integration Tests**: Test component interaction
3. **UI Tests**: Test user interactions
4. **Performance Tests**: Measure memory usage and response times

## 10. Future Enhancements

1. **Multiple language support**: Extend beyond Korean
2. **Export functionality**: Save translations to CSV/PDF
3. **User preferences**: Customize appearance and behavior
4. **Offline mode**: Enhanced caching and offline capabilities
5. **Improved analysis**: Language learning metrics and progress tracking

---

This specification provides a comprehensive guide for implementing the Korean Translation Menu Bar Application with all the requested features. The implementation is focused on providing a smooth, intuitive user experience while supporting effective language learning.
