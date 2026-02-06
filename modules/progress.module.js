/**
 * Progress Module
 * Управление прогресс барами и статистикой по задачам
 */

import { getAllGroups, getStats } from "./tasks.module.js";
import { getActiveChatId, getAllChats } from "./chat.module.js";

/**
 * Расчитывает прогресс для группы задач
 */
export function calculateGroupProgress(group) {
  if (!group) {
    return { total: 0, completed: 0, remaining: 0, percentage: 0 };
  }

  // Поддерживаем обе структуры: items и tasks
  const items = Array.isArray(group.items) ? group.items : (Array.isArray(group.tasks) ? group.tasks : []);
  const total = items.length;
  const completed = items.filter((item) => item.done || item.completed).length;
  const remaining = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, remaining, percentage };
}

/**
 * Расчитывает общий прогресс для всех задач
 */
export function calculateTotalProgress() {
  const groups = getAllGroups();
  let total = 0;
  let completed = 0;
  let remaining = 0;

  if (Array.isArray(groups)) {
    groups.forEach((group) => {
      if (group) {
        const items = Array.isArray(group.items) ? group.items : (Array.isArray(group.tasks) ? group.tasks : []);
        total += items.length;
        const itemCompleted = items.filter((item) => item.done || item.completed).length;
        completed += itemCompleted;
        remaining += items.length - itemCompleted;
      }
    });
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    remaining,
    percentage,
    groups: Array.isArray(groups) ? groups.length : 0,
  };
}

/**
 * Расчитывает прогресс по чатам (если задачи связаны с чатами)
 */
export function calculateChatProgress() {
  const chats = getAllChats();
  const progress = {};

  chats.forEach((chat) => {
    // Если у чата есть связанные задачи (нужна их логика)
    // Это пример для интеграции с существующей системой
    progress[chat.id] = {
      chatId: chat.id,
      chatTitle: chat.meta?.title || "Безымянный чат",
      emoji: chat.meta?.emoji || "💬",
      ...calculateTotalProgress(), // Пока всё связано с одним набором задач
    };
  });

  return progress;
}

/**
 * Генерирует HTML для прогресс бара
 */
export function renderProgressBar(percentage, label = "") {
  return `
    <div class="progressContainer">
      <div class="progressInfo">
        <span class="progressLabel">${label}</span>
        <span class="progressPercent">${percentage}%</span>
      </div>
      <div class="progressTrack">
        <div class="progressFill" style="width: ${percentage}%;"></div>
      </div>
    </div>
  `;
}

/**
 * Генерирует HTML для статистики
 */
export function renderStats(total, completed) {
  const remaining = total - completed;
  
  return `
    <div class="statsContainer">
      <div class="statItem">
        <span class="statLabel">✓ Выполнено</span>
        <span class="statValue">${completed}</span>
      </div>
      <div class="statItem">
        <span class="statLabel">📋 Осталось</span>
        <span class="statValue">${remaining}</span>
      </div>
      <div class="statItem">
        <span class="statLabel">📊 Всего</span>
        <span class="statValue">${total}</span>
      </div>
    </div>
  `;
}

/**
 * Генерирует цвет для прогресс бара на основе процента
 */
export function getProgressColor(percentage) {
  if (percentage === 0) return "#e0e0e0"; // Серый
  if (percentage < 25) return "#ff6b6b"; // Красный
  if (percentage < 50) return "#ffa654"; // Оранжевый
  if (percentage < 75) return "#ffd93d"; // Желтый
  if (percentage < 100) return "#a8e6cf"; // Светло-зеленый
  return "#2ecc71"; // Зеленый (завершено)
}

/**
 * Анимирует прогресс бар
 */
