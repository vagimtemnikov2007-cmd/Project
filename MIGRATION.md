# 🔄 Руководство по миграции на модульную архитектуру

## Этап 1: Постепенная миграция функций

Старый монолитный `JavaScript.js` содержит ~1500 строк. Вместо полной переписи, можно постепенно переносить логику в модули.

### Шаг 1: Переместить функции в нужный модуль

**Было (JavaScript.js):**
```javascript
// CHAT MANAGEMENT
function setActiveChat(id) {
  cleanupEmptyChats();
  activeChatId = id;
  ensureChat(activeChatId);
  // ... 10 строк кода
}
```

**Стало (modules/chat.module.js):**
```javascript
export function setActiveChat(id) {
  cleanupEmptyChats();
  activeChatId = id;
  ensureChat(activeChatId);
  // ... остальной код
}
```

### Шаг 2: Заменить импорт

**В новом коде:**
```javascript
import { setActiveChat } from "./modules/chat.module.js";

// Теперь используете функцию
setActiveChat("some-id");
```

## Этап 2: Миграция по областям

### ✅ Область 1: Утилиты (EASY)

Функции которые легко перенести:
- `uuid()` → `utils.module.js`
- `escapeHTML()` → `utils.module.js`
- `fmtTime()` → `utils.module.js`
- `getTgIdOrNull()` → `utils.module.js`

```javascript
// Старое
const id = uuid();

// Новое
import { uuid } from "./modules/utils.module.js";
const id = uuid();
```

### ✅ Область 2: Хранилище (MEDIUM)

```javascript
// Старое
sGet(key, default)
sSet(key, value)

// Новое - всё то же самое
import { sGet, sSet } from "./modules/storage.module.js";
sGet(key, default);
sSet(key, value);
```

**Но добавились новые возможности:**
```javascript
// Экспорт/импорт всех данных
import { exportAllData, importData } from "./modules/storage.module.js";

const backup = exportAllData();
localStorage.setItem("backup", JSON.stringify(backup));

// Позже восстановить
const backup = JSON.parse(localStorage.getItem("backup"));
importData(backup);
```

### ✅ Область 3: API (MEDIUM)

```javascript
// Старое
postJSON("/api/message", payload);

// Новое - точно то же, но в отдельном модуле
import { postJSON, chatAPI } from "./modules/api.module.js";
postJSON("/api/message", payload);

// Плюс есть удобные alias'ы
chatAPI.sendMessage(chatId, text);
tasksAPI.createPlan(messages, profile);
profileAPI.updateProfile(tgId, profile);
```

### ✅ Область 4: Чаты (HARD)

Большая, но самая важная область:

```javascript
// Старое
function pushMsg(who, text) { ... }
function getMessages() { ... }
function setActiveChat(id) { ... }

// Новое - всё в chat.module.js
import {
  pushMsg,
  getMessages, 
  setActiveChat,
  createNewChat,
  searchChats,
  deleteChat
} from "./modules/chat.module.js";
```

**Посмотрите как используется:**
```javascript
// Отправить сообщение
const msg = pushMsg("user", "Привет!");

// Получить все сообщения
const messages = getMessages();

// Переключить на другой чат
setActiveChat("chat-id");

// Создать новый чат
createNewChat();

// Поиск
const results = searchChats("python");
```

### ✅ Область 5: Задачи (MEDIUM)

```javascript
import {
  getAllGroups,
  addGroupToTasks,
  markTaskDone,
  getStats,
  calcGroupPoints
} from "./modules/tasks.module.js";

// Получить все группы задач
const groups = getAllGroups();

// Добавить новую группу
const newGroup = addGroupToTasks({
  title: "День 1",
  items: [...]
});

// Отметить задачу как выполненную
markTaskDone(groupId, itemIndex);

// Получить статистику
const stats = getStats();
console.log(`Всего: ${stats.totalTasks}, выполнено: ${stats.completedTasks}`);
```

## Этап 3: Обработка ошибок

### Старый способ
```javascript
try {
  const data = await postJSON("/api/message", payload);
} catch (e) {
  alert("Ошибка: " + e.message);
}
```

### Новый способ
```javascript
import { postJSON } from "./modules/api.module.js";
import { handleAPIError } from "./modules/error.module.js";

try {
  const data = await postJSON("/api/message", payload);
} catch (error) {
  handleAPIError(error, {
    action: "sendMessage",
    payload: payload
  });
}
```

