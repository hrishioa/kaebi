// renderer.ts
// Adjust relative paths for compiled output structure
import type { ExposedApi } from "../../main/preload";
import type {
  TranslationEntry,
  GroupedHistory,
} from "../../main/history-manager";
import type { LanguageListItem } from "../../main/preload"; // Import new type

// Declare the window.api object injected by the preload script
declare global {
  interface Window {
    api: ExposedApi;
  }
}

// --- DOM Elements ---
const container = document.querySelector(".container") as HTMLElement; // Get main container
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

const copyTranslationBtn = document.getElementById(
  "copyTranslationBtn"
) as HTMLButtonElement;
const copyPronunciationBtn = document.getElementById(
  "copyPronunciationBtn"
) as HTMLButtonElement;

const languageSelector = document.getElementById(
  "languageSelector"
) as HTMLSelectElement;

// --- State Management ---
let currentView: "translation" | "history" | "empty" = "empty";
let currentLanguageCode: string = "ko"; // Track current language in renderer too

// --- State for Loading Timer ---
let loadingTimerInterval: number | null = null;
let loadingStartTime: number | null = null;
const loadingTimerElement = document.getElementById(
  "loadingTimer"
) as HTMLSpanElement;

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

  // Keep original text visible
  originalText.textContent = originalInput;
  (
    originalText.closest(".original-text-section") as HTMLElement
  )?.classList.remove("hidden");

  // Hide previous results/error, show loading indicator
  translationResult.classList.add("hidden"); // Hide the main result block
  errorDisplay.classList.add("hidden");
  loadingIndicator.classList.remove("hidden");

  // --- Start Timer ---
  if (loadingTimerInterval) {
    clearInterval(loadingTimerInterval);
  }
  loadingStartTime = Date.now();
  loadingTimerElement.textContent = "0.00"; // Reset timer display

  loadingTimerInterval = window.setInterval(() => {
    // Use window.setInterval for correct type
    if (loadingStartTime) {
      const elapsed = (Date.now() - loadingStartTime) / 1000;
      loadingTimerElement.textContent = elapsed.toFixed(2);
    }
  }, 50); // Update roughly 20 times a second
}

// --- Stop Timer Function ---
function stopLoadingTimer() {
  if (loadingTimerInterval) {
    clearInterval(loadingTimerInterval);
    loadingTimerInterval = null;
    loadingStartTime = null;
    console.log("Loading timer stopped.");
  }
}

