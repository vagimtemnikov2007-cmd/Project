/**
 * Task UI Module
 * Управление UI для задач с прогресс баром и фильтрацией по чатам
 */

import { 
  calculateTotalProgress,
  getProgressEmoji,
  estimateTimeRemaining,
  updateProgressWithAnimation 
} from "./progress.module.js";
import { getAllChats, getActiveChatId } from "./chat.module.js";
import { getAllGroups } from "./tasks.module.js";
import { $ } from "./utils.module.js";

let currentChatFilter = "all";

/**
 * Обновляет прогресс бар
 */
export function updateProgressDisplay() {
  const progress = calculateTotalProgress();
  
  const progressFill = $("progressFill");
  const progressPercent = $("progressPercent");
  const progressEmoji = $("progressEmoji");
  const completedCount = $("completedCount");
  const remainingCount = $("remainingCount");
  const totalCount = $("totalCount");

  if (progressFill && progressPercent) {
    const color = getProgressColor(progress.percentage);
    progressFill.style.width = progress.percentage + "%";
    progressFill.style.backgroundColor = color;
    progressPercent.textContent = progress.percentage + "%";

    if (progressEmoji) progressEmoji.textContent = getProgressEmoji(progress.percentage);
    if (completedCount) completedCount.textContent = progress.completed;
    if (remainingCount) remainingCount.textContent = progress.remaining;
    if (totalCount) totalCount.textContent = progress.total;
  }

  return progress;
}

/**
 * Получает цвет для прогресс бара
 */
export function getProgressColor(percentage) {
  if (percentage === 0) return "#e0e0e0";
  if (percentage < 25) return "#ff6b6b";
  if (percentage < 50) return "#ffa654";
  if (percentage < 75) return "#ffd93d";
  if (percentage < 100) return "#a8e6cf";
  return "#2ecc71";
}

/**
 * Инициализирует фильтр задач по чатам
 */
export function initChatFilterTabs() {
  const filterScroll = $("chatFilterScroll");
  if (!filterScroll) return;

  const chats = getAllChats();
  
  // Очищаем старые кнопки
  filterScroll.innerHTML = "";

  // Создаём кнопку для каждого чата
  chats.forEach((chat) => {
    const btn = document.createElement("button");
    btn.className = "chatFilterItem";
    btn.type = "button";
    btn.setAttribute("data-chat-id", chat.id);
    btn.innerHTML = `<span>${chat.meta?.emoji || "💬"}</span><span>${chat.meta?.title || "Чат"}</span>`;

    btn.addEventListener("click", () => {
      setTaskFilter(chat.id, chat.meta?.title || "Чат");
    });

    filterScroll.appendChild(btn);
  });
}

/**
 * Устанавливает текущий фильтр задач
 */
export function setTaskFilter(chatId, chatTitle) {
  currentChatFilter = chatId;

  // Обновляем активную кнопку
  document.querySelectorAll(".chatFilterBtn, .chatFilterItem").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-chat-id") === chatId) {
      btn.classList.add("active");
    }
  });

  // Обновляем отображение задач
  renderTasksWithGrouping(chatId !== "all" ? chatId : null);
}

/**
 * Инициализирует обработчики событий для задач
 */
export function initTaskHandlers(markTaskDoneCallback, clearAllCallback) {
  // Обработчики добавляются динамически при рендерировании
}

/**
 * Обновляет фильтры при переключении чата
 */
export function updateFiltersOnChatChange() {
  const activeChatId = getActiveChatId();
  
  // Автоматически переключаемся на "все" при смене основного чата
  if (currentChatFilter !== "all") {
    setTaskFilter("all", "Все задачи");
  }

  initChatFilterTabs();
}

/**
 * Инициализирует весь интерфейс задач
 */
export function initTasksUI(markTaskDoneCallback, clearAllCallback) {
  // Инициализируем фильтры
  initChatFilterTabs();
  
  // Устанавливаем начальный фильтр
  setTaskFilter("all", "Все задачи");

  // Инициализируем обработчики
  initTaskHandlers(markTaskDoneCallback, clearAllCallback);

  // Обновляем прогресс
  updateProgressDisplay();

  // Рендеринг задач
  renderTasksWithGrouping();
}

/**
 * Получает текущий выбранный фильтр
 */
export function getCurrentFilter() {
  return currentChatFilter;
}

/**
 * Рендеринг задач с группировкой
 */
