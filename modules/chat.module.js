/**
 * Chat Module
 * Управление чатами и сообщениями
 */

import { uuid, pickEmoji, fmtTime } from "./utils.module.js";
import { sGet, sJSONGet, sSet, sJSONSet, STORAGE } from "./storage.module.js";

let activeChatId = sGet(STORAGE.ACTIVE_CHAT, "");
let chatsIndex = sJSONGet(STORAGE.CHATS_INDEX, []);
let chatCache = sJSONGet(STORAGE.CHAT_CACHE, {});

/**
 * Гарантирует наличие чата в кеше
 */
export function ensureChat(id) {
  if (!id) return;
  if (!chatCache[id]) {
    chatCache[id] = {
      meta: { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() },
      messages: [],
    };
  }
  if (!chatCache[id].meta) chatCache[id].meta = {};
  if (!Array.isArray(chatCache[id].messages)) chatCache[id].messages = [];
  if (!chatCache[id].meta.updatedAt) chatCache[id].meta.updatedAt = Date.now();
  if (!chatCache[id].meta.emoji) chatCache[id].meta.emoji = pickEmoji();
  if (!chatCache[id].meta.title) chatCache[id].meta.title = "Новый чат";
}

/**
 * Сохраняет все чаты
 */
export function saveChats() {
  sSet(STORAGE.ACTIVE_CHAT, activeChatId);
  sJSONSet(STORAGE.CHATS_INDEX, chatsIndex);
  sJSONSet(STORAGE.CHAT_CACHE, chatCache);
}

/**
 * Перемещает чат в начало списка
 */
export function bumpChatToTop(id) {
  chatsIndex = [id, ...chatsIndex.filter((x) => x !== id)];
}

/**
 * Получает активный чат
 */
export function getActiveChat() {
  ensureChat(activeChatId);
  return chatCache[activeChatId];
}

/**
 * Получает все сообщения активного чата
 */
export function getMessages() {
  if (!activeChatId) return [];
  return getActiveChat().messages || [];
}

/**
 * Создает название чата из первого сообщения
 */
export function makeChatTitleFromText(text) {
  const t = String(text || "").trim();
  if (!t) return "Новый чат";
  return t.length > 22 ? t.slice(0, 22) + "…" : t;
}

/**
 * Удаляет пустые чаты
 */
export function cleanupEmptyChats() {
  const userIsInChatNow = true; // должно проверяться из UI модуля
  const toDelete = chatsIndex.filter((id) => {
    const c = chatCache[id];
    if (!c) return true;
    if (!Array.isArray(c.messages)) return true;
    return c.messages.length === 0 && !userIsInChatNow;
  });

  if (!toDelete.length) return;

  toDelete.forEach((id) => delete chatCache[id]);
  chatsIndex = chatsIndex.filter((id) => !toDelete.includes(id));

  if (toDelete.includes(activeChatId)) {
    activeChatId = chatsIndex[0] || "";
  }

  if (!activeChatId) {
    createNewChat();
  }

  saveChats();
}

/**
 * Устанавливает активный чат
 */
export function setActiveChat(id) {
  cleanupEmptyChats();
  activeChatId = id;
  ensureChat(activeChatId);

  if (!chatsIndex.includes(activeChatId)) {
    chatsIndex.push(activeChatId);
  }
  bumpChatToTop(activeChatId);
  saveChats();
}

/**
 * Создает новый чат
 */
export function createNewChat() {
  cleanupEmptyChats();

  const id = uuid();
  chatCache[id] = {
    meta: { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() },
    messages: [],
  };
  chatsIndex = [id, ...chatsIndex.filter((x) => x !== id)];
  setActiveChat(id);
}

/**
 * Сбрасывает все чаты
 */
export function resetAllChats() {
  chatCache = {};
  chatsIndex = [];
  activeChatId = "";
  saveChats();
  createNewChat();
}

/**
 * Добавляет сообщение в активный чат
 */
export function pushMsg(who, text, opts = {}) {
  if (!activeChatId) createNewChat();

  const c = getActiveChat();
  const msg = {
    msg_id: opts.msg_id || uuid(),
    who,
    text: String(text ?? ""),
    ts: opts.ts ?? Date.now(),
  };

  c.messages.push(msg);
  c.meta.updatedAt = Date.now();

  if (c.meta.title === "Новый чат" && who === "user") {
    c.meta.title = makeChatTitleFromText(text);
  }

  bumpChatToTop(activeChatId);
  saveChats();

  return msg;
}

/**
 * Получает список всех чатов
 */
export function getAllChats() {
  return chatsIndex.map((id) => ({
    id,
    ...chatCache[id],
  }));
}

/**
 * Ищет чаты по названию
 */
export function searchChats(query) {
  const q = query.toLowerCase();
  return chatsIndex.filter((id) => {
    const c = chatCache[id];
    return c?.meta?.title?.toLowerCase().includes(q);
  });
}

/**
 * Удаляет чат
 */
export function deleteChat(id) {
  delete chatCache[id];
  chatsIndex = chatsIndex.filter((x) => x !== id);
  if (activeChatId === id) {
    activeChatId = chatsIndex[0] || "";
    if (!activeChatId) createNewChat();
  }
  saveChats();
}

/**
 * Очищает историю сообщений в чате
 */
export function clearChatHistory(id) {
  const c = chatCache[id];
  if (c) {
    c.messages = [];
    c.meta.updatedAt = Date.now();
    saveChats();
  }
}

/**
 * Экспортирует чат в JSON
 */
export function exportChat(id) {
  const c = chatCache[id];
  if (!c) return null;
  return JSON.stringify(
    {
      ...c,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

/**
 * Получает текущий активный ID чата
 */
export function getActiveChatId() {
  return activeChatId;
}

/**
 * Устанавливает текущий активный ID чата (для инициализации)
 */
export function setActiveChatIdInit(id) {
  activeChatId = id;
}
