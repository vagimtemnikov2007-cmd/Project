// LSD Front — OLD UI + Chats list in tgHistoryScroll (historyList)
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

  async function postJSON(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { error: "bad_json_from_server", raw };
    }

    return { ok: res.ok, status: res.status, data };
  }

  // =========================
  // ELEMENTS (your old UI)
  // =========================
  const settingsBtn = document.querySelector(".settings_bt");
  const drawer = $("settingsDrawer");
  const drawerOverlay = $("drawerOverlay");

  const screenHome = $("screen-home");
  const screenTasks = $("screen-tasks");
  const screenChat = $("screen-chat");

  const navBtn = $("navBtn");
  const navBtnText = navBtn?.querySelector("span");

  const promptEl = $("prompt");
  const sendBtn = $("sendBtn");

  const chatMessagesEl = $("chatMessages");
  const chatTypingEl = $("chatTyping");

  const planBtn = $("planBtn");
  const planOverlay = $("planOverlay");
  const planModal = $("planModal");
  const planContent = $("planContent");
  const closePlanBtn = $("closePlan");

  const userEl = $("user");

  // drawer top user
  const drawerName = $("drawerName");
  const drawerPhone = $("drawerPhone");
  const drawerAvatar = $("drawerAvatar");

  // theme mini btn
  const themeMiniBtn = $("themeMiniBtn");

  // drawer menu
  const menuProfile = $("menuProfile");
  const menuHistory = $("menuHistory");
  const menuSettings = $("menuSettings");

  // history list container (we will render CHATS here)
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
  // UI: SCREEN SWITCH
  // =========================
  let currentScreen = "home";

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
    renderChatsInHistory(); // render chats list every time drawer opens

  }

  function closeDrawer() {
    drawer?.classList.remove("open");
    drawerOverlay?.classList.remove("open");
    drawer?.setAttribute("aria-hidden", "true");
  }

  on(settingsBtn, "click", openDrawer);
  on(drawerOverlay, "click", closeDrawer);

  // =========================
  // CHAT STORAGE (MULTI-CHAT)
  // =========================
  let activeChatId = sGet(STORAGE_ACTIVE_CHAT, "");
  let chatsIndex = sJSONGet(STORAGE_CHATS_INDEX, []);
  let chatCache = sJSONGet(STORAGE_CHAT_CACHE, {});

  function ensureChat(id) {
    if (!chatCache[id]) {
      chatCache[id] = {
        meta: { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() },
        messages: [],
      };
    } else {
      // migrate old shape
      if (!chatCache[id].meta) {
        chatCache[id].meta = { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() };
      }
      if (!Array.isArray(chatCache[id].messages) && Array.isArray(chatCache[id].messages?.messages)) {
        // just in case some weird nesting
        chatCache[id].messages = chatCache[id].messages.messages;
      }
      if (!Array.isArray(chatCache[id].messages)) chatCache[id].messages = [];
      if (!chatCache[id].meta.updatedAt) chatCache[id].meta.updatedAt = Date.now();
      if (!chatCache[id].meta.emoji) chatCache[id].meta.emoji = pickEmoji();
      if (!chatCache[id].meta.title) chatCache[id].meta.title = "Новый чат";
    }
  }

  function saveChats() {
    sSet(STORAGE_ACTIVE_CHAT, activeChatId);
    sJSONSet(STORAGE_CHATS_INDEX, chatsIndex);
    sJSONSet(STORAGE_CHAT_CACHE, chatCache);
  }
  
  function cleanupEmptyChats() {
  // "сидит ли юзер в чате прямо сейчас"
  const userIsInChatNow = (currentScreen === "chat");

  // удаляем пустые чаты:
  // - если чат НЕ активный
  // - ИЛИ он активный, но юзер не на экране chat
  const toDelete = chatsIndex.filter((id) => {
    ensureChat(id);
    const c = chatCache[id];
    const empty = !c.messages || c.messages.length === 0;
    const isActive = id === activeChatId;

    return empty && (!isActive || !userIsInChatNow);
  });

  if (!toDelete.length) return;

  // удаляем из кеша и индекса
  toDelete.forEach((id) => {
    delete chatCache[id];
  });
  chatsIndex = chatsIndex.filter((id) => !toDelete.includes(id));

  // если удалили активный чат — выбираем новый
  if (toDelete.includes(activeChatId)) {
    activeChatId = chatsIndex[0] || "";
  }

  // если чатов совсем не осталось — создаём новый
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
  // если был пустой чат и мы уходим из него — удалим
  cleanupEmptyChats();

  activeChatId = id;
  ensureChat(activeChatId);
  if (!chatsIndex.includes(activeChatId)) chatsIndex.unshift(activeChatId);
  bumpChatToTop(activeChatId);
  saveChats();

  renderMessages();
  renderChatsInHistory();
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

  function createNewChat() {
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
    // create a fresh one
    createNewChat();
  }

  function makeChatTitleFromText(text) {
    const t = String(text || "").trim();
    if (!t) return "Новый чат";
    return t.length > 22 ? t.slice(0, 22) + "…" : t;
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
  // RENDER CHATS INSIDE tgHistoryScroll (#historyList)
  // =========================
  function renderChatsInHistory() {
    if (!historyList) return;

    historyList.innerHTML = "";

    // 1) "New chat" row (inside history, not on home)
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

    // divider line effect using border in rows already
    if (!chatsIndex.length) {
      // no chats yet
      const empty = document.createElement("div");
      empty.className = "histMsg ai";
      empty.textContent = "История чатов пустая 🙂";
      historyList.appendChild(empty);
      return;
    }

    // 2) actual chat rows
    chatsIndex.forEach((id) => {
      ensureChat(id);
      const c = chatCache[id];
      const last = c.messages[c.messages.length - 1];

      const row = document.createElement("div");
      row.className = "tgChatRow";
      if (id === activeChatId) row.style.background = "rgba(0,0,0,0.03)";

      const unread = ""; // можно позже сделать счётчик непрочитанных

      row.innerHTML = `
        <div class="tgEmojiAvatar">${c.meta.emoji || "💬"}</div>
        <div class="tgChatMid">
          <div class="tgChatTitle">${escapeHTML(c.meta.title || "Новый чат")}</div>
          <div class="tgChatLast">${escapeHTML(last ? last.text : "Пусто…")}</div>
        </div>
        <div class="tgChatRight">
          <div class="tgChatTime">${fmtTime(c.meta.updatedAt || Date.now())}</div>
          ${unread}
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

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
    }[ch]));
  }

  // =========================
  // PLAN MODAL
  // =========================
  function openPlanModal(contentNodeOrHTML) {
    if (!planOverlay || !planModal || !planContent) return;

    if (typeof contentNodeOrHTML === "string") {
      planContent.innerHTML = contentNodeOrHTML;
    } else {
      planContent.innerHTML = "";
      planContent.appendChild(contentNodeOrHTML);
    }

    planOverlay.classList.add("open");
    planModal.classList.add("open");
  }

  function closePlanModal() {
    planOverlay?.classList.remove("open");
    planModal?.classList.remove("open");
  }

  on(closePlanBtn, "click", closePlanModal);
  on(planOverlay, "click", closePlanModal);

  function renderPlanCards(cards) {
    const wrap = document.createElement("div");
    wrap.className = "cardsArea";

    (cards || []).forEach((card, idx) => {
      const box = document.createElement("div");
      box.className = "cardBox";

      const title = document.createElement("h3");
      title.className = "cardTitle";
      title.textContent = card?.title ? String(card.title) : `План #${idx + 1}`;

      const ul = document.createElement("ul");
      ul.className = "cardTasks";

      const tasks = Array.isArray(card?.tasks) ? card.tasks : [];
      tasks.forEach((t) => {
        const txt = String(t?.t || "").trim();
        if (!txt) return;

        const li = document.createElement("li");
        li.className = "cardTask";

        const left = document.createElement("div");
        left.textContent = txt;

        const right = document.createElement("div");
        right.className = "taskMeta";

        const meta = [];
        if (Number.isFinite(Number(t?.min))) meta.push(`${Number(t.min)}м`);
        if (t?.energy) meta.push(String(t.energy));
        right.textContent = meta.join(" • ");

        li.appendChild(left);
        li.appendChild(right);
        ul.appendChild(li);
      });

      box.appendChild(title);
      box.appendChild(ul);
      wrap.appendChild(box);
    });

    return wrap;
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
      dbg("➡️ Отправляю /api/user/init ...");

      const { ok, status, data } = await postJSON(`${API_BASE}/api/user/init`, {
        tg_id,
        profile,
      });

      dbg(`⬅️ Ответ: ok=${ok} status=${status}`);
      if (!ok) dbg("init error: " + (data?.error || "unknown"));
    } catch (e) {
      dbg("❌ Ошибка initUserInDB: " + String(e?.message || e));
    }
  }

  // =========================
  // SEND MESSAGE (ACTIVE CHAT)
  // =========================
  let isLoading = false;

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
  // CREATE PLAN
  // =========================
  async function createPlan() {
    if (isLoading) return;

    const tg_id = getTgIdOrNull();
    if (!tg_id) {
      openPlanModal("<div class='historyItem'>Открой внутри Telegram (нет tg_id)</div>");
      return;
    }

    if (messages().length < 2) {
      openPlanModal("<div class='historyItem'>Мало переписки для плана 🙂</div>");
      return;
    }

    isLoading = true;
    if (planBtn) planBtn.disabled = true;

    try {
      openPlanModal("<div class='historyItem'>Создаю план…</div>");

      const profile = loadProfile();
      const { ok, status, data } = await postJSON(`${API_BASE}/api/plan/create`, {
        tg_id,
        chat_id: activeChatId,
        profile,
      });

      if (!ok) {
        openPlanModal("<div class='historyItem'>Ошибка: " + (data?.error || `status_${status}`) + "</div>");
        return;
      }

      const cards = Array.isArray(data?.cards) ? data.cards : [];
      if (!cards.length) {
        openPlanModal("<div class='historyItem'>План пустой. Напиши больше деталей 🙂</div>");
        return;
      }

      openPlanModal(renderPlanCards(cards));
    } catch (e) {
      console.log("PLAN ERROR:", e);
      openPlanModal("<div class='historyItem'>Не удалось подключиться к серверу.</div>");
    } finally {
      isLoading = false;
      if (planBtn) planBtn.disabled = false;
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

    // profile modal name field (readonly)
    if (profileName) profileName.value = u?.first_name ? u.first_name : "User";

    // fill saved profile fields
    const p = loadProfile();
    if (profileAge) profileAge.value = p.age ?? "";
    if (profileNick) profileNick.value = p.nick ?? "";
    if (profileBio) profileBio.value = p.bio ?? "";

    syncThemeIcon();
  }

  // =========================
  // MENU BUTTONS
  // =========================
  on(menuProfile, "click", () => {
    closeDrawer();
    openProfile();
  });

  on(menuHistory, "click", () => {
    // просто скролл к списку чатов
    historyList?.scrollTo({ top: 0, behavior: "smooth" });
  });

  on(menuSettings, "click", () => {
    // пока пусто — можешь потом добавить
  });

  // clear chats history
  on(clearHistoryBtn, "click", () => {
    resetAllChats();
    renderChatsInHistory();
  });

  // save profile on close (чтобы не добавлять кнопки)
  on(closeProfileBtn, "click", () => {
    const p = {
      age: profileAge?.value ?? "",
      nick: profileNick?.value ?? "",
      bio: profileBio?.value ?? "",
    };
    saveProfile(p);
    closeProfile();
    initUserInDB();
  });

  on(profileOverlay, "click", () => {
    const p = {
      age: profileAge?.value ?? "",
      nick: profileNick?.value ?? "",
      bio: profileBio?.value ?? "",
    };
    saveProfile(p);
    closeProfile();
    initUserInDB();
  });

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
    // if we have chatsIndex, take first
    if (Array.isArray(chatsIndex) && chatsIndex.length) {
      activeChatId = chatsIndex[0];
    } else {
      activeChatId = uuid();
      chatsIndex = [activeChatId];
    }
  }
  ensureChat(activeChatId);
  saveChats();

  // init UI
  initDrawerUser();
  switchScreen("home");
  renderMessages();
  renderChatsInHistory();
  cleanupEmptyChats();

  console.log("[LSD] loaded. activeChatId =", activeChatId);
});
