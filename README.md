# 🚀 LSD | AI Time Manager - Оптимизированная версия

## 📋 Что было улучшено

### 1. ✅ Модульная архитектура

Код был разбит на независимые модули в папке `/modules/`:

- **`utils.module.js`** - Вспомогательные функции (uuid, форматирование, emoji, Telegram API)
- **`storage.module.js`** - Управление данными (localStorage, IndexedDB, импорт/экспорт)
- **`api.module.js`** - Сетевые запросы с обработкой ошибок и таймаутами
- **`chat.module.js`** - Полная логика управления чатами
- **`tasks.module.js`** - Управление задачами, планов и статистики
- **`error.module.js`** - Красивая обработка ошибок с модалями
- **`ux.module.js`** - Улучшения UX (drafts, поиск, badges, shortcuts)

**Преимущества:**
- ✅ Легко тестировать отдельные модули
- ✅ Простое масштабирование
- ✅ Переиспользуемый код
- ✅ Меньше конфликтов в git

### 2. ✅ Service Worker для offline

**`sw.js`** - Полноценный Service Worker с:
- 📱 Offline support (работает без интернета)
- 💾 Кеширование статических файлов
- 🌐 Network first для API, cache first для статики
- 🔔 Push notifications
- 🔄 Background sync

**Как работает:**
```
Пользователь отправляет сообщение → Service Worker перехватывает
↓
Если есть интернет → отправляет на сервер + кеширует
Если нет интернета → сохраняет в кеш → синхронизирует потом
```

### 3. ✅ Error Handling

**В `error.module.js`:**
- 🎨 Красивые модальные окна ошибок
- 📝 Toast уведомления
- 🔄 Retry функции
- 📊 Логирование ошибок на сервер
- 🛡️ Глобальный обработчик unhandled errors

**Примеры:**
```javascript
import { showErrorModal, showToast } from "./modules/error.module.js";

try {
  await sendMessage();
} catch (error) {
  showErrorModal("Ошибка отправки", "Ошибка запроса");
  showToast("Попробуйте позже");
}
```

### 4. ✅ PWA (Progressive Web App)

**`manifest.json`** + Service Worker = приложение можно установить на экран:
- 📥 "Установить на экран" в мобильном браузере
- 📱 Работает как нативное приложение
- 🎨 Свой иконка и название
- 🔗 Shortcuts для быстрого доступа (Новый чат, Мои задачи)

### 5. ✅ Улучшенный UX

В `ux.module.js`:

#### 📝 Auto-save drafts (Автосохранение черновиков)
```javascript
import { initDraftSaving, loadDraft } from "./modules/ux.module.js";

initDraftSaving(promptEl);  // Автосохраняет каждую 1 сек
loadDraft(promptEl);        // Восстанавливает при загрузке
```

#### 🔍 Chat search (Поиск по чатам)
```javascript
import { searchChats } from "./modules/chat.module.js";

const results = searchChats("Python");  // Ищет чаты с "Python"
```

#### 🔔 Notification badges (Бейджи уведомлений)
```javascript
import { setUnreadBadge, incrementUnread } from "./modules/ux.module.js";

setUnreadBadge(5);  // Показывает 5
incrementUnread();  // +1
```

#### ⌨️ Keyboard shortcuts
- `Ctrl+K` / `Cmd+K` - Открыть поиск
- `Ctrl+Shift+E` - Экспортировать данные
- `Ctrl+Shift+S` - Открыть настройки

#### 👆 Swipe gestures
- Свайп вправо - Открыть меню
- Свайп влево - Закрыть меню
- Свайп вверх - Создать план

#### 💡 Smart suggestions
Подсказки на основе текущего запроса.

## 🏗️ Архитектура приложения

```
index.html
├── Service Worker (sw.js)
├── Manifest (manifest.json)
└── Модули:
    ├── utils.module.js       → Утилиты
    ├── storage.module.js     → Хранилище
    ├── api.module.js         → Сеть
    ├── chat.module.js        → Чаты
    ├── tasks.module.js       → Задачи
    ├── error.module.js       → Ошибки
    └── ux.module.js          → UX улучшения

JavaScript.js (старый код - оставлен для совместимости)
```

## 🚀 Как использовать новые модули

