# 🚀 Quick Start Guide

## За 5 минут от нуля до героя

### Шаг 1: Посмотрите что изменилось

```
✅ 8 новых модулей в папке modules/
✅ Service Worker (sw.js)
✅ PWA Manifest (manifest.json)
✅ 3 документации файла
✅ Новые CSS стили
```

### Шаг 2: Запустите локально

```bash
# Вариант 1: Python
python -m http.server 8080

# Вариант 2: Node.js
npx http-server -p 8080 --cors

# Вариант 3: npm (если установлен)
npm install -g http-server
http-server -p 8080
```

Откройте: **http://localhost:8080**

### Шаг 3: Проверьте что работает

```javascript
// В консоли браузера (F12)

// 1. Service Worker зарегистрирован?
navigator.serviceWorker.getRegistrations()
  .then(r => console.log("✓", r.length, "SW registered"))

// 2. IndexedDB инициализирован?
const db = indexedDB.databases()
  .then(dbs => console.log("✓", dbs.length, "databases"))

// 3. Manifest загружен?
fetch("manifest.json")
  .then(r => console.log("✓", r.ok ? "Manifest OK" : "Error"))
```

### Шаг 4: Используйте модули в консоли

```javascript
// Импортируем прямо в консоль
import { uuid } from "./modules/utils.module.js";
import { sGet, sSet } from "./modules/storage.module.js";

// Создаем UUID
console.log("ID:", uuid());

// Сохраняем данные
sSet("key", "value");
console.log("Saved:", sGet("key"));
```

## 🎯 Основные команды

### Создать новый чат
```javascript
import { createNewChat } from "./modules/chat.module.js";
createNewChat();
```

### Отправить сообщение
```javascript
import { pushMsg } from "./modules/chat.module.js";
const msg = pushMsg("user", "Привет!");
console.log(msg);
```

### Получить все сообщения
```javascript
import { getMessages } from "./modules/chat.module.js";
const messages = getMessages();
console.log(messages);
```

### Поиск чатов
```javascript
import { searchChats } from "./modules/chat.module.js";
const results = searchChats("python");
console.log(results);
```

### Сохранить данные
```javascript
import { sJSONSet, sJSONGet } from "./modules/storage.module.js";
sJSONSet("mydata", { name: "John", age: 25 });
const data = sJSONGet("mydata");
console.log(data);
```

### Обработать ошибку
```javascript
import { showErrorModal } from "./modules/error.module.js";
showErrorModal("Что-то пошло не так!", "Ошибка");
```

### Автосохранять черновик
```javascript
import { initDraftSaving, loadDraft } from "./modules/ux.module.js";
const inputEl = document.getElementById("prompt");
loadDraft(inputEl);        // Восстановить
initDraftSaving(inputEl);  // Сохранять
```

## 📱 PWA функции

### Установить приложение

1. Откройте приложение в мобильном браузере
2. Нажмите ⋮ (меню) → "Установить приложение" (или "Add to home screen")
3. Готово! Можете использовать как нативное приложение

### Оффлайн режим

1. Откройте приложение
2. Отключите интернет
3. Приложение продолжит работать!
4. Включите интернет - синхронизируется автоматически

## 🐛 Отладка

### Включить debug логи

```javascript
// В консоли
localStorage.setItem("DEBUG", "true");
location.reload();

// Все логи будут в консоли
```

### Посмотреть Service Worker

```javascript
// В консоли
navigator.serviceWorker.getRegistrations()
  .then(regs => {
    regs.forEach(reg => {
      console.log("Active:", reg.active?.state);
      console.log("Installing:", reg.installing?.state);
      console.log("Waiting:", reg.waiting?.state);
    });
  });
```

### Очистить кеш

```javascript
// В консоли
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
}).then(() => location.reload());
```

### Удалить Service Worker

```javascript
// В консоли
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(r => r.unregister()))
  .then(() => location.reload());
```

