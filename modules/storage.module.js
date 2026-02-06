/**
 * Storage Module
 * Управление данными (localStorage + IndexedDB)
 */

const memStore = new Map();
const DB_NAME = "LSD_DB";
const DB_VERSION = 1;

/**
 * Safe Storage (синхронное хранилище)
 */
export function sGet(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return memStore.get(key) || fallback;
  }
}

export function sSet(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    memStore.set(key, value);
  }
}

export function sRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    memStore.delete(key);
  }
}

export function sJSONGet(key, fallback) {
  const raw = sGet(key, null);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function sJSONSet(key, obj) {
  sSet(key, JSON.stringify(obj));
}

/**
 * Storage Keys (константы)
 */
export const STORAGE = {
  PROFILE: "lsd_profile_v2",
  POINTS: "lsd_points_v1",
  ACTIVE_CHAT: "lsd_active_chat_v3",
  CHATS_INDEX: "lsd_chats_index_v1",
  CHAT_CACHE: "lsd_chat_cache_v3",
  TASKS_GROUPS: "lsd_tasks_groups_v2",
  SUB_PLAN: "lsd_sub_plan_v1",
  DRAFT_MESSAGE: "lsd_draft_message",
};

/**
 * IndexedDB для больших объемов данных
 */
let db = null;

export async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };

    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains("chats")) {
        database.createObjectStore("chats", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("messages")) {
        database.createObjectStore("messages", { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

export async function idbSet(storeName, key, data) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put({ id: key, ...data });
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export async function idbGet(storeName, key) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export async function idbDelete(storeName, key) {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

/**
 * Clear all storage (очистка всех данных)
 */
export function clearAllStorage() {
  Object.values(STORAGE).forEach((key) => sRemove(key));
  memStore.clear();
}

/**
 * Export/Import для backup
 */
export function exportAllData() {
  const data = {};
  Object.entries(STORAGE).forEach(([key, storageKey]) => {
    try {
      data[key] = sJSONGet(storageKey, null);
    } catch {
      data[key] = null;
    }
  });
  return data;
}

export function importData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid data format");
  }
  Object.entries(data).forEach(([key, value]) => {
    const storageKey = STORAGE[key];
    if (storageKey && value !== null) {
      sJSONSet(storageKey, value);
    }
  });
}
