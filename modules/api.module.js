/**
 * API Module
 * Управление сетевыми запросами к серверу
 */

import { logError } from "./utils.module.js";

export const API_BASE = "https://lsd-server-ml3z.onrender.com";

/**
 * Базовая функция для JSON запросов
 */
export async function postJSON(url, payload, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("Request timeout");
    }
    logError(e, { url, payload });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Функция для загрузки файлов (FormData)
 */
export async function postForm(url, formData, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("Upload timeout");
    }
    logError(e, { url });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * API методы для чатов
 */
export const chatAPI = {
  async getMessages(chatId, limit = 50) {
    return postJSON("/api/chat/messages", { chatId, limit });
  },

  async sendMessage(chatId, text, who = "user") {
    return postJSON("/api/chat/message", { chatId, text, who });
  },

  async getChats() {
    return postJSON("/api/chats", {});
  },

  async syncMessages(chatId, messages) {
    return postJSON("/api/chat/sync", { chatId, messages });
  },
};

/**
 * API методы для задач
 */
export const tasksAPI = {
  async createPlan(messages, userProfile) {
    return postJSON("/api/plan/create", { messages, userProfile });
  },

  async savePlan(planId, accepted) {
    return postJSON("/api/plan/save", { planId, accepted });
  },
};

/**
 * API методы для профиля
 */
export const profileAPI = {
  async initUser(tgId, profile) {
    return postJSON("/api/user/init", { tgId, profile });
  },

  async updateProfile(tgId, profile) {
    return postJSON("/api/user/profile", { tgId, profile });
  },
};

/**
 * API методы для подписки
 */
export const subscriptionAPI = {
  async createInvoice(tgId, plan) {
    return postJSON("/api/subscription/invoice", { tgId, plan });
  },

  async verifyPayment(tgId, requestId) {
    return postJSON("/api/subscription/verify", { tgId, requestId });
  },
};

/**
 * Логирование ошибок на сервер
 */
export async function logErrorToServer(error, context = {}) {
  try {
    await postJSON("/api/log-error", {
      message: error?.message || String(error),
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Молча игнорируем ошибки отправки логов
  }
}

/**
 * Health check (проверка доступности сервера)
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
