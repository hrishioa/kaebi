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

const customTooltip = document.getElementById("customTooltip") as HTMLElement;

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

// Helper function to escape HTML for safe attribute embedding
function escapeHtml(unsafe: string | undefined | null): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showTranslation(entry: TranslationEntry) {
  console.log(
    "[Renderer] showTranslation called with entry:",
    JSON.stringify(entry, null, 2)
  );
  showView("translationContainer");
  loadingIndicator.classList.add("hidden");
  errorDisplay.classList.add("hidden");
  translationResult.classList.remove("hidden");

  // Validations (remain the same)
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

  const translationData = entry.translation;
  console.log(
    "[Renderer] Extracted translationData:",
    JSON.stringify(translationData, null, 2)
  );

  // --- Update Original Text ---
  console.log(`[Renderer] Setting originalText to: "${entry.original}"`);
  originalText.textContent = entry.original;

  // --- Display Main Translation (with custom hover tooltips) ---
  const mainTranslation = translationData.translation;
  const breakdownWords = translationData.breakdown?.words || [];
  translatedText.innerHTML = ""; // Clear previous content

  if (
    mainTranslation &&
    typeof mainTranslation === "object" &&
    mainTranslation.text
  ) {
    console.log(
      "[Renderer] Updating main translation section:",
      mainTranslation
    );

    // --- Create hoverable words ---
    let currentText = mainTranslation.text;
    const styledParts: (string | Node)[] = [];
    let lastIndex = 0;

    // Sort breakdown words by appearance in the text (simple first-occurrence sort)
    // This is heuristic and might fail for complex sentences or repeated words.
    // A more robust solution might involve character indexing from the API if available.
    const sortedBreakdown = [...breakdownWords].sort((a, b) => {
      const indexA = currentText.indexOf(a.korean);
      const indexB = currentText.indexOf(b.korean);
      // Handle words not found
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    sortedBreakdown.forEach((wordData) => {
      const wordIndex = currentText.indexOf(wordData.korean, lastIndex); // Find word starting from last index
      if (wordIndex !== -1) {
        // Add preceding text (if any)
        if (wordIndex > lastIndex) {
          styledParts.push(
            document.createTextNode(currentText.substring(lastIndex, wordIndex))
          );
        }

        // Create the hoverable span
        const span = document.createElement("span");
        span.textContent = wordData.korean;
        span.classList.add("hover-word"); // Add class for potential styling

        // Store data in data-* attributes
        span.dataset.original = wordData.original;
        span.dataset.type = wordData.partOfSpeech;
        span.dataset.pronunciation = wordData.pronunciation;
        if (wordData.notes) {
          span.dataset.notes = wordData.notes;
        }

        // Add event listeners for custom tooltip
        span.addEventListener("mouseenter", handleWordMouseEnter);
        span.addEventListener("mouseleave", handleWordMouseLeave);

        styledParts.push(span);
        lastIndex = wordIndex + wordData.korean.length;
      }
    });

    // Add any remaining text after the last found word
    if (lastIndex < currentText.length) {
      styledParts.push(
        document.createTextNode(currentText.substring(lastIndex))
      );
    }

    // Append all parts to the translatedText element
    styledParts.forEach((part) =>
      translatedText.appendChild(
        typeof part === "string" ? document.createTextNode(part) : part
      )
    );

    // Update pronunciation and formality
    translatedPronunciation.textContent = mainTranslation.pronunciation || "";
    translationFormality.textContent = mainTranslation.formality || "unknown";
    (
      translatedText.closest(".translation-text-section") as HTMLElement
    )?.classList.remove("hidden");
  } else {
    console.error(
      "[Renderer] Missing or invalid main translation block or text:",
      mainTranslation
    );
    translatedText.textContent = "Error: Missing translation block";
    translatedPronunciation.textContent = "";
    translationFormality.textContent = "unknown";
    (
      translatedText.closest(".translation-text-section") as HTMLElement
    )?.classList.add("hidden");
  }

  // --- Hide Details Sections By Default ---
  const breakdownSection = wordBreakdown.closest(
    "details"
  ) as HTMLDetailsElement;
  const tipsSection = tipsList.closest("details") as HTMLDetailsElement;
  const alternativesSection = alternativesList.closest(
    "details"
  ) as HTMLDetailsElement;

  breakdownSection?.classList.add("hidden"); // Hide word breakdown section
  // We might still populate tips/alternatives if data exists, but keep sections hidden initially

  // Populate Tips (keep hidden)
  tipsList.innerHTML = "";
  if (
    translationData.tips &&
    Array.isArray(translationData.tips) &&
    translationData.tips.length > 0
  ) {
    console.log(
      "[Renderer] Populating hidden tips section with",
      translationData.tips.length,
      "tips."
    );
    translationData.tips.forEach((tip: string) => {
      const li = document.createElement("li");
      li.textContent = tip;
      tipsList.appendChild(li);
    });
    tipsSection?.classList.remove("hidden"); // Remove hidden if there are tips
  } else {
    console.log("[Renderer] No tips data found.");
    tipsSection?.classList.add("hidden");
  }
  if (tipsSection) tipsSection.open = false; // Ensure it's closed

  // Populate Alternatives (keep hidden)
  alternativesList.innerHTML = "";
  if (
    translationData.alternatives &&
    Array.isArray(translationData.alternatives) &&
    translationData.alternatives.length > 0
  ) {
    console.log(
      "[Renderer] Populating hidden alternatives section with",
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
    alternativesSection?.classList.remove("hidden"); // Remove hidden if there are alternatives
  } else {
    console.log("[Renderer] No alternatives data found.");
    alternativesSection?.classList.add("hidden");
  }
  if (alternativesSection) alternativesSection.open = false; // Ensure it's closed

  console.log("[Renderer] showTranslation finished.");
}

// --- Custom Tooltip Event Handlers ---
function handleWordMouseEnter(event: MouseEvent) {
  const span = event.target as HTMLElement;
  const { original, type, pronunciation, notes } = span.dataset;

  if (!original || !type || !pronunciation) return; // Don't show if data is missing

  // Format tooltip content
  let tooltipHtml = '<div class="tooltip-content">';
  tooltipHtml += `<p><strong>Original:</strong> ${escapeHtml(original)}</p>`;
  tooltipHtml += `<p><strong>Type:</strong> ${escapeHtml(type)}</p>`;
  tooltipHtml += `<p><strong>Pronunciation:</strong> ${escapeHtml(
    pronunciation
  )}</p>`;
  if (notes) {
    tooltipHtml += `<p><strong>Notes:</strong> ${escapeHtml(notes)}</p>`;
  }
  tooltipHtml += "</div>";

  customTooltip.innerHTML = tooltipHtml;

  // Position the tooltip
  const rect = span.getBoundingClientRect();
  const tooltipRect = customTooltip.getBoundingClientRect(); // Get tooltip dimensions
  const scrollY = window.scrollY; // Account for page scroll if any
  const scrollX = window.scrollX;

  // Position below the word, centered horizontally
  let top = rect.bottom + scrollY + 5; // 5px gap below
  let left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;

  // Adjust if tooltip goes off-screen horizontally
  if (left < scrollX + 5) {
    left = scrollX + 5; // Minimum 5px from left edge
  }
  const maxLeft = document.body.clientWidth - tooltipRect.width - 5;
  if (left > maxLeft) {
    left = maxLeft;
  }
  // Adjust vertically? Maybe not necessary for this app height

  customTooltip.style.top = `${top}px`;
  customTooltip.style.left = `${left}px`;
  customTooltip.classList.remove("hidden");
}

function handleWordMouseLeave() {
  customTooltip.classList.add("hidden");
  customTooltip.innerHTML = ""; // Clear content
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