## 🚀 Развертывание

### На Vercel (1 минута)

```bash
# Установить Vercel CLI
npm i -g vercel

# Развернуть
vercel --prod
```

### На Netlify (2 минуты)

```bash
# Установить Netlify CLI
npm i -g netlify-cli

# Развернуть
netlify deploy --prod
```

### Как простой static сервис

```bash
# На любом хостинге просто закиньте файлы
# Убедитесь что:
# 1. HTTPS включен ✓
# 2. sw.js доступен ✓
# 3. manifest.json доступен ✓
```

## 📚 Документация

- **README.md** - полная документация
- **MIGRATION.md** - как мигрировать старый код
- **DEPLOYMENT.md** - как развернуть на production

## 🎓 Примеры кода

### Полный пример: Отправить сообщение

```html
<!-- HTML -->
<input id="message" type="text" placeholder="Сообщение...">
<button id="send" type="button">Отправить</button>
<div id="messages"></div>

<script type="module">
  import { pushMsg, getMessages } from "./modules/chat.module.js";
  import { showErrorModal } from "./modules/error.module.js";

  document.getElementById("send").addEventListener("click", async () => {
    const text = document.getElementById("message").value.trim();
    if (!text) return;

    try {
      // Отправить
      const msg = pushMsg("user", text);
      console.log("✓ Сообщение отправлено:", msg);

      // Очистить input
      document.getElementById("message").value = "";

      // Показать все сообщения
      const messages = getMessages();
      document.getElementById("messages").innerHTML = messages
        .map(m => `<div><strong>${m.who}:</strong> ${m.text}</div>`)
        .join("");
    } catch (error) {
      showErrorModal("Ошибка отправки сообщения");
    }
  });
</script>
```

### Полный пример: Поиск чатов

```html
<input id="search" type="text" placeholder="Поиск...">
<ul id="results"></ul>

<script type="module">
  import { searchChats } from "./modules/chat.module.js";
  import { debounce } from "./modules/utils.module.js";

  const handleSearch = debounce(() => {
    const query = document.getElementById("search").value.trim();
    const results = searchChats(query);
    
    document.getElementById("results").innerHTML = results
      .map(id => `<li>Чат: ${id}</li>`)
      .join("");
  }, 300);

  document.getElementById("search")
    .addEventListener("input", handleSearch);
</script>
```

## ⚡ Performance tips

1. **Используйте debounce** для частых операций
   ```javascript
   import { debounce } from "./modules/utils.module.js";
   input.addEventListener("input", debounce(handleInput, 300));
   ```

2. **Кешируйте DOM элементы**
   ```javascript
   const el = document.getElementById("cache-me");
   // Используйте el в цикле, не querySelectorAll каждый раз
   ```

3. **Используйте IndexedDB** для больших объемов данных
   ```javascript
   import { idbSet, idbGet } from "./modules/storage.module.js";
   ```

4. **Дебаушьте ошибки на сервере**
   ```javascript
   import { logError } from "./modules/utils.module.js";
   logError(error, { context: "important" });
   ```

## 🆘 Если что-то сломалось

### Приложение не загружается?
1. Откройте консоль (F12)
2. Посмотрите ошибки (красный текст)
3. Google/ChatGPT/Claude помогут с ошибкой

### Service Worker не работает?
1. Убедитесь что HTTPS (или localhost)
2. Очистите кеш: `caches.keys().then(...)`
3. Перезагрузите стр.

### Данные потеряны?
1. Проверьте localStorage: `console.log(localStorage)`
2. Проверьте IndexedDB в DevTools
3. Восстановите из backup если был

### Ничего не помогает?
1. Очистите всё: `localStorage.clear()`
2. Удалите SW: `navigator.serviceWorker.getRegistrations()`
3. Перезагрузите браузер

---

**Готово? Запустите `python -m http.server 8080` и дерзайте! 🚀**
