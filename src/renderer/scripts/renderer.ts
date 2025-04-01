// renderer.ts
// Adjust relative paths for compiled output structure
import type { ExposedApi } from "../../main/preload";
import type {
  TranslationEntry,
  GroupedHistory,
} from "../../main/history-manager";

// Declare the window.api object injected by the preload script
declare global {
  interface Window {
    api: ExposedApi;
  }
}

// --- DOM Elements ---
const viewTitle = document.getElementById("viewTitle") as HTMLSpanElement;
const historyBtn = document.getElementById("historyBtn") as HTMLButtonElement;
const clearHistoryBtn = document.getElementById(
  "clearHistoryBtn"
) as HTMLButtonElement;
const backBtn = document.getElementById("backBtn") as HTMLButtonElement;

const translationContainer = document.getElementById(
  "translationContainer"
) as HTMLElement;
const historyContainer = document.getElementById(
  "historyContainer"
) as HTMLElement;
const emptyState = document.getElementById("emptyState") as HTMLElement;
const allViews = [translationContainer, historyContainer, emptyState];

const loadingIndicator = document.getElementById(
  "loadingIndicator"
) as HTMLElement;
const errorDisplay = document.getElementById("errorDisplay") as HTMLElement;
const errorMessage = document.getElementById("errorMessage") as HTMLSpanElement;
const errorOriginalText = document.getElementById(
  "errorOriginalText"
) as HTMLSpanElement;

const translationResult = document.getElementById(
  "translationResult"
) as HTMLElement;
const originalText = document.getElementById(
  "originalText"
) as HTMLParagraphElement;
const translatedText = document.getElementById(
  "translatedText"
) as HTMLHeadingElement;
const translationFormality = document.getElementById(
  "translationFormality"
) as HTMLSpanElement;
const translatedPronunciation = document.getElementById(
  "translatedPronunciation"
) as HTMLParagraphElement;
const wordBreakdown = document.getElementById("wordBreakdown") as HTMLElement;
const tipsList = document.getElementById("tipsList") as HTMLUListElement;
const alternativesList = document.getElementById(
  "alternativesList"
) as HTMLElement;

const historyList = document.getElementById("historyList") as HTMLElement;
const emptyHistoryMessage = document.getElementById(
  "emptyHistoryMessage"
) as HTMLParagraphElement;

// --- State Management ---
let currentView: "translation" | "history" | "empty" = "empty";

// --- View Switching Logic ---
function showView(
  viewId: "translationContainer" | "historyContainer" | "emptyState"
) {
  allViews.forEach((view) => view.classList.add("hidden"));
  const activeView = document.getElementById(viewId);
  if (activeView) {
    activeView.classList.remove("hidden");
  }

  // Update header based on view
  if (viewId === "historyContainer") {
    currentView = "history";
    viewTitle.textContent = "History";
    historyBtn.classList.add("hidden");
    clearHistoryBtn.classList.remove("hidden");
    backBtn.classList.remove("hidden");
    loadHistory(); // Load history when switching to this view
  } else if (viewId === "translationContainer") {
    currentView = "translation";
    viewTitle.textContent = "Translation";
    historyBtn.classList.remove("hidden");
    clearHistoryBtn.classList.add("hidden");
    backBtn.classList.add("hidden");
  } else {
    // emptyState
    currentView = "empty";
    viewTitle.textContent = "Translation"; // Title remains Translation for empty state
    historyBtn.classList.remove("hidden");
    clearHistoryBtn.classList.add("hidden");
    backBtn.classList.add("hidden");
  }
  console.log("Switched view to:", currentView);
}

// --- UI Update Functions ---
function showLoading(originalInput: string) {
  console.log("Showing loading indicator for:", originalInput);
  showView("translationContainer");
  loadingIndicator.classList.remove("hidden");
  errorDisplay.classList.add("hidden");
  translationResult.classList.add("hidden");
  // Clear previous results but keep original text potentially visible
  originalText.textContent = originalInput;
  translatedText.textContent = "";
  translatedPronunciation.textContent = "";
  translationFormality.textContent = "";
  wordBreakdown.innerHTML = "";
  tipsList.innerHTML = "";
  alternativesList.innerHTML = "";
}

function showError(originalInput: string, errorMsg: string) {
  console.error("Showing error:", errorMsg, "for input:", originalInput);
  showView("translationContainer");
  loadingIndicator.classList.add("hidden");
  translationResult.classList.add("hidden");
  errorMessage.textContent = errorMsg;
  errorOriginalText.textContent = originalInput;
  errorDisplay.classList.remove("hidden");
}