### Импорт модулей

```javascript
// ES6 modules (в index.html используется type="module")
import { uuid, debounce } from "./modules/utils.module.js";
import { sGet, sSet, STORAGE } from "./modules/storage.module.js";
import { postJSON } from "./modules/api.module.js";
import { 
  getMessages, 
  pushMsg, 
  createNewChat 
} from "./modules/chat.module.js";
import { 
  getAllGroups, 
  calcGroupPoints 
} from "./modules/tasks.module.js";
import { showErrorModal } from "./modules/error.module.js";
import { initDraftSaving } from "./modules/ux.module.js";
```

### Примеры использования

#### Отправить сообщение с обработкой ошибок
```javascript
import { postJSON } from "./modules/api.module.js";
import { handleAPIError } from "./modules/error.module.js";

try {
  const response = await postJSON("/api/message", { text: "Hello" });
  console.log("✅ Сообщение отправлено:", response);
} catch (error) {
  handleAPIError(error, { action: "sendMessage" });
}
```

#### Работа с хранилищем
```javascript
import { sGet, sSet, sJSONGet, sJSONSet, STORAGE } from "./modules/storage.module.js";

// Строковое значение
sSet(STORAGE.DRAFT_MESSAGE, "Мой текст");
const draft = sGet(STORAGE.DRAFT_MESSAGE);

// JSON объект
sJSONSet("my_data", { name: "John", age: 25 });
const data = sJSONGet("my_data", {});
```

#### Управление чатами
```javascript
import { 
  setActiveChat, 
  createNewChat, 
  pushMsg, 
  getMessages,
  searchChats
} from "./modules/chat.module.js";

// Создать новый чат
createNewChat();

// Отправить сообщение
const msg = pushMsg("user", "Привет LSD!");

// Получить все сообщения
const messages = getMessages();

// Поиск чатов
const results = searchChats("Python");
```

## 📊 Статистика

```
Старое: 1500+ строк в одном файле
Новое: Разбито на 8 модулей по 150-300 строк каждый

Преимущества:
- 📉 Уменьшена цикломатическая сложность
- 🧪 Легче писать тесты
- 🔧 Проще поддерживать
- 🚀 Быстрее загружается (модули кешируются отдельно)
```

## 🔧 Миграция со старого кода

Старый `JavaScript.js` все ещё работает для совместимости. Постепенно мигрируйте код в модули:

**Было:**
```javascript
// Всё в одном большом файле
function sendMessage() { ... }
function getMessages() { ... }
function createNewChat() { ... }
```

**Стало:**
```javascript
// chat.module.js
export function pushMsg(who, text) { ... }
export function getMessages() { ... }
export function createNewChat() { ... }

// app.js
import { pushMsg, getMessages, createNewChat } from "./modules/chat.module.js";
```

## 📦 Развертывание

### На локальном хосте
```bash
# Нужен HTTPS для Service Worker (или localhost)
npx http-server -p 8080 --cors

# Или используйте Python
python -m http.server 8080
```

### На продакшене
- ✅ Используйте HTTPS (обязательно)
- ✅ Service Worker будет автоматически обновляться
- ✅ Браузер покажет уведомление об обновлении

## 🐛 Отладка

### Проверить Service Worker
```javascript
navigator.serviceWorker.getRegistrations()
  .then(registrations => {
    registrations.forEach(reg => console.log(reg));
  });
```

### Очистить кеш
```javascript
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

### Логи
```javascript
// Все логи отправляются в консоль браузера
// И на сервер через logErrorToServer()
import { logError } from "./modules/utils.module.js";
logError(new Error("Что-то не так"), { context: "info" });
```

## 📈 Следующие улучшения

- [ ] Unit тесты для каждого модуля
- [ ] E2E тесты (Cypress/Playwright)
- [ ] Webpack/Vite для минификации
- [ ] TypeScript для типизации
- [ ] Более продвинутый offline sync
- [ ] Analytics и performance tracking

## 🎯 Заключение

Приложение теперь:
✅ Модульное и расширяемое
✅ Работает offline
✅ Имеет красивую обработку ошибок
✅ Может быть установить как PWA
✅ Имеет множество UX улучшений

**Для вопросов и поддержки:** смотрите комментарии в коде!
