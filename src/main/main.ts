// main.ts
// Import Electron default export and destructure
import electron from "electron";
const { app, BrowserWindow, clipboard, ipcMain, globalShortcut } = electron;

import { menubar, Menubar } from "menubar";
import path from "path";
// Remove the static import for Store
// import Store from "electron-store";
import { TranslationService } from "./translator";
import {
  HistoryManager,
  TranslationEntry,
  StoreSchema,
} from "./history-manager";
import dotenv from "dotenv";
import fs from "fs"; // Import fs to check file existence

// Load environment variables from .env file
dotenv.config();

// Declare store variable, will be initialized asynchronously
let store: any; // Use any initially, will be properly typed after import
let historyManager: HistoryManager;
let translationService: TranslationService;

// Fix for __dirname in ES modules
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize services asynchronously before creating the menubar
async function initializeApp() {
  // Dynamically import electron-store
  const { default: Store } = await import("electron-store");

  // Configure storage with the schema and default value
  store = new Store<StoreSchema>({
    defaults: {
      translationHistory: [],
    },
  });

  // Initialize managers/services *after* store is ready
  historyManager = new HistoryManager(store);
  translationService = new TranslationService(process.env.GEMINI_API_KEY || "");

  // Now create the menubar
  createMenubar();
  registerShortcuts(); // Register shortcuts after menubar might be created
}

let mb: Menubar;

function createMenubar() {
  // Use app.getAppPath() for potentially more robust path resolution in packaged app
  // Note: __dirname points to dist/main after build
  const appPath = app.getAppPath(); // Gets the path to the app's ASAR file or source root
  // If running from source (__dirname is in dist/main), go up two levels then to assets
  // If running packaged (appPath is usually '/Applications/AppName.app/Contents/Resources/app.asar'), need different relative path
  // Let's try relative from __dirname first, as it worked for finding the file previously.
  // We could add more complex logic later if needed for packaged app path differences.
  const iconPath = path.join(__dirname, "../../assets/iconTemplate.png");
  console.log(`App Path: ${appPath}`);
  console.log(`Attempting to load icon from: ${iconPath}`);

  // Check if icon file exists
  if (!fs.existsSync(iconPath)) {
    console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    console.error(`Error: Menu bar icon not found at ${iconPath}`);
    console.error(
      `Ensure 'iconTemplate.png' exists in the 'assets' directory.`
    );
    console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    // Optionally: Fallback icon or quit? For now, we'll let menubar try.
  } else {
    console.log("Icon file found.");
  }

  try {
    console.log("Initializing menubar...");
    mb = menubar({
      index: `file://${path.join(__dirname, "../../src/renderer/index.html")}`,
      icon: iconPath,
      browserWindow: {
        width: 380,
        height: 500,
        alwaysOnTop: true,
        webPreferences: {
          // Ensure preload path is correct relative to __dirname (which is in dist/main)
          preload: path.join(__dirname, "preload.js"),
          contextIsolation: true,
          nodeIntegration: false,
        },
      },
      preloadWindow: true,
      showDockIcon: false,
    });
    console.log("Menubar object created.");

    mb.on("ready", () => {
      console.log("Menubar is ready. Tray should be visible.");
      mb.tray.setToolTip("Korean Translator (Cmd+Shift+T)");
    });

    mb.on("after-show", () => {
      console.log("Menubar window shown (after-show event).");
      // Ensure historyManager is initialized before accessing
      if (!historyManager) return;
      const clipboardText = clipboard.readText().trim();
      console.log("Window shown, clipboard:", clipboardText);
      if (clipboardText) {
        handleTranslationRequest(clipboardText);
      } else {
        showLastTranslation();
      }
    });

    mb.on("focus-lost", () => {
      console.log("Menubar focus lost.");
      // mb.hideWindow(); // Keep hidden on focus lost
    });

    mb.on("error", (error) => {
      console.error("!!!!!!!!!!!!!!!! Menubar Error !!!!!!!!!!!!!!!!");
      console.error(error);
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    });

    // Register IPC handlers (ensure services are initialized)
    if (historyManager && translationService) {
      setupIPCHandlers();
    } else {
      console.error("Services not initialized before setting up IPC handlers.");
      // Handle error appropriately, maybe quit the app or show an error message
    }
  } catch (error) {
    console.error(
      "!!!!!!!!!!!!!!!! Error during menubar init !!!!!!!!!!!!!!!!"
    );
    console.error(error);
    console.error(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    );
  }
}