export function animateProgressBar(progressBar, targetPercentage, duration = 500) {
  if (!progressBar) return;

  const fill = progressBar.querySelector(".progressFill");
  if (!fill) return;

  const startPercentage = parseFloat(fill.style.width) || 0;
  const startTime = Date.now();

  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = startPercentage + (targetPercentage - startPercentage) * progress;

    fill.style.width = current + "%";
    fill.style.backgroundColor = getProgressColor(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  update();
}

/**
 * Генерирует confetti эффект при 100%
 */
export function showCompletionAnimation() {
  const container = document.createElement("div");
  container.className = "confetti-container";
  document.body.appendChild(container);

  // Создаём конфетти
  for (let i = 0; i < 30; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.innerHTML = ["🎉", "✨", "🎊", "⭐", "🌟"][Math.floor(Math.random() * 5)];
    confetti.style.left = Math.random() * 100 + "%";
    confetti.style.animationDelay = Math.random() * 0.5 + "s";
    container.appendChild(confetti);
  }

  // Удаляем через 3 секунды
  setTimeout(() => container.remove(), 3000);
}

/**
 * Получает эмодзи по проценту выполнения
 */
export function getProgressEmoji(percentage) {
  if (percentage === 0) return "📌";
  if (percentage < 25) return "🔴";
  if (percentage < 50) return "🟠";
  if (percentage < 75) return "🟡";
  if (percentage < 100) return "🟢";
  return "✅";
}

/**
 * Форматирует время оставшейся работы (примерно)
 */
export function estimateTimeRemaining(completedPercentage) {
  // Примерная скорость выполнения: 1% в минуту
  const minutesPerPercent = 1;
  const remaining = 100 - completedPercentage;
  const estimatedMinutes = remaining * minutesPerPercent;

  if (estimatedMinutes < 60) {
    return `~${Math.round(estimatedMinutes)} мин`;
  }

  const hours = Math.round(estimatedMinutes / 60);
  return `~${hours} ч`;
}

/**
 * Генерирует HTML для компактного прогресс индикатора
 */
export function renderCompactProgress(percentage) {
  return `
    <div class="compactProgress">
      <div class="compactProgressBar" style="width: ${percentage}%;"></div>
      <span class="compactProgressText">${percentage}%</span>
    </div>
  `;
}

/**
 * Инициализирует интерактивный прогресс
 */
export function initInteractiveProgress(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const progress = calculateTotalProgress();
  
  container.innerHTML = `
    <div class="interactiveProgress">
      <div class="progressHeader">
        <h3 class="progressTitle">📊 Прогресс задач</h3>
        <span class="progressEmoji">${getProgressEmoji(progress.percentage)}</span>
      </div>

      <div class="progressBarBig">
        ${renderProgressBar(progress.percentage, `${progress.completed}/${progress.total} задач выполнено`)}
      </div>

      <div class="progressStats">
        ${renderStats(progress.total, progress.completed)}
      </div>

      ${progress.total > 0 ? `
        <div class="progressEstimate">
          ⏱️ Осталось: ${estimateTimeRemaining(progress.percentage)}
        </div>
      ` : `
        <div class="progressEmpty">
          Создайте первую задачу!
        </div>
      `}
    </div>
  `;

  return progress;
}

/**
 * Animates progress increment (когда пользователь отмечает задачу)
 */
export function updateProgressWithAnimation(oldPercentage, newPercentage) {
  const progressBar = document.querySelector(".progressFill");
  if (!progressBar) return;

  if (newPercentage === 100 && oldPercentage < 100) {
    // Добавляем confetti если задачи завершены
    setTimeout(() => showCompletionAnimation(), 300);
  }

  animateProgressBar(
    document.querySelector(".progressTrack"),
    newPercentage,
    300
  );
}

/**
 * Создаёт миниатюрный progress widget для чата
 */
export function renderChatProgressWidget(chatId, chatTitle, emoji) {
  // В будущем здесь может быть логика для задач конкретного чата
  const totalProgress = calculateTotalProgress();

  return `
    <div class="chatProgressWidget">
      <div class="widgetHead">
        <span class="widgetEmoji">${emoji}</span>
        <span class="widgetTitle">${chatTitle}</span>
      </div>
      <div class="widgetProgress">
        ${renderCompactProgress(totalProgress.percentage)}
      </div>
      <div class="widgetCount">
        ${totalProgress.completed}/${totalProgress.total}
      </div>
    </div>
  `;
}
