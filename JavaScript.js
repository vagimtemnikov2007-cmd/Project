// LSD | Clean Frontend (Chat + History + Plan + Screens) with Self-Diagnostics

window.addEventListener("DOMContentLoaded", () => {
  // =========================
  // DIAG
  // =========================
  console.log("✅ LSD JS loaded");

  window.onerror = (msg, src, line, col, err) => {
    console.error("❌ JS ERROR:", msg, src, line, col, err);
  };
  window.onunhandledrejection = (e) => {
    console.error("❌ PROMISE ERROR:", e?.reason || e);
  };

  // =========================
  // HELPERS
  // =========================
  const $ = (id) => document.getElementById(id);
  const safeOn = (el, ev, fn) => el && el.addEventListener(ev, fn);

  function uuid() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  async function postJSON(url, payload, timeoutMs = 20000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      const raw = await res.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = { error: "bad_json_from_server", raw };
      }

      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(t);
    }
  }

  // =========================
  // CONFIG
  // =========================
  const API_BASE = "https://lsd-server-ml3z.onrender.com";

  // =========================
  // ELEMENTS
  // =========================
  const navBtn = $("navBtn");
  const navBtnText = navBtn?.querySelector("span");

  const screenHome = $("screen-home");
  const screenTasks = $("screen-tasks");
  const screenChat = $("screen-chat");

  const promptEl = $("prompt");
  const sendBtn = $("sendBtn");

  const planBtn = $("planBtn");
  const planOverlay = $("planOverlay");
  const planModal = $("planModal");
  const planContent = $("planContent");
  const closePlanBtn = $("closePlan");

  const historyListEl = $("historyList");
  const clearHistoryBtn = $("clearHistory");

  const chatMessages = $("chatMessages");
  const chatTyping = $("chatTyping");

  const avatarEl = $("avatar");
  const userEl = $("user");

  // PROFILE (optional)
  const openProfileBtn = $("openProfile");
  const profileModal = $("profileModal");
  const profileOverlay = $("profileOverlay");
  const closeProfileBtn = $("closeProfile");

  const profileAvatarEl = $("profileAvatar");
  const profileNameEl = $("profileName");
  const profileAgeEl = $("profileAge");
  const profileNickEl = $("profileNick");
  const profileBioEl = $("profileBio");

  // SETTINGS drawer (optional)
  const settingsBtn = document.querySelector(".settings_bt");
  const drawer = $("settingsDrawer");
  const drawerOverlay = $("drawerOverlay");
  const drawerClose = $("drawerClose");
  const lightBtn = $("lightBtn");
  const darkBtn = $("darkBtn");

  // TASKS (optional, если хочешь принимать из плана)
  const tasksListEl = $("tasksList");
  const clearTasksBtn = $("clearTasks");

  // =========================
  // CRITICAL CHECK (elements)
  // =========================
  const required = [
    ["prompt", promptEl],
    ["sendBtn", sendBtn],
    ["chatMessages", chatMessages],
    ["screen-home", screenHome],
    ["screen-tasks", screenTasks],
    ["screen-chat", screenChat],
  ];
  const missing = required.filter(([, el]) => !el).map(([id]) => id);
  if (missing.length) {
    console.error("❌ Missing required elements:", missing);
  } else {
    console.log("✅ Required elements OK");
  }

  // =========================
  // STORAGE
  // =========================
  const STORAGE = {
    THEME: "lsd_theme_v3",
    PROFILE: "lsd_profile_v3",
    CHATS: "lsd_chats_v3",
    ACTIVE_CHAT: "lsd_active_chat_v3",
    DEV_TG: "lsd_dev_tg_id",
    TASKS: "lsd_tasks_v3",
  };

  function storageSelfTest() {
    try {
      localStorage.setItem("__lsd_test__", "1");
      const ok = localStorage.getItem("__lsd_test__") === "1";
      localStorage.removeItem("__lsd_test__");
      console.log(ok ? "✅ localStorage OK" : "❌ localStorage read/write failed");
      return ok;
    } catch (e) {
      console.error("❌ localStorage blocked:", e);
      return false;
    }
  }
  storageSelfTest();

  // =========================
  // TG ID (Telegram + DEV)
  // =========================
  function getTgIdOrNull() {
    const tg = window.Telegram?.WebApp;
    const id = tg?.initDataUnsafe?.user?.id;
    const n = Number(id);
    if (Number.isFinite(n)) return n;

    // DEV mode for browser testing
    const dev = Number(localStorage.getItem(STORAGE.DEV_TG));
    return Number.isFinite(dev) ? dev : null;
  }

  // =========================
  // HEALTH CHECK
  // =========================
  (async () => {
    try {
      const r = await fetch(`${API_BASE}/health`);
      const j = await r.json().catch(() => ({}));
      console.log("✅ /health", r.status, j);
    } catch (e) {
      console.error("❌ /health failed:", e);
    }

    const tg = getTgIdOrNull();
    if (!tg) {
      console.warn("⚠️ tg_id отсутствует. Для теста в браузере выполни в консоли:");
      console.warn(`localStorage.setItem("${STORAGE.DEV_TG}", "6521438948"); location.reload();`);
    } else {
      console.log("✅ tg_id =", tg);
    }
  })();

  // =========================
  // UI: Screens
  // =========================
  let currentScreen = "home";

  function setNavLabel() {
    if (!navBtnText) return;
    if (currentScreen === "home") navBtnText.textContent = "задачи";
    else navBtnText.textContent = "назад";
    navBtn?.classList.toggle("active", currentScreen !== "home");
  }

  function switchScreen(next) {
    if (!screenHome || !screenTasks || !screenChat) return;
    currentScreen = next;

    screenHome.classList.toggle("active", next === "home");
    screenTasks.classList.toggle("active", next === "tasks");
    screenChat.classList.toggle("active", next === "chat");

    document.body.classList.toggle("chat-mode", next === "chat");
    setNavLabel();
    updatePlanButtonVisibility();
    scrollChatToBottom();
  }

  safeOn(navBtn, "click", () => {
    if (currentScreen === "home") switchScreen("tasks");
    else switchScreen("home");
  });

  // initial
  switchScreen("home");

  function scrollChatToBottom() {
    if (!chatMessages) return;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // =========================
  // THEME (optional)
  // =========================
  function getTelegramTheme() {
    const tg = window.Telegram?.WebApp;
    return tg?.colorScheme === "dark" ? "dark" : "light";
  }

  function setTheme(mode) {
    document.body.classList.toggle("dark", mode === "dark");
    localStorage.setItem(STORAGE.THEME, mode);
    lightBtn?.classList.toggle("active", mode === "light");
    darkBtn?.classList.toggle("active", mode === "dark");
  }

  setTheme(localStorage.getItem(STORAGE.THEME) || getTelegramTheme());
  safeOn(lightBtn, "click", () => setTheme("light"));
  safeOn(darkBtn, "click", () => setTheme("dark"));

  function openDrawer() {
    drawer?.classList.add("open");
    drawerOverlay?.classList.add("open");
  }
  function closeDrawer() {
    drawer?.classList.remove("open");
    drawerOverlay?.classList.remove("open");
  }
  safeOn(settingsBtn, "click", openDrawer);
  safeOn(drawerClose, "click", closeDrawer);
  safeOn(drawerOverlay, "click", closeDrawer);

  // =========================
  // PROFILE (optional)
  // =========================
  function loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.PROFILE) || "{}");
    } catch {
      return {};
    }
  }
  function saveProfile(p) {
    localStorage.setItem(STORAGE.PROFILE, JSON.stringify(p));
  }

  function fillProfileUI() {
    const tg = window.Telegram?.WebApp;
    const u = tg?.initDataUnsafe?.user;

    const nameFromTG = u ? [u.first_name, u.last_name].filter(Boolean).join(" ") : "Не в Telegram";
    const photo = u?.photo_url;

    if (profileNameEl) profileNameEl.value = nameFromTG;
    if (profileAvatarEl) profileAvatarEl.src = photo || avatarEl?.src || "img/Avatar.svg";

    const saved = loadProfile();
    if (profileAgeEl) profileAgeEl.value = saved.age ?? "";
    if (profileNickEl) profileNickEl.value = saved.nick ?? "";
    if (profileBioEl) profileBioEl.value = saved.bio ?? "";
  }

  function persistProfileFromUI() {
    const ageRaw = (profileAgeEl?.value || "").trim();
    const n = Number(ageRaw);
    const age = ageRaw === "" ? null : (Number.isFinite(n) ? Math.max(0, Math.min(120, n)) : null);

    saveProfile({
      age,
      nick: (profileNickEl?.value || "").trim(),
      bio: (profileBioEl?.value || "").trim(),
      updatedAt: Date.now(),
    });
  }

  safeOn(profileAgeEl, "input", persistProfileFromUI);
  safeOn(profileNickEl, "input", persistProfileFromUI);
  safeOn(profileBioEl, "input", persistProfileFromUI);

  function openProfile() {
    fillProfileUI();
    profileModal?.classList.add("open");
    profileOverlay?.classList.add("open");
  }
  function closeProfile() {
    profileModal?.classList.remove("open");
    profileOverlay?.classList.remove("open");
  }

  safeOn(openProfileBtn, "click", openProfile);
  safeOn(closeProfileBtn, "click", closeProfile);
  safeOn(profileOverlay, "click", closeProfile);

  // greet on home
  {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      const u = tg.initDataUnsafe?.user;
      const firstName = u?.first_name ?? "друг";
      if (userEl) userEl.innerText = "Привет, " + firstName;
      if (u?.photo_url && avatarEl) avatarEl.src = u.photo_url;
    } else {
      if (userEl) userEl.innerText = "Открой это внутри Telegram WebApp 🙂";
    }
  }

  // =========================
  // CHATS
  // =========================
  let chats = loadChats();
  let activeChatId = loadActiveChat();
  let isLoading = false;

  function loadChats() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.CHATS) || "[]");
    } catch {
      return [];
    }
  }
  function saveChats() {
    localStorage.setItem(STORAGE.CHATS, JSON.stringify(chats));
  }
  function loadActiveChat() {
    return localStorage.getItem(STORAGE.ACTIVE_CHAT) || "";
  }
  function setActiveChat(id) {
    activeChatId = id;
    localStorage.setItem(STORAGE.ACTIVE_CHAT, id);
  }
  function getChatById(id) {
    return chats.find((c) => c.id === id);
  }
  function makeTitle(text) {
    const t = String(text || "").trim();
    if (!t) return "Чат";
    return t.length > 32 ? t.slice(0, 32) + "…" : t;
  }

  function ensureActiveChat(firstText) {
    if (activeChatId && getChatById(activeChatId)) return activeChatId;

    const id = uuid();
    const now = Date.now();

    const chat = {
      id,
      title: makeTitle(firstText),
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    chats.unshift(chat);
    saveChats();
    setActiveChat(id);
    renderChatsList();
    renderChatMessages();
    updatePlanButtonVisibility();
    return id;
  }

  function pushMsgToChat(chatId, who, text) {
    const chat = getChatById(chatId);
    if (!chat) return;

    chat.messages.push({ who, text: String(text ?? ""), ts: Date.now() });
    chat.updatedAt = Date.now();

    if ((!chat.title || chat.title === "Чат") && who === "user") {
      chat.title = makeTitle(text);
    }

    saveChats();
    renderChatsList();

    if (chatId === activeChatId) {
      renderChatMessages();
      updatePlanButtonVisibility();
    }
  }

  function renderChatMessages() {
    if (!chatMessages) return;
    const chat = getChatById(activeChatId);
    const msgs = chat?.messages || [];

    chatMessages.innerHTML = "";
    for (const m of msgs) {
      const div = document.createElement("div");
      div.className = `msg ${m.who === "user" ? "user" : "ai"}`;
      div.textContent = m.text;
      chatMessages.appendChild(div);
    }
    scrollChatToBottom();
  }

  function renderChatsList() {
    if (!historyListEl) return;
    historyListEl.innerHTML = "";

    if (!chats.length) {
      historyListEl.innerHTML = `<div class="historyItem">История чатов пока пустая.</div>`;
      return;
    }

    chats.forEach((c) => {
      const time = new Date(c.updatedAt || c.createdAt).toLocaleString();
      const item = document.createElement("div");
      item.className = "historyItem historyChat";
      item.dataset.open = c.id;

      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div style="min-width:0;">
            <div style="font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${escapeHtml(c.title || "Чат")}
            </div>
            <div class="historyTime">${time}</div>
          </div>
          <button class="historyDelBtn" type="button" data-del="${c.id}" title="Удалить">✕</button>
        </div>
      `;

      historyListEl.appendChild(item);
    });

    historyListEl.querySelectorAll(".historyChat").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.open;
        if (!getChatById(id)) return;
        setActiveChat(id);
        renderChatMessages();
        closeDrawer();
        switchScreen("chat");
      });
    });

    historyListEl.querySelectorAll(".historyDelBtn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.del;
        chats = chats.filter((c) => c.id !== id);
        if (activeChatId === id) setActiveChat("");
        saveChats();
        renderChatsList();
        renderChatMessages();
        updatePlanButtonVisibility();
      });
    });
  }

  safeOn(clearHistoryBtn, "click", () => {
    chats = [];
    setActiveChat("");
    saveChats();
    renderChatsList();
    renderChatMessages();
    updatePlanButtonVisibility();
  });

  // init chat state
  if (!(activeChatId && getChatById(activeChatId))) {
    setActiveChat("");
  }
  renderChatsList();
  renderChatMessages();
  updatePlanButtonVisibility();

  // =========================
  // PLAN MODAL
  // =========================
  function openPlanModal(content) {
    if (!planOverlay || !planModal || !planContent) return;
    planContent.innerHTML = "";

    if (typeof content === "string") {
      planContent.innerHTML = content;
    } else if (content instanceof Node) {
      planContent.appendChild(content);
    }

    planOverlay.classList.add("open");
    planModal.classList.add("open");
  }

  function closePlanModal() {
    planOverlay?.classList.remove("open");
    planModal?.classList.remove("open");
  }

  safeOn(closePlanBtn, "click", closePlanModal);
  safeOn(planOverlay, "click", closePlanModal);

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
        const li = document.createElement("li");
        li.className = "cardTask";

        const left = document.createElement("div");
        left.textContent = String(t?.t || "").trim();

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
  // PLAN BTN VISIBILITY
  // =========================
  function updatePlanButtonVisibility() {
    if (!planBtn) return;
    const inChat = currentScreen === "chat";
    const chat = getChatById(activeChatId);
    const enough = !!chat && (chat.messages?.length || 0) >= 2;
    planBtn.hidden = !(inChat && enough);
  }

  // =========================
  // HISTORY payload for server
  // =========================
  function buildHistoryPayloadForChat(chatId, limit = 80) {
    const chat = getChatById(chatId);
    const msgs = (chat?.messages || []).slice(-limit);

    const history = msgs.map((m) => ({
      role: m.who === "user" ? "user" : "assistant",
      content: m.text,
    }));

    return { history };
  }

  // =========================
  // TASKS (optional from plan)
  // =========================
  let tasks = loadTasks();
  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.TASKS) || "[]");
    } catch {
      return [];
    }
  }
  function saveTasks() {
    localStorage.setItem(STORAGE.TASKS, JSON.stringify(tasks));
  }
  function renderTasks() {
    if (!tasksListEl) return;
    tasksListEl.innerHTML = "";

    tasks.forEach((t) => {
      const li = document.createElement("li");
      li.className = "taskItem" + (t.done ? " done" : "");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!t.done;
      checkbox.addEventListener("change", () => {
        t.done = checkbox.checked;
        saveTasks();
        renderTasks();
      });

      const text = document.createElement("div");
      text.className = "taskText";
      text.textContent = t.title;

      li.appendChild(checkbox);
      li.appendChild(text);
      tasksListEl.appendChild(li);
    });
  }
  function addTasksFromCards(cards) {
    const titles = [];
    (cards || []).forEach((c) => {
      (Array.isArray(c?.tasks) ? c.tasks : []).forEach((t) => {
        const s = String(t?.t || "").trim();
        if (s) titles.push(s);
      });
    });

    const newOnes = titles.map((title) => ({ id: uuid(), title, done: false }));
    tasks.unshift(...newOnes);
    saveTasks();
    renderTasks();
  }
  safeOn(clearTasksBtn, "click", () => {
    tasks = [];
    saveTasks();
    renderTasks();
  });
  renderTasks();

  // =========================
  // SEND CHAT
  // =========================
  async function sendToChat() {
    if (isLoading) return;

    const text = (promptEl?.value || "").trim();
    if (!text) return;

    const chatId = ensureActiveChat(text);
    switchScreen("chat");

    pushMsgToChat(chatId, "user", text);
    if (promptEl) promptEl.value = "";

    const tg_id = getTgIdOrNull();
    if (!tg_id) {
      pushMsgToChat(chatId, "ai", "Нет tg_id. Для теста в браузере: localStorage.setItem('lsd_dev_tg_id','6521438948')");
      return;
    }

    const profile = loadProfile();
    const { history } = buildHistoryPayloadForChat(chatId, 80);

    isLoading = true;
    sendBtn && (sendBtn.disabled = true);
    chatTyping && (chatTyping.hidden = false);

    try {
      const r = await postJSON(`${API_BASE}/api/chat`, { tg_id, text, history, profile });

      if (!r.ok) {
        pushMsgToChat(chatId, "ai", `Ошибка: ${r.status} — ${r.data?.error || r.data?.details || "bad_response"}`);
        return;
      }

      const answer = typeof r.data?.text === "string" ? r.data.text.trim() : "";
      pushMsgToChat(chatId, "ai", answer || "Пустой ответ 😶");
    } catch (e) {
      console.error(e);
      pushMsgToChat(chatId, "ai", "Ошибка сети/сервер недоступен.");
    } finally {
      isLoading = false;
      sendBtn && (sendBtn.disabled = false);
      chatTyping && (chatTyping.hidden = true);
      updatePlanButtonVisibility();
    }
  }

  safeOn(sendBtn, "click", sendToChat);
  safeOn(promptEl, "keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendToChat();
    }
  });

  // =========================
  // CREATE PLAN
  // =========================
  async function createPlan() {
    if (isLoading) return;

    const tg_id = getTgIdOrNull();
    if (!tg_id) {
      openPlanModal("<div class='historyItem'>Нет tg_id. Для теста: localStorage.setItem('lsd_dev_tg_id','6521438948')</div>");
      return;
    }

    const chat = getChatById(activeChatId);
    if (!chat || (chat.messages?.length || 0) < 2) {
      openPlanModal("<div class='historyItem'>Мало переписки для плана 🙂</div>");
      return;
    }

    const profile = loadProfile();
    const { history } = buildHistoryPayloadForChat(activeChatId, 120);

    isLoading = true;
    planBtn && (planBtn.disabled = true);
    openPlanModal("<div class='historyItem'>Создаю план…</div>");

    try {
      const r = await postJSON(`${API_BASE}/api/plan`, { tg_id, history, profile });

      if (!r.ok) {
        openPlanModal(`<div class='historyItem'>Ошибка: ${r.status} — ${escapeHtml(r.data?.error || r.data?.details || "bad_response")}</div>`);
        return;
      }

      const cards = Array.isArray(r.data?.cards) ? r.data.cards : [];
      if (!cards.length) {
        openPlanModal(`<div class='historyItem'>План не получился: ${escapeHtml(r.data?.reason || "cards_empty")}</div>`);
        return;
      }

      // можно авто добавлять задачи в "Задачи"
      addTasksFromCards(cards);

      openPlanModal(renderPlanCards(cards));
    } catch (e) {
      console.error(e);
      openPlanModal("<div class='historyItem'>Ошибка сети/сервер недоступен.</div>");
    } finally {
      isLoading = false;
      planBtn && (planBtn.disabled = false);
    }
  }

  safeOn(planBtn, "click", createPlan);

  // export for console debugging
  window.LSD = {
    sendToChat,
    createPlan,
    getTgIdOrNull,
    dump: () => ({ chats, activeChatId, currentScreen }),
  };
});