export function renderTasksWithGrouping(filter = null) {
  const container = $("tasksList");
  if (!container) return;

  const allGroups = getAllGroups();
  if (!allGroups || allGroups.length === 0) {
    container.innerHTML = '<li class="taskItem"><div class="taskText">Задач пока нет 🙂</div></li>';
    return;
  }

  let filtered = allGroups;
  
  container.innerHTML = filtered.map(group => renderTaskGroup(group)).join("");

  // Обработчики для развёртывания групп
  container.querySelectorAll(".taskGroupHead").forEach(head => {
    head.addEventListener("click", (e) => {
      if (e.target.closest(".metaPill")) return;
      const g = head.closest(".taskGroup");
      const body = g.querySelector(".taskGroupBody");
      head.classList.toggle("open");
      if (body) body.classList.toggle("open");
      
      // Сохраняем состояние
      const groupId = g.dataset.groupId;
      const group = getGroupById(groupId);
      if (group) {
        group.open = !group.open;
      }
    });
  });

  // Обработчики для чекбоксов задач
  container.querySelectorAll(".taskRow input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const row = e.target.closest(".taskRow");
      const groupEl = row.closest(".taskGroup");
      const groupId = groupEl?.dataset.groupId;
      const itemIndex = Array.from(groupEl.querySelectorAll(".taskRow")).indexOf(row);
      
      if (groupId && itemIndex >= 0) {
        const group = getGroupById(groupId);
        if (group && group.items && group.items[itemIndex]) {
          group.items[itemIndex].done = !group.items[itemIndex].done;
          updateProgressDisplay();
          renderTasksWithGrouping(filter);
          window.dispatchEvent(new CustomEvent("tasks-updated"));
        }
      }
    });
  });
}

/**
 * Рендеринг одной группы задач
 */
function renderTaskGroup(group) {
  if (!group) return "";

  const items = Array.isArray(group.items) ? group.items : [];
  const completed = items.filter(item => item.done).length;
  const total = items.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const totalMin = items.reduce((sum, item) => sum + (Number(item.min) || 0), 0);
  const levels = items.map(item => Number(item.level) || 2);
  const avgLevel = levels.length > 0 ? Math.round(levels.reduce((a, b) => a + b) / levels.length) : 2;

  const levelEmoji = (level) => {
    if (level <= 1) return "🟢";
    if (level === 2) return "🟠";
    return "🔴";
  };

  const open = !!group.open;
  const submitted = !!group.submitted;

  return `
    <li class="taskItem taskGroup" data-group-id="${group.id || ''}">
      <div class="taskGroupHead ${open ? "open" : ""}">
        <div class="taskGroupTitle">
          <span class="taskGroupName">${group.title || "План"}</span>
          <span class="taskGroupProgress">${completed}/${total}</span>
        </div>
        <div class="taskGroupMeta">
          <span class="metaPill">⏱ ${totalMin || 0}м</span>
          <span class="metaPill">${levelEmoji(avgLevel)}</span>
          <span class="metaPill">✅ ${completed}/${total}</span>
        </div>
        <span class="taskGroupChevron">${open ? "▾" : "▸"}</span>
      </div>
      <div class="taskGroupBody ${open ? "open" : ''}">
        ${submitted ? `<div class="taskSubmitBar done">🏆 Сдано</div>` : ''}
        <div class="taskGroupProgressBar">
          <div class="taskGroupProgressFill" style="width: ${percentage}%;"></div>
        </div>
        <div class="taskRows">
          ${items.map((item, idx) => renderTaskRow(item, idx)).join("")}
        </div>
      </div>
    </li>
  `;
}

/**
 * Рендеринг одной задачи в списке
 */
function renderTaskRow(item, index) {
  const levelEmoji = (level) => {
    const lv = Number(level) || 2;
    if (lv <= 1) return "🟢";
    if (lv === 2) return "🟠";
    return "🔴";
  };

  return `
    <div class="taskRow ${item.done ? "done" : ""}">
      <label class="taskRowLeft">
        <input type="checkbox" ${item.done ? "checked" : ""} />
        <span class="taskRowText">${item.text || ""}</span>
      </label>
      <div class="taskRowRight">
        ${Number.isFinite(Number(item.min)) ? `<span class="miniMeta">⏱ ${Number(item.min)}м</span>` : ""}
        <span class="miniMeta">${levelEmoji(item.level)}</span>
      </div>
    </div>
  `;
}

/**
 * Получает группу по ID
 */
function getGroupById(groupId) {
  const allGroups = getAllGroups();
  return allGroups.find(g => g.id === groupId);
}