function showError(originalInput: string, errorMsg: string) {
  stopLoadingTimer(); // Stop timer on error
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

function showTranslation(entry: TranslationEntry, langCode: string) {
  console.log(`[Renderer] showTranslation called for lang: ${langCode}`);

  // --- Apply Language Class ---
  // Remove previous lang classes
  container.className = container.className
    .replace(/\blang-[a-z]{2}\b/g, "")
    .trim();
  // Add current lang class
  container.classList.add(`lang-${langCode}`);
  console.log(`[Renderer] Applied lang class: lang-${langCode}`);

  stopLoadingTimer(); // Stop timer on success
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

    const sortedBreakdown = [...breakdownWords].sort((a, b) => {
      // Use targetWord for sorting based on the actual translated word
      const indexA = currentText.indexOf(a.targetWord);
      const indexB = currentText.indexOf(b.targetWord);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    sortedBreakdown.forEach((wordData) => {
      // Find based on targetWord
      const wordIndex = currentText.indexOf(wordData.targetWord, lastIndex);
      if (wordIndex !== -1) {
        if (wordIndex > lastIndex) {
          styledParts.push(
            document.createTextNode(currentText.substring(lastIndex, wordIndex))
          );
        }

        const span = document.createElement("span");
        // Display targetWord
        span.textContent = wordData.targetWord;
        span.classList.add("hover-word");

        // Store data in data-* attributes
        span.dataset.original = wordData.original;
        span.dataset.type = wordData.partOfSpeech;
        span.dataset.pronunciation = wordData.pronunciation;
        if (wordData.notes) {
          span.dataset.notes = wordData.notes;
        }
        // Optionally store targetWord if needed for tooltip, but tooltip usually shows original
        // span.dataset.targetWord = wordData.targetWord;

        span.addEventListener("mouseenter", handleWordMouseEnter);
        span.addEventListener("mouseleave", handleWordMouseLeave);

        styledParts.push(span);
        // Advance index based on targetWord length
        lastIndex = wordIndex + wordData.targetWord.length;
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

  // --- Show/Hide Tip and Alternative Sections ---
  const tipsSection = document.querySelector(".tips-section") as HTMLElement;
  const alternativesSection = document.querySelector(
    ".alternatives-section"
  ) as HTMLElement;

  // Populate and Show/Hide Tips Section
  tipsList.innerHTML = "";
  if (translationData.tips?.length > 0) {
    // Simplified check
    console.log("[Renderer] Populating tips section.");
    translationData.tips.forEach((tip: string) => {
      const li = document.createElement("li");
      li.textContent = tip;
      tipsList.appendChild(li);
    });
    tipsSection?.classList.remove("hidden"); // Show section
  } else {
    console.log("[Renderer] No tips data found, hiding section.");
    tipsSection?.classList.add("hidden"); // Hide section
  }

  // Populate and Show/Hide Alternatives Section
  alternativesList.innerHTML = "";
  if (translationData.alternatives?.length > 0) {
    // Simplified check
    console.log("[Renderer] Populating alternatives section.");
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
    alternativesSection?.classList.remove("hidden"); // Show section
  } else {
    console.log("[Renderer] No alternatives data found, hiding section.");
    alternativesSection?.classList.add("hidden"); // Hide section
  }

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

// --- Helper: Copy to Clipboard with Feedback ---
async function copyToClipboard(
  text: string | null | undefined,
  buttonElement: HTMLButtonElement
) {
  if (!text) {
    console.warn("Attempted to copy empty text.");
    return;
  }
  if (!navigator.clipboard) {
    console.error("Clipboard API not available.");
    // Optionally show an error message to the user
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    console.log("Text copied to clipboard:", text);

    // Visual Feedback
    const originalContent = buttonElement.innerHTML; // Store original icon
    buttonElement.innerHTML = "✅"; // Checkmark emoji for feedback
    buttonElement.classList.add("copied");
    buttonElement.disabled = true;

    setTimeout(() => {
      buttonElement.innerHTML = originalContent; // Restore icon
      buttonElement.classList.remove("copied");
      buttonElement.disabled = false;
    }, 1500); // Restore after 1.5 seconds
  } catch (err) {
    console.error("Failed to copy text: ", err);
    // Optionally show an error message to the user
    const originalContent = buttonElement.innerHTML;
    buttonElement.innerHTML = "❌"; // Error emoji
    setTimeout(() => {
      buttonElement.innerHTML = originalContent; // Restore icon
    }, 1500);
  }
}

// --- Helper Functions ---

// Function to populate language selector
function populateLanguageSelector(
  languages: LanguageListItem[],
  selectedCode: string
) {
  languageSelector.innerHTML = ""; // Clear existing options
  languages.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang.code;
    option.textContent = lang.name;
    option.selected = lang.code === selectedCode;
    languageSelector.appendChild(option);
  });
  currentLanguageCode = selectedCode; // Update renderer state
}

// --- Initialization and Event Listeners ---
document.addEventListener("DOMContentLoaded", async () => {
  // Make async
  console.log("Renderer DOM ready");

  // --- Populate Language Selector ---
  try {
    console.log("Getting available languages...");
    // Fetch available languages AND the currently selected one
    // Modify getAvailableLanguages in main.ts to return current along with list?
    // For now, get list then assume main process default/stored is correct initially.
    // A better way: add a 'get-initial-data' IPC call.
    const languages = await window.api.getAvailableLanguages();
    console.log("Available languages received:", languages);
    // TODO: Get the actual current language code from main process storage
    const storedLangCode = "ko"; // Hardcode for now, needs update
    populateLanguageSelector(languages, storedLangCode);
  } catch (error) {
    console.error("Failed to get available languages:", error);
    // Handle error - maybe show a default or disable selector?
  }

  // --- Language Selector Listener ---
  languageSelector.addEventListener("change", async (event) => {
    const newLangCode = (event.target as HTMLSelectElement).value;
    console.log(`Language selection changed to: ${newLangCode}`);
    if (newLangCode !== currentLanguageCode) {
      try {
        // Tell main process to change language and re-init service
        const result = await window.api.setLanguage(newLangCode);

        // Explicit type guard to check for error property
        if (
          result &&
          typeof result === "object" &&
          "error" in result &&
          result.error
        ) {
          console.error("Error setting language:", result.error);
          languageSelector.value = currentLanguageCode;
        } else {
          // Success!
          currentLanguageCode = newLangCode;
          console.log(`Language successfully set to ${newLangCode}`);
          showEmpty();
        }
      } catch (error) {
        console.error("IPC Error setting language:", error);
        languageSelector.value = currentLanguageCode; // Revert on error
      }
    }
  });

  // --- Other Button Event Listeners ---
  historyBtn.addEventListener("click", () => showView("historyContainer"));
  backBtn.addEventListener("click", () => {
    showView("translationContainer");
  });
  clearHistoryBtn.addEventListener("click", clearHistory);
  copyTranslationBtn.addEventListener("click", () => {
    copyToClipboard(translatedText.textContent, copyTranslationBtn);
  });
  copyPronunciationBtn.addEventListener("click", () => {
    copyToClipboard(translatedPronunciation.textContent, copyPronunciationBtn);
  });

  // --- IPC Event Listeners ---
  window.api.onTranslationLoading((originalText: string) => {
    console.log(
      "[Renderer IPC] Received onTranslationLoading event for:",
      originalText
    );
    showLoading(originalText);
  });

  window.api.onShowTranslation((result: TranslationEntry, langCode: string) => {
    console.log(
      `[Renderer IPC] Received onShowTranslation event for lang: ${langCode}`
    );
    showTranslation(result, langCode);
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

  // Initial state
  console.log("Renderer ready, showing empty state initially.");
  showEmpty();
});