Теперь ошибка:
1. 🎨 Показывается красивой модалью
2. 📊 Логируется на сервер
3. 🔄 Есть кнопка retry
4. 📱 Работает на мобильных

## Этап 4: UX улучшения

### Auto-save drafts

```javascript
import { initDraftSaving, loadDraft, clearDraft } from "./modules/ux.module.js";

const promptEl = document.getElementById("prompt");

// При загрузке - восстановить черновик
loadDraft(promptEl);

// При вводе - автосохранять
initDraftSaving(promptEl);

// При отправке - очистить
promptEl.value = "";
clearDraft();
```

### Search

```javascript
import { searchChats } from "./modules/chat.module.js";

function handleSearch(query) {
  const results = searchChats(query);
  // Отрендерить results
}
```

### Badges

```javascript
import { setUnreadBadge, incrementUnread, clearUnread } from "./modules/ux.module.js";

// Получили новое сообщение
incrementUnread();

// Прочитали все
clearUnread();

// Установить конкретное значение
setUnreadBadge(5);
```

### Keyboard shortcuts

```javascript
import { initKeyboardShortcuts } from "./modules/ux.module.js";

// Инициализировать встроенные shortcuts
initKeyboardShortcuts();

// Добавьте свой
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    saveCurrentChat();
  }
});
```

## Этап 5: Обновление render функций

Вместо больших функций рендера, создайте их в отдельном UI модуле:

```javascript
// ui.module.js
export function renderMessages(messages) {
  const html = messages.map(m => `
    <div class="msg ${m.who}">
      <p>${escapeHTML(m.text)}</p>
      <time>${fmtTime(m.ts)}</time>
    </div>
  `).join("");
  
  const chatMessagesEl = document.getElementById("chatMessages");
  chatMessagesEl.innerHTML = html;
}

export function renderChats(chats) {
  // ... рендер списка чатов
}

export function renderTasks(groups) {
  // ... рендер задач
}
```

## Этап 6: Event listeners

Вместо прямого вызова функций, используйте события:

```javascript
// Отправить сообщение по клику
import { sendMessage } from "./api.module.js";

document.getElementById("sendBtn").addEventListener("click", async () => {
  try {
    await sendMessage();
    // Дисклатчить событие для других модулей
    window.dispatchEvent(new CustomEvent("message-sent"));
  } catch (error) {
    handleAPIError(error);
  }
});

// Другой модуль может подписаться
window.addEventListener("message-sent", () => {
  clearDraft();
  updateBadge();
});
```

## Этап 7: Тестирование

После миграции каждой функции, тестируйте её:

```javascript
// test/chat.test.js
import { 
  pushMsg, 
  getMessages, 
  getAllChats 
} from "../modules/chat.module.js";

describe("Chat Module", () => {
  it("should push message", () => {
    const msg = pushMsg("user", "Hello");
    expect(msg.text).toBe("Hello");
  });

  it("should get messages", () => {
    pushMsg("user", "Test");
    const messages = getMessages();
    expect(messages.length).toBe(1);
  });
});
```

## Этап 8: Оптимизация

После миграции всего кода:

1. **Удалить** неиспользованные функции из `JavaScript.js`
2. **Переименовать** файлы с конкретным назначением
3. **Добавить** webpack/Vite для бундлинга
4. **Минифицировать** и сжимать код

## ✅ Чек-лист миграции

- [ ] Перенесены утилиты (utils.module.js)
- [ ] Перенесены функции хранилища (storage.module.js)
- [ ] Перенесены API функции (api.module.js)
- [ ] Перенесены функции чатов (chat.module.js)
- [ ] Перенесены функции задач (tasks.module.js)
- [ ] Добавлена обработка ошибок (error.module.js)
- [ ] Добавлены UX улучшения (ux.module.js)
- [ ] Обновлены все импорты
- [ ] Добавлены события между модулями
- [ ] Написаны тесты
- [ ] Протестировано на мобильных
- [ ] Развернуто на продакшн

## Помощь

Если сложно мигрировать:

1. **Идентифицируйте** какую часть кода нужно перенести
2. **Найдите** где она используется
3. **Скопируйте** в нужный модуль
4. **Обновите** импорты
5. **Тестируйте** каждый шаг

Помните: лучше перенести 10% кода правильно, чем 100% неправильно! 🚀
