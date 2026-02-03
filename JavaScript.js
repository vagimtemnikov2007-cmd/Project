// LSD Front — FULL (Chats + Tasks + Auto-delete empty chats + Plan -> Tasks)
// Drop-in replacement for your current JavaScript.js

window.addEventListener("DOMContentLoaded", () => {
  // =========================
  // HELPERS
  // =========================
  const $ = (id) => document.getElementById(id);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  const debugLine = $("debugLine");
  const dbg = (msg) => {
    if (debugLine) debugLine.textContent = String(msg);
  };

  // =========================
  // SAFE STORAGE (Telegram WebView fix)
  // =========================
  const memStore = new Map();

  function sGet(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return memStore.has(key) ? memStore.get(key) : fallback;
      return v;
    } catch {
      return memStore.has(key) ? memStore.get(key) : fallback;
    }
  }

  function sSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      memStore.set(key, value);
    }
  }

  function sJSONGet(key, fallback) {
    const raw = sGet(key, null);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function sJSONSet(key, obj) {
    sSet(key, JSON.stringify(obj));
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[ch]));
  }

  // =========================
  // CONFIG
  // =========================
  const API_BASE = "https://lsd-server-ml3z.onrender.com";

  // profile
  const STORAGE_PROFILE = "lsd_profile_v2";

  // chats
  const STORAGE_ACTIVE_CHAT = "lsd_active_chat_v3";
  const STORAGE_CHATS_INDEX = "lsd_chats_index_v1"; // array of chatIds
  const STORAGE_CHAT_CACHE = "lsd_chat_cache_v3";   // { chatId: { meta, messages } }

  // tasks
  const STORAGE_TASKS = "lsd_tasks_v1"; // array [{ id, text, done }]

  const EMOJIS = ["💬","🧠","⚡","🧩","📌","🎯","🧊","🍀","🌙","☀️","🦊","🐺","🐼","🧪","📚"];

  function uuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function pickEmoji() {
    return EMOJIS[(Math.random() * EMOJIS.length) | 0];
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function getTgIdOrNull() {
    const tg = window.Telegram?.WebApp;
    const id = tg?.initDataUnsafe?.user?.id;
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }

async function postJSON(url, payload, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    dbg("➡️ fetch: " + url);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const raw = await res.text();

    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { error: "bad_json_from_server", raw };
    }

    dbg(`⬅️ status=${res.status} ok=${res.ok}`);
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    const msg =
      e?.name === "AbortError"
        ? `timeout_${timeoutMs}ms`
        : String(e?.message || e);

    dbg("❌ fetch error: " + msg);
    return { ok: false, status: 0, data: { error: msg } };
  } finally {
    clearTimeout(timer);
  }
}

  // =========================
  // ELEMENTS
  // =========================
  const settingsBtn = document.querySelector(".settings_bt");
  const drawer = $("settingsDrawer");
  const drawerOverlay = $("drawerOverlay");

  const screenHome = $("screen-home");
  const screenTasks = $("screen-tasks");
  const screenChat = $("screen-chat");

  const navBtn = $("navBtn");
  const navBtnText = navBtn?.querySelector("span");

  const tasksListEl = $("tasksList");
  const clearTasksBtn = $("clearTasks");

  const promptEl = $("prompt");
  const sendBtn = $("sendBtn");

  const chatMessagesEl = $("chatMessages");
  const chatTypingEl = $("chatTyping");

  const planBtn = $("planBtn");

  const userEl = $("user");

  // drawer top user
  const drawerName = $("drawerName");
  const drawerPhone = $("drawerPhone");
  const drawerAvatar = $("drawerAvatar");

  // theme mini btn
  const themeMiniBtn = $("themeMiniBtn");

  // drawer menu
  const menuProfile = $("menuProfile");
  const menuSettings = $("menuSettings");

  // history list container
  const historyList = $("historyList");
  const clearHistoryBtn = $("clearHistory");

  // profile modal
  const profileModal = $("profileModal");
  const profileOverlay = $("profileOverlay");
  const closeProfileBtn = $("closeProfile");

  const profileName = $("profileName");
  const profileAge = $("profileAge");
  const profileNick = $("profileNick");
  const profileBio = $("profileBio");

  // =========================
  // STATE
  // =========================
  let currentScreen = "home";
  let isLoading = false;

  // chats
  let activeChatId = sGet(STORAGE_ACTIVE_CHAT, "");
  let chatsIndex = sJSONGet(STORAGE_CHATS_INDEX, []);
  let chatCache = sJSONGet(STORAGE_CHAT_CACHE, {});

  // tasks
  let tasks = sJSONGet(STORAGE_TASKS, []);

  // =========================
  // UI: SCREEN SWITCH
  // =========================
  function setNavLabel() {
    if (!navBtnText) return;
    navBtnText.textContent = currentScreen === "home" ? "задачи" : "назад";
  }

  function scrollToBottom() {
    if (!chatMessagesEl) return;
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  function switchScreen(name) {
    // если уходим с экрана chat — чистим пустые чаты
    if (currentScreen === "chat" && name !== "chat") {
      cleanupEmptyChats();
    }

    [screenHome, screenTasks, screenChat].forEach((s) => s && s.classList.remove("active"));
    const el = name === "home" ? screenHome : name === "tasks" ? screenTasks : screenChat;
    el && el.classList.add("active");

    currentScreen = name;
    setNavLabel();
    updatePlanVisibility();
    if (name === "chat") scrollToBottom();
  }

  on(navBtn, "click", () => {
    if (currentScreen === "home") switchScreen("tasks");
    else switchScreen("home");
  });

  // =========================
  // PROFILE
  // =========================
  function loadProfile() {
    return sJSONGet(STORAGE_PROFILE, { age: "", nick: "", bio: "" });
  }

  function saveProfile(p) {
    sJSONSet(STORAGE_PROFILE, p);
  }

  function openProfile() {
    if (!profileModal || !profileOverlay) return;
    profileModal.classList.add("open");
    profileOverlay.classList.add("open");
    profileModal.setAttribute("aria-hidden", "false");
  }

  function closeProfile() {
    if (!profileModal || !profileOverlay) return;
    profileModal.classList.remove("open");
    profileOverlay.classList.remove("open");
    profileModal.setAttribute("aria-hidden", "true");
  }

  // =========================
  // THEME
  // =========================
  function syncThemeIcon() {
    const isDark = document.body.classList.contains("dark");
    if (themeMiniBtn) themeMiniBtn.textContent = isDark ? "☀️" : "🌙";
  }

  on(themeMiniBtn, "click", () => {
    document.body.classList.toggle("dark");
    syncThemeIcon();
  });

  // =========================
  // DRAWER OPEN/CLOSE
  // =========================
  function openDrawer() {
    drawer?.classList.add("open");
    drawerOverlay?.classList.add("open");
    drawer?.setAttribute("aria-hidden", "false");
    renderChatsInHistory();
  }

  function closeDrawer() {
    drawer?.classList.remove("open");
    drawerOverlay?.classList.remove("open");
    drawer?.setAttribute("aria-hidden", "true");
  }

  on(settingsBtn, "click", openDrawer);
  on(drawerOverlay, "click", closeDrawer);

  // =========================
  // TASKS
  // =========================
  function saveTasks() {
    sJSONSet(STORAGE_TASKS, tasks);
  }

  function renderTasks() {
    if (!tasksListEl) return;
    tasksListEl.innerHTML = "";

    if (!Array.isArray(tasks) || tasks.length === 0) {
      const li = document.createElement("li");
      li.className = "taskItem";
      li.innerHTML = `<div class="taskText">Пока задач нет 🙂</div>`;
      tasksListEl.appendChild(li);
      return;
    }

    tasks.forEach((t) => {
      const li = document.createElement("li");
      li.className = "taskItem" + (t.done ? " done" : "");

      li.innerHTML = `
        <input type="checkbox" ${t.done ? "checked" : ""} />
        <div class="taskText">${escapeHTML(t.text)}</div>
      `;

      const cb = li.querySelector("input[type='checkbox']");
      cb.addEventListener("change", () => {
        t.done = !!cb.checked;
        saveTasks();
        renderTasks();
      });

      tasksListEl.appendChild(li);
    });
  }

  function setTasksFromCards(cards) {
    const flat = (cards || []).flatMap((card) => (Array.isArray(card?.tasks) ? card.tasks : []));
    const next = [];

    flat.forEach((t) => {
      const txt = String(t?.t || "").trim();
      if (!txt) return;
      next.push({ id: uuid(), text: txt, done: false });
    });

    tasks = next;
    saveTasks();
    renderTasks();
  }

  on(clearTasksBtn, "click", () => {
    tasks = [];
    saveTasks();
    renderTasks();
  });

  // =========================
  // CHATS STORAGE (MULTI-CHAT)
  // =========================
  function ensureChat(id) {
    if (!id) return;
    if (!chatCache[id]) {
      chatCache[id] = {
        meta: { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() },
        messages: [],
      };
      return;
    }

    // migrate
    if (!chatCache[id].meta) {
      chatCache[id].meta = { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() };
    }
    if (!Array.isArray(chatCache[id].messages) && Array.isArray(chatCache[id].messages?.messages)) {
      chatCache[id].messages = chatCache[id].messages.messages;
    }
    if (!Array.isArray(chatCache[id].messages)) chatCache[id].messages = [];
    if (!chatCache[id].meta.updatedAt) chatCache[id].meta.updatedAt = Date.now();
    if (!chatCache[id].meta.emoji) chatCache[id].meta.emoji = pickEmoji();
    if (!chatCache[id].meta.title) chatCache[id].meta.title = "Новый чат";
  }

  function saveChats() {
    sSet(STORAGE_ACTIVE_CHAT, activeChatId);
    sJSONSet(STORAGE_CHATS_INDEX, chatsIndex);
    sJSONSet(STORAGE_CHAT_CACHE, chatCache);
  }

  function bumpChatToTop(id) {
    chatsIndex = [id, ...chatsIndex.filter((x) => x !== id)];
  }

  function getActiveChat() {
    ensureChat(activeChatId);
    return chatCache[activeChatId];
  }

  function messages() {
    if (!activeChatId) return [];
    return getActiveChat().messages || [];
  }

  function makeChatTitleFromText(text) {
    const t = String(text || "").trim();
    if (!t) return "Новый чат";
    return t.length > 22 ? t.slice(0, 22) + "…" : t;
  }

  function cleanupEmptyChats() {
    const userIsInChatNow = (currentScreen === "chat");

    const toDelete = chatsIndex.filter((id) => {
      ensureChat(id);
      const c = chatCache[id];
      const empty = !c.messages || c.messages.length === 0;
      const isActive = id === activeChatId;
      return empty && (!isActive || !userIsInChatNow);
    });

    if (!toDelete.length) return;

    toDelete.forEach((id) => delete chatCache[id]);
    chatsIndex = chatsIndex.filter((id) => !toDelete.includes(id));

    if (toDelete.includes(activeChatId)) {
      activeChatId = chatsIndex[0] || "";
    }

    if (!activeChatId) {
      const id = uuid();
      chatCache[id] = {
        meta: { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() },
        messages: [],
      };
      chatsIndex = [id];
      activeChatId = id;
    }

    saveChats();
    renderChatsInHistory();
  }

  function setActiveChat(id) {
    cleanupEmptyChats();

    activeChatId = id;
    ensureChat(activeChatId);
    if (!chatsIndex.includes(activeChatId)) chatsIndex.unshift(activeChatId);
    bumpChatToTop(activeChatId);
    saveChats();

    renderMessages();
    renderChatsInHistory();
  }

  function createNewChat() {
    cleanupEmptyChats();

    const id = uuid();
    chatCache[id] = {
      meta: { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() },
      messages: [],
    };
    chatsIndex = [id, ...chatsIndex.filter((x) => x !== id)];
    setActiveChat(id);
  }

  function resetAllChats() {
    chatCache = {};
    chatsIndex = [];
    activeChatId = "";
    saveChats();
    createNewChat();
  }

  function pushMsg(who, text) {
    if (!activeChatId) createNewChat();

    const c = getActiveChat();
    const msg = { who, text: String(text ?? ""), ts: Date.now() };
    c.messages.push(msg);

    c.meta.updatedAt = Date.now();
    if (c.meta.title === "Новый чат" && who === "user") {
      c.meta.title = makeChatTitleFromText(text);
    }

    bumpChatToTop(activeChatId);
    saveChats();

    renderMessages();
    renderChatsInHistory();
  }

  // =========================
  // RENDER MESSAGES (ACTIVE CHAT)
  // =========================
  function renderMessages() {
    if (!chatMessagesEl) return;
    chatMessagesEl.innerHTML = "";

    const arr = messages();
    arr.forEach((m) => {
      const div = document.createElement("div");
      div.className = "msg " + (m.who === "user" ? "user" : "ai");
      div.textContent = m.text;
      chatMessagesEl.appendChild(div);
    });

    scrollToBottom();
    updatePlanVisibility();
  }

  function updatePlanVisibility() {
    if (!planBtn) return;
    const enough = messages().length >= 2;
    planBtn.hidden = !(currentScreen === "chat" && enough);
  }

  // =========================
  // RENDER CHATS (DRAWER HISTORY)
  // =========================
  function renderChatsInHistory() {
    if (!historyList) return;

    historyList.innerHTML = "";

    // New chat row
    const newRow = document.createElement("div");
    newRow.className = "tgChatRow";
    newRow.innerHTML = `
      <div class="tgEmojiAvatar">➕</div>
      <div class="tgChatMid">
        <div class="tgChatTitle">Новый чат</div>
        <div class="tgChatLast">Создать новый диалог</div>
      </div>
      <div class="tgChatRight">
        <div class="tgChatTime"></div>
      </div>
    `;
    newRow.addEventListener("click", () => {
      createNewChat();
      closeDrawer();
      switchScreen("chat");
    });
    historyList.appendChild(newRow);

    if (!chatsIndex.length) {
      const empty = document.createElement("div");
      empty.className = "histMsg ai";
      empty.textContent = "История чатов пустая 🙂";
      historyList.appendChild(empty);
      return;
    }

    chatsIndex.forEach((id) => {
      ensureChat(id);
      const c = chatCache[id];
      const last = c.messages[c.messages.length - 1];

      const row = document.createElement("div");
      row.className = "tgChatRow";

      if (id === activeChatId) {
        row.style.background = "rgba(0,0,0,0.03)";
      }

      row.innerHTML = `
        <div class="tgEmojiAvatar">${c.meta.emoji || "💬"}</div>
        <div class="tgChatMid">
          <div class="tgChatTitle">${escapeHTML(c.meta.title || "Новый чат")}</div>
          <div class="tgChatLast">${escapeHTML(last ? last.text : "Пусто…")}</div>
        </div>
        <div class="tgChatRight">
          <div class="tgChatTime">${fmtTime(c.meta.updatedAt || Date.now())}</div>
        </div>
      `;

      row.addEventListener("click", () => {
        setActiveChat(id);
        closeDrawer();
        switchScreen("chat");
      });

      historyList.appendChild(row);
    });
  }

  // =========================
  // PLAN -> TASKS (NO MODAL)
  // =========================
  async function createPlan() {
    if (isLoading) return;

    const tg_id = getTgIdOrNull();
    if (!tg_id) {
      dbg("❌ Открой внутри Telegram (нет tg_id)");
      return;
    }

    if (messages().length < 2) {
      dbg("🙂 Мало переписки для плана");
      return;
    }

    isLoading = true;
    if (planBtn) planBtn.disabled = true;

    try {
      dbg("Создаю план…");

      const profile = loadProfile();
      const { ok, status, data } = await postJSON(`${API_BASE}/api/plan/create`, {
        tg_id,
        chat_id: activeChatId,
        profile,
      });

      if (!ok) {
        dbg("❌ Ошибка плана: " + (data?.error || `status_${status}`));
        return;
      }

      const cards = Array.isArray(data?.cards) ? data.cards : [];
      if (!cards.length) {
        dbg("🙂 План пустой (AI вернул 0 карточек)");
        return;
      }

      setTasksFromCards(cards);
      dbg("✅ План добавлен в задачи");
      switchScreen("tasks");
    } catch (e) {
      console.log("PLAN ERROR:", e);
      dbg("❌ Не удалось подключиться к серверу");
    } finally {
      isLoading = false;
      if (planBtn) planBtn.disabled = false;
    }
  }

  // =========================
  // SEND MESSAGE (ACTIVE CHAT)
  // =========================
  async function sendMessage() {
    if (isLoading) return;

    const text = (promptEl?.value || "").trim();
    if (!text) return;

    switchScreen("chat");
    pushMsg("user", text);
    if (promptEl) promptEl.value = "";

    const tg_id = getTgIdOrNull();
    if (!tg_id) {
      pushMsg("ai", "Открой мини-апп внутри Telegram, иначе tg_id не приходит.");
      return;
    }

    isLoading = true;
    if (sendBtn) sendBtn.disabled = true;
    if (chatTypingEl) chatTypingEl.hidden = false;
    dbg("🧠 AI печатает… (жду ответ)");


    try {
      const profile = loadProfile();

      const { ok, status, data } = await postJSON(`${API_BASE}/api/chat/send`, {
        tg_id,
        chat_id: activeChatId,
        text,
        profile,
      });

      if (!ok) {
        pushMsg("ai", "Ошибка сервера: " + (data?.error || `status_${status}`));
        return;
      }

      pushMsg("ai", String(data?.text || "").trim() || "AI вернул пустой ответ 😶");
    } catch (e) {
      console.log("SEND ERROR:", e);
      pushMsg("ai", "Не удалось подключиться к серверу.");
    } finally {
      isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
      if (chatTypingEl) chatTypingEl.hidden = true;
    }
  }

  // =========================
  // INIT USER IN DB (on app open)
  // =========================
  async function initUserInDB() {
    const tg_id = getTgIdOrNull();
    dbg("initUserInDB: tg_id=" + tg_id);

    if (!tg_id) {
      dbg("❌ Нет tg_id. Открыто НЕ внутри Telegram или нет user в initDataUnsafe.");
      return;
    }

    try {
      const profile = loadProfile();
      dbg("➡️ /api/user/init ...");

      const { ok, status, data } = await postJSON(`${API_BASE}/api/user/init`, {
        tg_id,
        profile,
      });

      dbg(`⬅️ init ok=${ok} status=${status}`);
      if (!ok) dbg("init error: " + (data?.error || "unknown"));
    } catch (e) {
      dbg("❌ Ошибка initUserInDB: " + String(e?.message || e));
    }
  }

  // =========================
  // DRAWER USER INFO INIT
  // =========================
  function initDrawerUser() {
    const tg = window.Telegram?.WebApp;
    const u = tg?.initDataUnsafe?.user;

    if (drawerName) drawerName.textContent = u?.first_name ? u.first_name : "User";
    if (drawerPhone) drawerPhone.textContent = u?.id ? `ID: ${u.id}` : "ID: —";
    if (drawerAvatar && u?.photo_url) drawerAvatar.src = u.photo_url;

    if (profileName) profileName.value = u?.first_name ? u.first_name : "User";

    const p = loadProfile();
    if (profileAge) profileAge.value = p.age ?? "";
    if (profileNick) profileNick.value = p.nick ?? "";
    if (profileBio) profileBio.value = p.bio ?? "";

    syncThemeIcon();
  }

  // =========================
  // MENU + PROFILE SAVE
  // =========================
  on(menuProfile, "click", () => {
    closeDrawer();
    openProfile();
  });

  on(menuSettings, "click", () => {
    // пока пусто
  });

  on(clearHistoryBtn, "click", () => {
    resetAllChats();
    renderChatsInHistory();
  });

  function saveProfileAndClose() {
    const p = {
      age: profileAge?.value ?? "",
      nick: profileNick?.value ?? "",
      bio: profileBio?.value ?? "",
    };
    saveProfile(p);
    closeProfile();
    initUserInDB();
  }

  on(closeProfileBtn, "click", saveProfileAndClose);
  on(profileOverlay, "click", saveProfileAndClose);

  // =========================
  // BINDINGS
  // =========================
  on(sendBtn, "click", sendMessage);

  on(promptEl, "keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  on(planBtn, "click", createPlan);

  // =========================
  // TELEGRAM INIT
  // =========================
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();

    const u = tg.initDataUnsafe?.user;
    if (userEl) userEl.textContent = "Привет, " + (u?.first_name || "друг");

    initUserInDB();
  } else {
    if (userEl) userEl.textContent = "Открой внутри Telegram WebApp 🙂";
  }

  // =========================
  // BOOT: ensure at least 1 chat exists
  // =========================
  if (!activeChatId) {
    if (Array.isArray(chatsIndex) && chatsIndex.length) {
      activeChatId = chatsIndex[0];
    } else {
      activeChatId = uuid();
      chatsIndex = [activeChatId];
    }
  }
  ensureChat(activeChatId);

  if (!Array.isArray(chatsIndex)) chatsIndex = [activeChatId];
  if (!chatsIndex.includes(activeChatId)) chatsIndex.unshift(activeChatId);

  saveChats();

  // init UI
  initDrawerUser();
  renderTasks();
  renderMessages();
  renderChatsInHistory();

  // чистим пустые, но НЕ трогаем активный если юзер не в чате (мы сейчас на home)
  cleanupEmptyChats();

  switchScreen("home");

  console.log("[LSD] loaded. activeChatId =", activeChatId);
});
