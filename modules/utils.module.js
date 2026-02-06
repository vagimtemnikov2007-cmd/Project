/**
 * Utils Module
 * Вспомогательные функции для всего приложения
 */

export const $ = (id) => document.getElementById(id);
export const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

export const escapeHTML = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[ch]));

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function uuid() {
  if (globalThis.crypto?.randomUUID)
    return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function fmtTime(ts) {
  const d = new Date(ts || Date.now());
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function nowISO(ts) {
  return new Date(ts || Date.now()).toISOString();
}

/**
 * Debounce функция для оптимизации обработчиков
 */
export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle функция для ограничения частоты вызовов
 */
export function throttle(fn, delay) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn(...args);
      lastTime = now;
    }
  };
}

/**
 * Telegram WebApp API
 */
export const tg = window.Telegram?.WebApp;

export function getTgIdOrNull() {
  const id = tg?.initDataUnsafe?.user?.id;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export function tgPopup(message, title = "LSD") {
  try {
    tg?.showPopup({ title, message });
  } catch {
    alert(String(message));
  }
}

export function tgReady() {
  try {
    tg?.ready();
    tg?.expand();
  } catch {}
}

/**
 * Emoji Helper
 */
const EMOJIS = ["💬", "🧠", "⚡", "🧩", "📌", "🎯", "🧊", "🍀", "🌙", "☀️", "🦊", "🐺", "🐼", "🧪", "📚"];

export function pickEmoji() {
  return EMOJIS[(Math.random() * EMOJIS.length) | 0];
}

/**
 * Error Logger (для отправки ошибок на сервер)
 */
export function logError(error, context = {}) {
  console.error("[LSD Error]", error, context);
  
  // Отправить на сервер для логирования
  fetch("https://lsd-server-ml3z.onrender.com/api/log-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: error?.message || String(error),
      stack: error?.stack,
      context,
      userId: getTgIdOrNull(),
      timestamp: nowISO(),
    }),
  }).catch(() => {
    // Молча игнорируем ошибки отправки логов
  });
}

/**
 * Notification Badge (улучшение UX)
 */
export function setNotificationBadge(count) {
  const badge = document.querySelector(".nav-badge");
  if (!badge) return;
  
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}
