/**
 * Error Module
 * Красивая обработка ошибок
 */

import { logError } from "./utils.module.js";

/**
 * Error Modal для красивого отображения ошибок
 */
export function showErrorModal(message, title = "Ошибка") {
  const overlay = document.createElement("div");
  overlay.className = "errorOverlay";
  overlay.innerHTML = `
    <div class="errorModal">
      <div class="errorHeader">
        <h2 class="errorTitle">${title}</h2>
        <button class="errorClose" type="button">✕</button
      </div>
      <div class="errorBody">
        <p class="errorMessage">${message}</p>
      </div>
      <div class="errorActions">
        <button class="errorBtn errorBtnRetry" type="button">Повторить</button>
        <button class="errorBtn errorBtnClose" type="button">Закрыть</button>
      </div>
    </div>
  `;

  const closeBtn = overlay.querySelector(".errorClose");
  const retryBtn = overlay.querySelector(".errorBtnRetry");
  const dismissBtn = overlay.querySelector(".errorBtnClose");

  const close = () => {
    overlay.remove();
  };

  closeBtn?.addEventListener("click", close);
  dismissBtn?.addEventListener("click", close);
  
  retryBtn?.addEventListener("click", () => {
    overlay.remove();
    window.dispatchEvent(new CustomEvent("error-retry"));
  });

  document.body.appendChild(overlay);
}

/**
 * Обработчик ошибок API
 */
export function handleAPIError(error, context = {}) {
  logError(error, context);

  let message = "Что-то пошло не так";

  if (error instanceof TypeError) {
    if (error.message.includes("network")) {
      message = "Проверьте интернет соединение";
    } else if (error.message.includes("timeout")) {
      message = "Время ответа истекло. Попробуйте позже";
    }
  } else if (error instanceof Error) {
    if (error.message.includes("401")) {
      message = "Пожалуйста, авторизуйте заново";
    } else if (error.message.includes("404")) {
      message = "Ресурс не найден";
    } else if (error.message.includes("500")) {
      message = "Ошибка сервера. Попробуйте позже";
    } else if (error.message.includes("timeout")) {
      message = "Время ответа истекло";
    } else {
      message = error.message;
    }
  }

  showErrorModal(message, "Ошибка запроса");
}

/**
 * Toast уведомление (временное)
 */
export function showToast(message, duration = 3000) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Loading spinner
 */
export function showLoadingSpinner(text = "Загрузка...") {
  const spinner = document.createElement("div");
  spinner.className = "loadingSpinner";
  spinner.innerHTML = `
    <div class="spinnerOuter">
      <svg class="spinnerSvg" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
      <p class="spinnerText">${message}</p>
    </div>
  `;
  document.body.appendChild(spinner);

  return () => spinner.remove();
}

/**
 * Глобальный обработчик unhandled errors
 */
export function initGlobalErrorHandler() {
  window.addEventListener("error", (event) => {
    handleAPIError(event.error || new Error(event.message), {
      source: "global",
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    handleAPIError(event.reason || new Error("Unhandled Promise rejection"), {
      source: "unhandledrejection",
    });
  });
}

/**
 * Fallback UI когда сервер недоступен
 */
export function showOfflineMode() {
  const offline = document.createElement("div");
  offline.className = "offlineBanner";
  offline.innerHTML = `
    <div class="offlineContent">
      <span class="offlineIcon">📡</span>
      <span class="offlineText">Вы в оффлайн режиме</span>
    </div>
  `;
  document.body.insertBefore(offline, document.body.firstChild);

  return () => offline.remove();
}