function registerShortcuts() {
  console.log("Registering global shortcuts...");
  const ret = globalShortcut.register("CommandOrControl+Shift+T", () => {
    console.log("Global shortcut Cmd+Shift+T pressed");
    if (mb) {
      // Toggle window visibility
      if (mb.window && mb.window.isVisible()) {
        console.log("Hiding window via shortcut");
        mb.hideWindow();
      } else {
        console.log("Showing window via shortcut");
        mb.showWindow();
      }
    } else {
      console.log(
        "Shortcut pressed, but menubar object (mb) is not available."
      );
    }
  });

  if (!ret) {
    console.error("Failed to register global shortcut Cmd+Shift+T");
  } else {
    console.log("Global shortcut Cmd+Shift+T registered successfully.");
  }
}

app.whenReady().then(initializeApp); // Call async initialization

// Make sure to unregister shortcuts when the app quits
app.on("will-quit", () => {
  console.log("Unregistering global shortcuts...");
  globalShortcut.unregisterAll();
  console.log("Global shortcuts unregistered.");
});

function setupIPCHandlers() {
  ipcMain.handle("translate-text", async (_, text: string) => {
    console.log("IPC: translate-text received", text);
    // Ensure services are available
    if (!historyManager || !translationService)
      return { error: "Services not ready" };
    return handleTranslationRequest(text);
  });

  ipcMain.handle("get-history", async () => {
    console.log("IPC: get-history received");
    if (!historyManager) return {};
    return historyManager.groupHistoryByDate();
  });

  ipcMain.handle("clear-history", async () => {
    console.log("IPC: clear-history received");
    if (!historyManager || !mb || !mb.window) return;
    historyManager.clearHistory();
    mb.window.webContents.send("history-cleared");
  });

  ipcMain.handle("load-translation", async (_, entry: TranslationEntry) => {
    console.log("IPC: load-translation received", entry);
    if (!mb || !mb.window) return;
    mb.window.webContents.send("show-translation", entry);
  });
}

async function handleTranslationRequest(text: string) {
  console.log("Handling translation request for:", text);
  // Ensure services are initialized
  if (!historyManager || !translationService || !mb || !mb.window)
    return { error: "Application components not ready" };

  try {
    const cached = historyManager.getFromCache(text);
    if (cached) {
      console.log("Found cached translation");
      mb.window.webContents.send("show-translation", cached);
      return cached;
    }

    console.log("No cache hit, calling API");
    mb.window.webContents.send("translation-loading", text);

    const result = await translationService.translateText(text);
    console.log("API Result:", result);

    if (result && typeof result === "object" && !("error" in result)) {
      const translationEntry: TranslationEntry = {
        original: text,
        translation: result,
        timestamp: Date.now(),
      };
      historyManager.addToHistory(translationEntry);
      mb.window.webContents.send("show-translation", translationEntry);
      return translationEntry;
    } else {
      // Handle potential error format from translateText if it throws or returns an error object
      const errorMessage =
        (result as any)?.message || "Invalid translation response format";
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Translation error:", error);
    const message = error instanceof Error ? error.message : String(error);
    mb.window.webContents.send("translation-error", text, message);
    return { error: message };
  }
}

function showLastTranslation() {
  // Ensure services are initialized
  if (!historyManager || !mb || !mb.window) return;
  console.log("Showing last translation or empty state");
  const lastTranslation = historyManager.getLastTranslation();
  if (lastTranslation) {
    mb.window.webContents.send("show-translation", lastTranslation);
  } else {
    mb.window.webContents.send("empty-state");
  }
}

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mb && mb.window) {
      console.log("Second instance detected, showing window.");
      mb.showWindow(); // Bring window to front on second instance attempt
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // If the app is activated and has no windows (shouldn't happen with menubar usually)
    // you might want to re-initialize or show the window if it exists.
    if (mb) {
      console.log("App activated with no windows, showing menubar window.");
      mb.showWindow();
    } else {
      console.log(
        "App activated with no windows and no menubar, re-initializing."
      );
      initializeApp(); // Or re-initialize if mb is somehow null
    }
  }
});
