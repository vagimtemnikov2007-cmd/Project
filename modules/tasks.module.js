/**
 * Tasks Module
 * Управление задачами и планами
 */

import { sJSONGet, sJSONSet, STORAGE } from "./storage.module.js";

let tasksState = sJSONGet(STORAGE.TASKS_GROUPS, { groups: [] });

/**
 * Сохраняет состояние задач
 */
export function saveTasksState() {
  sJSONSet(STORAGE.TASKS_GROUPS, tasksState);
}

/**
 * Конвертирует уровень энергии в цифру (1-3)
 */
export function energyToLevel(energy) {
  const e = String(energy || "").toLowerCase();
  if (!e) return 2;
  if (e.includes("easy") || e.includes("легк")) return 1;
  if (e.includes("hard") || e.includes("тяж")) return 3;
  return 2;
}

/**
 * Возвращает label для уровня
 */
export function levelLabel(level) {
  if (level <= 1) return "Лёгкая";
  if (level === 2) return "Средняя";
  return "Сложная";
}

/**
 * Получает метаинформацию группы
 */
export function groupMeta(group) {
  const items = Array.isArray(group.items) ? group.items : [];
  const total = items.length;
  const done = items.filter((x) => x.done).length;
  const easy = items.filter((x) => energyToLevel(x.energy) === 1).length;
  const hard = items.filter((x) => energyToLevel(x.energy) === 3).length;

  return { total, done, easy, hard };
}

/**
 * Расчитывает очки за группу
 */
export function calcGroupPoints(g) {
  if (!Array.isArray(g.items)) return 0;
  return g.items.reduce((sum, item) => {
    if (!item.done) return sum;
    const level = energyToLevel(item.energy);
    return sum + (level === 1 ? 5 : level === 2 ? 10 : 15);
  }, 0);
}

/**
 * Добавляет группу задач
 */
export function addGroupToTasks(group) {
  if (!tasksState.groups) tasksState.groups = [];
  
  const newGroup = {
    id: `group_${Date.now()}`,
    title: group.title || "Новая группа",
    items: Array.isArray(group.items) ? group.items : [],
    createdAt: Date.now(),
  };
  
  tasksState.groups.push(newGroup);
  saveTasksState();
  
  return newGroup;
}

/**
 * Обновляет группу
 */
export function updateGroup(groupId, updates) {
  const group = tasksState.groups?.find((g) => g.id === groupId);
  if (!group) return false;
  
  Object.assign(group, updates);
  saveTasksState();
  return true;
}

/**
 * Удаляет группу
 */
export function deleteGroup(groupId) {
  tasksState.groups = tasksState.groups?.filter((g) => g.id !== groupId) || [];
  saveTasksState();
}

/**
 * Помечает задачу как выполненную
 */
export function markTaskDone(groupId, itemIndex) {
  const group = tasksState.groups?.find((g) => g.id === groupId);
  if (!group || !group.items || !group.items[itemIndex]) return false;
  
  group.items[itemIndex].done = !group.items[itemIndex].done;
  saveTasksState();
  return true;
}

/**
 * Очищает все задачи
 */
export function clearAllTasks() {
  tasksState.groups = [];
  saveTasksState();
}

/**
 * Получает все группы
 */
export function getAllGroups() {
  return tasksState.groups || [];
}

/**
 * Получает статистику
 */
export function getStats() {
  const groups = tasksState.groups || [];
  let totalTasks = 0;
  let completedTasks = 0;
  let totalPoints = 0;

  groups.forEach((group) => {
    const items = group.items || [];
    totalTasks += items.length;
    completedTasks += items.filter((x) => x.done).length;
    totalPoints += calcGroupPoints(group);
  });

  return {
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    totalPoints,
    groupCount: groups.length,
  };
}

/**
 * Экспортирует задачи в JSON
 */
export function exportTasks() {
  return JSON.stringify(
    {
      groups: tasksState.groups,
      stats: getStats(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

/**
 * Импортирует задачи из JSON
 */
export function importTasks(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data.groups)) {
      throw new Error("Invalid groups format");
    }
    tasksState.groups = data.groups;
    saveTasksState();
    return true;
  } catch (e) {
    console.error("Failed to import tasks:", e);
    return false;
  }
}

/**
 * Получает задачи по уровню сложности
 */
export function getTasksByLevel(level) {
  const groups = tasksState.groups || [];
  const filtered = [];

  groups.forEach((group) => {
    const items = (group.items || []).filter(
      (item) => energyToLevel(item.energy) === level
    );
    if (items.length > 0) {
      filtered.push({
        ...group,
        items,
      });
    }
  });

  return filtered;
}
/**
 * Получает группу по ID
 */
export function getGroupById(groupId) {
  return tasksState.groups?.find((g) => g.id === groupId);
}

/**
 * Сохраняет задачу (обновляет status completed)
 */
export function saveTask(task) {
  const groups = tasksState.groups || [];
  for (const group of groups) {
    if (group.tasks) {
      const foundTask = group.tasks.find(t => t.id === task.id);
      if (foundTask) {
        Object.assign(foundTask, task);
        saveTasksState();
        return true;
      }
    }
    // Также поддерживаем старую структуру с items
    if (group.items) {
      const foundItem = group.items.find(item => item.id === task.id);
      if (foundItem) {
        Object.assign(foundItem, task);
        saveTasksState();
        return true;
      }
    }
  }
  return false;
}

/**
 * Обновляет задачу
 */
export function updateTask(taskId, updates) {
  const groups = tasksState.groups || [];
  for (const group of groups) {
    // Проверяем новую структуру с tasks
    if (group.tasks) {
      const task = group.tasks.find(t => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
        saveTasksState();
        return true;
      }
    }
    // Также поддерживаем старую структуру с items
    if (group.items) {
      const item = group.items.find(item => item.id === taskId);
      if (item) {
        Object.assign(item, updates);
        saveTasksState();
        return true;
      }
    }
  }
  return false;
}