function showTranslation(entry: TranslationEntry) {
  console.log(
    "[Renderer] showTranslation called with entry:",
    JSON.stringify(entry, null, 2)
  ); // Log the full entry
  showView("translationContainer");
  loadingIndicator.classList.add("hidden");
  errorDisplay.classList.add("hidden");
  translationResult.classList.remove("hidden");

  // Basic validation
  if (!entry || typeof entry !== "object") {
    console.error(
      "[Renderer] Invalid entry object received in showTranslation."
    );
    showError("(unknown)", "Received invalid entry object.");
    return;
  }
  if (!entry.translation || typeof entry.translation !== "object") {
    console.error(
      "[Renderer] Invalid entry.translation object received:",
      entry.translation
    );
    showError(
      entry.original || "(unknown)",
      "Received invalid translation data format within entry."
    );
    return;
  }

  const translationData = entry.translation; // This is the nested JSON from Gemini
  console.log(
    "[Renderer] Extracted translationData:",
    JSON.stringify(translationData, null, 2)
  );

  // --- Update Original Text ---
  console.log(`[Renderer] Setting originalText to: "${entry.original}"`);
  originalText.textContent = entry.original;

  // --- Display Main Translation ---
  const mainTranslation = translationData.translation;
  if (mainTranslation && typeof mainTranslation === "object") {
    console.log(
      "[Renderer] Updating main translation section:",
      mainTranslation
    );
    translatedText.textContent = mainTranslation.text || "N/A";
    translatedPronunciation.textContent = mainTranslation.pronunciation || "";
    translationFormality.textContent = mainTranslation.formality || "unknown";
    (
      translatedText.closest(".translation-text-section") as HTMLElement
    )?.classList.remove("hidden");
  } else {
    console.error(
      "[Renderer] Missing or invalid main translation block:",
      mainTranslation
    );
    translatedText.textContent = "Error: Missing translation block";
    translatedPronunciation.textContent = "";
    translationFormality.textContent = "unknown";
    (
      translatedText.closest(".translation-text-section") as HTMLElement
    )?.classList.add("hidden");
  }

  // --- Display Word Breakdown ---
  const breakdownSection = wordBreakdown.closest(
    "details"
  ) as HTMLDetailsElement;
  wordBreakdown.innerHTML = ""; // Clear previous
  if (
    translationData.breakdown?.words &&
    Array.isArray(translationData.breakdown.words) &&
    translationData.breakdown.words.length > 0
  ) {
    console.log(
      "[Renderer] Updating word breakdown section with",
      translationData.breakdown.words.length,
      "words."
    );
    const table = document.createElement("table");
    table.innerHTML = `<thead><tr><th>Original</th><th>Korean</th><th>Pronunciation</th><th>Type</th><th>Notes</th></tr></thead>`;
    const tbody = document.createElement("tbody");
    translationData.breakdown.words.forEach((word: any) => {
      const row = tbody.insertRow();
      const safeGet = (obj: any, key: string) => obj?.[key] || "";
      row.innerHTML = `
                <td>${safeGet(word, "original")}</td>
                <td>${safeGet(word, "korean")}</td>
                <td>${safeGet(word, "pronunciation")}</td>
                <td>${safeGet(word, "partOfSpeech")}</td>
                <td>${safeGet(word, "notes")}</td>
            `;
    });
    table.appendChild(tbody);
    wordBreakdown.appendChild(table);
    breakdownSection?.classList.remove("hidden");
  } else {
    console.log("[Renderer] No word breakdown data found or empty array.");
    breakdownSection?.classList.add("hidden"); // Hide section if no data
  }

  // --- Display Tips ---
  const tipsSection = tipsList.closest("details") as HTMLDetailsElement;
  tipsList.innerHTML = ""; // Clear previous
  if (
    translationData.tips &&
    Array.isArray(translationData.tips) &&
    translationData.tips.length > 0
  ) {
    console.log(
      "[Renderer] Updating tips section with",
      translationData.tips.length,
      "tips."
    );
    translationData.tips.forEach((tip: string) => {
      const li = document.createElement("li");
      li.textContent = tip;
      tipsList.appendChild(li);
    });
    tipsSection?.classList.remove("hidden");
  } else {
    console.log("[Renderer] No tips data found or empty array.");
    tipsSection?.classList.add("hidden"); // Hide section if no data
  }

  // --- Display Alternatives ---
  const alternativesSection = alternativesList.closest(
    "details"
  ) as HTMLDetailsElement;
  alternativesList.innerHTML = ""; // Clear previous
  if (
    translationData.alternatives &&
    Array.isArray(translationData.alternatives) &&
    translationData.alternatives.length > 0
  ) {
    console.log(
      "[Renderer] Updating alternatives section with",
      translationData.alternatives.length,
      "alternatives."
    );
    translationData.alternatives.forEach((alt: any) => {
      const div = document.createElement("div");
      div.className = "alternative-item";
      const safeGet = (obj: any, key: string) => obj?.[key] || "N/A";
      div.innerHTML = `
                <p><strong>${safeGet(alt, "text")}</strong> (${safeGet(
        alt,
        "pronunciation"
      )})</p>
                <p><small>Context: ${safeGet(alt, "context")}</small></p>
            `;
      alternativesList.appendChild(div);
    });
    alternativesSection?.classList.remove("hidden");
  } else {
    console.log("[Renderer] No alternatives data found or empty array.");
    alternativesSection?.classList.add("hidden"); // Hide section if no data
  }

  // Close details sections by default when showing a new translation
  document.querySelectorAll("#translationResult details").forEach((details) => {
    (details as HTMLDetailsElement).open = false;
  });
  console.log("[Renderer] showTranslation finished.");
}

