/**
 * Enhanced UX Module
 * Улучшения пользовательского опыта:
 * - Auto-save drafts
 * - Search in chats
 * - Notification badges
 * - Swipe gestures
 * - Smart suggestions
 */

import { debounce } from "./utils.module.js";
import { sGet, sSet, STORAGE } from "./storage.module.js";
import { searchChats } from "./chat.module.js";

// =============================
// DRAFT SAVING
// =============================

export function initDraftSaving(inputEl) {
  if (!inputEl) return;

  const saveDraft = debounce(() => {
    sSet(STORAGE.DRAFT_MESSAGE, inputEl.value);
  }, 1000);

  inputEl.addEventListener("input", saveDraft);
}

export function loadDraft(inputEl) {
  if (!inputEl) return;
  const draft = sGet(STORAGE.DRAFT_MESSAGE, "");
  if (draft) {
    inputEl.value = draft;
    inputEl.focus();
  }
}

export function clearDraft() {
  sSet(STORAGE.DRAFT_MESSAGE, "");
}

// =============================
// CHAT SEARCH
// =============================

export function initChatSearch(searchInputEl, historyListEl) {
  if (!searchInputEl || !historyListEl) return;

  const handleSearch = debounce(() => {
    const query = searchInputEl.value.trim();
    
    if (!query) {
      // Показываем все чаты
      historyListEl.dispatchEvent(new CustomEvent("render-all-chats"));
      return;
    }

    // Ищем чаты
    const results = searchChats(query);
    historyListEl.dispatchEvent(
      new CustomEvent("render-search-results", { detail: { results } })
    );
  }, 300);

  searchInputEl.addEventListener("input", handleSearch);
}

// =============================
// NOTIFICATION BADGES
// =============================

let unreadCount = 0;

export function setUnreadBadge(count) {
  unreadCount = count;
  updateBadgeUI();
}

export function incrementUnread() {
  unreadCount++;
  updateBadgeUI();
}

export function clearUnread() {
  unreadCount = 0;
  updateBadgeUI();
}

function updateBadgeUI() {
  const badge = document.querySelector(".nav-badge");
  if (!badge) return;

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
    badge.style.display = "inline-flex";
    document.title = `(${unreadCount}) LSD | AI Time Manager`;
  } else {
    badge.style.display = "none";
    document.title = "LSD | AI Time Manager";
  }
}

// =============================
// KEYBOARD SHORTCUTS
// =============================

export function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + K = поиск
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      const searchInput = document.querySelector(".chat-search-input");
      if (searchInput) searchInput.focus();
    }

    // Ctrl/Cmd + Shift + E = export
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "e") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("export-data"));
    }

    // Ctrl/Cmd + Shift + S = settings
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "s") {
      e.preventDefault();
      document.getElementById("openDrawer")?.click();
    }
  });
}

// =============================
// SWIPE GESTURES (Mobile)
// =============================

export function initSwipeGestures() {
  let startX = 0;
  let startY = 0;

  document.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    true
  );

  document.addEventListener(
    "touchend",
    (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Swipe right - open drawer
      if (deltaX > 50 && Math.abs(deltaY) < 50) {
        document.getElementById("openDrawer")?.click();
      }

      // Swipe left - close drawer
      if (deltaX < -50 && Math.abs(deltaY) < 50) {
        const drawerOverlay = document.getElementById("drawerOverlay");
        if (drawerOverlay?.classList.contains("open")) {
          drawerOverlay.click();
        }
      }

      // Swipe up - show plan button (если в чате)
      if (deltaY < -30 && Math.abs(deltaX) < 50) {
        document.getElementById("planBtn")?.click();
      }
    },
    true
  );
}

// =============================
// SMART SUGGESTIONS
// =============================

export function getSuggestions(currentQuery) {
  const suggestions = [
    "Создай план на день",
    "Какие дела срочные?",
    "Помоги организовать время",
    "Что важнее всего?",
    "Оптимизируй мой график",
  ];

  if (!currentQuery) {
    return suggestions;
  }

  const query = currentQuery.toLowerCase();
  return suggestions.filter((s) => s.toLowerCase().includes(query));
}

export function renderSuggestions(inputEl, suggestionsContainer) {
  if (!inputEl || !suggestionsContainer) return;

  const updateSuggestions = debounce(() => {
    const value = inputEl.value.trim();
    const suggestions = getSuggestions(value);

    if (value && suggestions.length === 0) {
      suggestionsContainer.innerHTML = "";
      return;
    }

    suggestionsContainer.innerHTML = suggestions
      .slice(0, 3)
      .map(
        (s) =>
          `<div class="suggestion" data-text="${s}">
        💡 ${s}
      </div>`
      )
      .join("");

    suggestionsContainer.querySelectorAll(".suggestion").forEach((el) => {
      el.addEventListener("click", () => {
        inputEl.value = el.getAttribute("data-text");
        suggestionsContainer.innerHTML = "";
        inputEl.focus();
      });
    });
  }, 200);

  inputEl.addEventListener("input", updateSuggestions);
}

// =============================
// LOADING STATES
// =============================

export function showLoadingState(element, text = "Загрузка...") {
  if (!element) return () => {};

  const originalContent = element.innerHTML;

  element.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${text}</p>
    </div>
  `;

  return () => {
    element.innerHTML = originalContent;
  };
}

// =============================
// OPTIMISTIC UI
// =============================

export function optimisticUpdate(element, newContent, rollbackFn) {
  const originalContent = element.innerHTML;
  element.innerHTML = newContent;

  return async (promise) => {
    try {
      await promise;
    } catch (e) {
      element.innerHTML = originalContent;
      if (rollbackFn) rollbackFn(e);
      throw e;
    }
  };
}

// =============================
// UNDO STACK (для последних действий)
// =============================

class UndoStack {
  constructor(maxSize = 20) {
    this.stack = [];
    this.maxSize = maxSize;
  }

  push(action, undo) {
    this.stack.push({ action, undo, timestamp: Date.now() });
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
  }

  undo() {
    const item = this.stack.pop();
    if (item) {
      item.undo();
      return true;
    }
    return false;
  }

  clear() {
    this.stack = [];
  }

  canUndo() {
    return this.stack.length > 0;
  }
}

export const undoStack = new UndoStack();

// =============================
// INITIALIZATION
// =============================

export function initEnhancedUX() {
  initKeyboardShortcuts();
  initSwipeGestures();

  // Инициализируем draft saving
  const promptEl = document.getElementById("prompt");
  if (promptEl) {
    initDraftSaving(promptEl);
    loadDraft(promptEl);
  }

  // Слушаем очистку draft при отправке
  window.addEventListener("message-sent", () => {
    clearDraft();
  });

  // Инициализируем badges
  updateBadgeUI();

  console.log("[UX] Enhanced UX initialized");
}