function showEmpty() {
  console.log("Showing empty state");
  showView("emptyState");
}

// --- History Logic ---
async function loadHistory() {
  console.log("Loading history");
  historyList.innerHTML = '<div class="loading">Loading history...</div>'; // Show loading indicator
  emptyHistoryMessage.classList.add("hidden");

  try {
    const groupedHistory: GroupedHistory = await window.api.getHistory();
    const dates = Object.keys(groupedHistory).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    historyList.innerHTML = ""; // Clear loading/previous content

    if (dates.length === 0) {
      emptyHistoryMessage.classList.remove("hidden");
    } else {
      emptyHistoryMessage.classList.add("hidden");
    }

    dates.forEach((date) => {
      const section = document.createElement("details");
      section.className = "history-date-section";
      section.open = true; // Keep dates expanded by default

      const summary = document.createElement("summary");
      summary.textContent = `${date} (${groupedHistory[date].length})`;
      section.appendChild(summary);

      const entriesContainer = document.createElement("div");
      entriesContainer.className = "history-entries";

      // Make sure entries for the date exist
      const entries = groupedHistory[date] || [];
      entries.forEach((entry: TranslationEntry) => {
        // Add type annotation
        const entryElement = document.createElement("div");
        entryElement.className = "history-entry";
        // Escape original text to prevent potential XSS if displayed directly in HTML
        const escapedOriginal = entry.original
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        entryElement.innerHTML = `
                    <span class="history-original" title="${escapedOriginal}">${escapedOriginal}</span>
                    <button class="load-translation-btn" title="Load this translation">🔄</button>
                `;

        const loadBtn = entryElement.querySelector(
          ".load-translation-btn"
        ) as HTMLButtonElement | null;
        loadBtn?.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent details toggling
          console.log("Load history item clicked:", entry);
          window.api.loadTranslation(entry); // Tell main process to show this
          // showView('translationContainer'); // View will be switched by main via onShowTranslation
        });

        entriesContainer.appendChild(entryElement);
      });

      section.appendChild(entriesContainer);
      historyList.appendChild(section);
    });
  } catch (error) {
    console.error("Error loading history:", error);
    historyList.innerHTML = `<p class="error">Error loading history: ${
      error instanceof Error ? error.message : String(error)
    }</p>`;
    emptyHistoryMessage.classList.add("hidden");
  }
}

async function clearHistory() {
  console.log("Requesting history clear");
  // Use a try-catch block for the confirmation dialog
  try {
    if (confirm("Are you sure you want to clear all translation history?")) {
      console.log("User confirmed history clear.");
      await window.api.clearHistory();
      // History view will be updated via onHistoryCleared event
    } else {
      console.log("User canceled history clear.");
    }
  } catch (e) {
    console.error("Error during clear history confirmation:", e);
  }
}

// --- Initialization and Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("Renderer DOM ready");

  // --- Button Event Listeners ---
  historyBtn.addEventListener("click", () => showView("historyContainer"));
  backBtn.addEventListener("click", () => {
    // If coming back from history, we usually want the last loaded translation
    // or empty state if nothing was loaded. The main process handles showing the last one.
    showView("translationContainer");
  });
  clearHistoryBtn.addEventListener("click", clearHistory);

  // --- IPC Event Listeners (from preload via window.api) ---
  window.api.onTranslationLoading((originalText: string) => {
    console.log(
      "[Renderer IPC] Received onTranslationLoading event for:",
      originalText
    );
    showLoading(originalText);
  });

  window.api.onShowTranslation((result: TranslationEntry) => {
    console.log(
      "[Renderer IPC] Received onShowTranslation event with result:",
      JSON.stringify(result, null, 2)
    );
    showTranslation(result);
  });

  window.api.onTranslationError((originalText: string, error: string) => {
    console.log(
      "[Renderer IPC] Received onTranslationError event:",
      error,
      "for:",
      originalText
    );
    showError(originalText, error);
  });

  window.api.onEmptyState(() => {
    console.log("[Renderer IPC] Received onEmptyState event.");
    showEmpty();
  });

  window.api.onHistoryCleared(() => {
    console.log("[Renderer IPC] Received onHistoryCleared event.");
    if (currentView === "history") {
      loadHistory();
    }
  });

  // Initial state: Start in empty state until main process sends data via IPC
  console.log("Renderer ready, showing empty state initially.");
  showEmpty();
});
