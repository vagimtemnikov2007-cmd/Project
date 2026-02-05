// LSD Front — FULL (Chats + Plan Accept/Decline + Grouped Tasks + Points + Sync + Attachments + Subscription + Stars Purchase)
// Drop-in replacement for your current JavaScript.js

window.addEventListener("DOMContentLoaded", () => {
  // =========================
  // HELPERS
  // =========================
  const $ = (id) => document.getElementById(id);
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  const debugLine = $("debugLine");
  const dbg = (msg) => {
    try {
      if (debugLine) debugLine.textContent = String(msg);
    } catch {}
  };

  const escapeHTML = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[ch]));

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function uuid() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function fmtTime(ts) {
    const d = new Date(ts || Date.now());
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function nowISO(ts) {
    return new Date(ts || Date.now()).toISOString();
  }

  // =========================
  // TELEGRAM
  // =========================
  const tg = window.Telegram?.WebApp;
  try {
    tg?.ready();
    tg?.expand();
  } catch {}

  function getTgIdOrNull() {
    const id = tg?.initDataUnsafe?.user?.id;
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }

  function tgPopup(message, title = "LSD") {
    try {
      tg?.showPopup?.({ title, message: String(message), buttons: [{ type: "ok" }] });
      return;
    } catch {}
    alert(String(message));
  }

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

  const STORAGE_PROFILE = "lsd_profile_v2";
  const STORAGE_POINTS = "lsd_points_v1";

  const STORAGE_ACTIVE_CHAT = "lsd_active_chat_v3";
  const STORAGE_CHATS_INDEX = "lsd_chats_index_v1";
  const STORAGE_CHAT_CACHE = "lsd_chat_cache_v3";

  const STORAGE_TASKS_GROUPS = "lsd_tasks_groups_v2";
  const STORAGE_SUB_PLAN = "lsd_sub_plan_v1"; // month | year

  // =========================
  // UI ELEMENTS
  // =========================
  const settingsBtn = document.querySelector(".settings_bt");
  const drawer = $("settingsDrawer");
  const drawerOverlay = $("drawerOverlay");

  const screenHome = $("screen-home");
  const screenTasks = $("screen-tasks");
  const screenChat = $("screen-chat");
  const screenSubscription = $("screen-subscription");

  const navBtn = $("navBtn");
  const navBtnText = navBtn?.querySelector("span");

  const promptEl = $("prompt");
  const sendBtn = $("sendBtn");
  const chatMessagesEl = $("chatMessages");
  const chatTypingEl = $("chatTyping");
  const planBtn = $("planBtn");

  const userEl = $("user");

  const drawerName = $("drawerName");
  const drawerPhone = $("drawerPhone");
  const drawerAvatar = $("drawerAvatar");

  const themeMiniBtn = $("themeMiniBtn");

  const menuProfile = $("menuProfile");
  const menuHistory = $("menuHistory");
  const menuSettings = $("menuSettings");

  const historyList = $("historyList");
  const clearHistoryBtn = $("clearHistory");

  const profileModal = $("profileModal");
  const profileOverlay = $("profileOverlay");
  const closeProfileBtn = $("closeProfile");

  const profileName = $("profileName");
  const profileAge = $("profileAge");
  const profileNick = $("profileNick");
  const profileBio = $("profileBio");

  const planOverlay = $("planOverlay");
  const planModal = $("planModal");
  const planContent = $("planContent");
  const closePlanBtn = $("closePlan");

  const tasksListEl = $("tasksList");
  const clearTasksBtn = $("clearTasks");

  const pointsBar = $("pointsBar");
  const pointsValue = $("pointsValue");

  const plusBtn = $("plusBtn");
  const attach = $("attach");
  const attachPanel = attach?.querySelector(".attach__panel");
  const pickPhoto = $("pickPhoto");
  const pickFile = $("pickFile");

  const lsdCtaPrice = document.getElementById("lsdCtaPrice");

  // 🔥 ВАЖНО: кнопка "Обновить план" — ищем надёжно
  // 1) в блоке .pass
  // 2) либо по id (если ты захочешь добавить)
const upgradeBtn = document.getElementById("upgradeBtn");

if (upgradeBtn && screenSubscription) {
  upgradeBtn.addEventListener("click", () => {
    screenSubscription.classList.add("open");
    screenSubscription.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
}
  const subClose = $("subscriptionClose");
  const lsdSubscribeBtn = $("lsdSubscribeBtn");
const subscriptionClose = document.getElementById("subscriptionClose");

subscriptionClose?.addEventListener("click", () => {
  screenSubscription.classList.remove("open");
  screenSubscription.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
});

  // =========================
  // STATE
  // =========================
  let currentScreen = "home";
  let isLoading = false;

  let points = Number(sGet(STORAGE_POINTS, "0")) || 0;

  let activeChatId = sGet(STORAGE_ACTIVE_CHAT, "");
  let chatsIndex = sJSONGet(STORAGE_CHATS_INDEX, []);
  let chatCache = sJSONGet(STORAGE_CHAT_CACHE, {});

  let tasksState = sJSONGet(STORAGE_TASKS_GROUPS, { groups: [] });

  let syncTimer = null;
  let pullTimer = null;

  let selectedPlan = sGet(STORAGE_SUB_PLAN, "month") || "month"; // month/year

const PRICES = {
  month: { stars: 199, label: "199 ⭐/мес" },
  year:  { stars: 1990, label: "1990 ⭐/год" },
};

function updateSubscriptionUI() {
  if (!lsdCtaPrice) return;

  const p = PRICES[selectedPlan] || PRICES.month;
  lsdCtaPrice.textContent = p.stars + " ⭐";

  // если хочешь, можно ещё менять подпись кнопки:
  // lsdSubscribeBtn.textContent = `Подключить за ${p.stars} ⭐`;
}

  // =========================
  // EMOJI
  // =========================
  const EMOJIS = ["💬", "🧠", "⚡", "🧩", "📌", "🎯", "🧊", "🍀", "🌙", "☀️", "🦊", "🐺", "🐼", "🧪", "📚"];
  function pickEmoji() {
    return EMOJIS[(Math.random() * EMOJIS.length) | 0];
  }

  // =========================
  // NETWORK
  // =========================
  async function postJSON(url, payload, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      dbg("➡️ " + url);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
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
      const msg = e?.name === "AbortError" ? `timeout_${timeoutMs}ms` : String(e?.message || e);
      dbg("❌ fetch error: " + msg);
      return { ok: false, status: 0, data: { error: msg } };
    } finally {
      clearTimeout(timer);
    }
  }

  async function postForm(url, formData, timeoutMs = 60000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      dbg("➡️ " + url);

      const res = await fetch(url, {
        method: "POST",
        body: formData,
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
      const msg = e?.name === "AbortError" ? `timeout_${timeoutMs}ms` : String(e?.message || e);
      dbg("❌ fetch error: " + msg);
      return { ok: false, status: 0, data: { error: msg } };
    } finally {
      clearTimeout(timer);
    }
  }

  // =========================
  // PROFILE
  // =========================
  function loadProfile() {
    return sJSONGet(STORAGE_PROFILE, { age: "", nick: "", bio: "" });
  }
  function saveProfile(p) {
    sJSONSet(STORAGE_PROFILE, p);
  }

  async function initUserInDB() {
    const tg_id = getTgIdOrNull();
    if (!tg_id) return;

    try {
      const profile = loadProfile();
      const { ok, data } = await postJSON(`${API_BASE}/api/user/init`, { tg_id, profile });
      if (!ok) dbg("init error: " + (data?.error || "unknown"));
    } catch {}
  }

  // =========================
  // THEME
  // =========================
  function syncThemeIcon() {
    if (!themeMiniBtn) return;
    const isDark = document.body.classList.contains("dark");
    themeMiniBtn.innerHTML = `
      <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;">
        <img
          src="${isDark ? "img/icons8-sun-48.svg" : "img/moon-20.svg"}"
          alt="theme"
          width="22"
          height="22"
          style="${isDark ? "filter: invert(1);" : ""}"
        />
      </span>
    `;
  }

  on(themeMiniBtn, "click", () => {
    document.body.classList.toggle("dark");
    syncThemeIcon();
  });

  // =========================
  // DRAWER
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
  // SCREENS + POINTS VISIBILITY
  // =========================
  function setNavLabel() {
    if (!navBtnText) return;
    navBtnText.textContent = currentScreen === "home" ? "задачи" : "назад";
  }

  function scrollToBottom() {
    if (!chatMessagesEl) return;
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  function updatePlanVisibility() {
    if (!planBtn) return;
    const enough = getMessages().length >= 2;
    planBtn.hidden = !(currentScreen === "chat" && enough);
  }

  function updatePointsVisibility() {
    if (!pointsBar) return;
    pointsBar.style.display = currentScreen === "tasks" ? "" : "none";
  }

  function switchScreen(name) {
    if (currentScreen === "chat" && name !== "chat") cleanupEmptyChats();

    [screenHome, screenTasks, screenChat, screenSubscription].forEach((s) => s && s.classList.remove("active"));

    const el =
      name === "home"
        ? screenHome
        : name === "tasks"
        ? screenTasks
        : name === "subscription"
        ? screenSubscription
        : screenChat;

    el && el.classList.add("active");

    currentScreen = name;
    setNavLabel();
    updatePlanVisibility();
    updatePointsVisibility();
    if (name === "chat") scrollToBottom();
  }

  on(navBtn, "click", () => {
    if (currentScreen === "home") switchScreen("tasks");
    else switchScreen("home");
  });

  // =========================
  // POINTS
  // =========================
  function renderPointsBar() {
    if (pointsValue) pointsValue.textContent = String(points || 0);
    updatePointsVisibility();
  }

  function savePoints() {
    sSet(STORAGE_POINTS, String(points));
    renderPointsBar();
  }

  // =========================
  // CHATS STORAGE
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
    if (!chatCache[id].meta) {
      chatCache[id].meta = { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() };
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

  function getMessages() {
    if (!activeChatId) return [];
    return getActiveChat().messages || [];
  }

  function makeChatTitleFromText(text) {
    const t = String(text || "").trim();
    if (!t) return "Новый чат";
    return t.length > 22 ? t.slice(0, 22) + "…" : t;
  }

  function cleanupEmptyChats() {
    const userIsInChatNow = currentScreen === "chat";

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

    if (toDelete.includes(activeChatId)) activeChatId = chatsIndex[0] || "";

    if (!activeChatId) {
      const id = uuid();
      chatCache[id] = { meta: { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() }, messages: [] };
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
    chatCache[id] = { meta: { title: "Новый чат", emoji: pickEmoji(), updatedAt: Date.now() }, messages: [] };
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

function pushMsg(who, text, opts = {}) {
  if (!activeChatId) createNewChat();

  const c = getActiveChat();
  const msg = {
    msg_id: opts.msg_id || uuid(),
    who, // "user" | "ai"
    text: String(text ?? ""),
    ts: opts.ts ?? Date.now(),
  };

  c.messages.push(msg);
  c.meta.updatedAt = Date.now();

  if (c.meta.title === "Новый чат" && who === "user") {
    c.meta.title = makeChatTitleFromText(text);
  }

  bumpChatToTop(activeChatId);
  saveChats();

  renderMessages();
  renderChatsInHistory();

  scheduleSyncPush();
  return msg; // полезно
}

  // =========================
  // RENDER MESSAGES
  // =========================
  function renderMessages() {
    if (!chatMessagesEl) return;
    chatMessagesEl.innerHTML = "";

    const arr = getMessages();
    arr.forEach((m) => {
      const div = document.createElement("div");
      div.className = "msg " + (m.who === "user" ? "user" : "ai");
      div.textContent = m.text;
      chatMessagesEl.appendChild(div);
    });

    scrollToBottom();
    updatePlanVisibility();
  }

  // =========================
  // RENDER CHATS LIST
  // =========================
  function renderChatsInHistory() {
    if (!historyList) return;

    historyList.innerHTML = "";

    const newRow = document.createElement("div");
    newRow.className = "tgChatRow";
    newRow.innerHTML = `
      <div class="tgEmojiAvatar">➕</div>
      <div class="tgChatMid">
        <div class="tgChatTitle">Новый чат</div>
        <div class="tgChatLast">Создать новый диалог</div>
      </div>
      <div class="tgChatRight"><div class="tgChatTime"></div></div>
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
      if (id === activeChatId) row.style.background = "rgba(0,0,0,0.03)";

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
  // TASKS (Grouped)
  // =========================
  function saveTasksState() {
    sJSONSet(STORAGE_TASKS_GROUPS, tasksState);
  }

  function energyToLevel(energy) {
    const e = String(energy || "").toLowerCase();
    if (!e) return 2;
    if (e.includes("easy") || e.includes("легк")) return 1;
    if (e.includes("hard") || e.includes("тяж")) return 3;
    return 2;
  }

  function levelLabel(level) {
    if (level <= 1) return "Лёгкая";
    if (level === 2) return "Средняя";
    return "Сложная";
  }

  function groupMeta(group) {
    const items = Array.isArray(group.items) ? group.items : [];
    const totalMin = items.reduce((s, t) => s + (Number.isFinite(Number(t.min)) ? Number(t.min) : 0), 0);
    const avgLevel = items.length
      ? Math.round(items.reduce((s, t) => s + (Number(t.level) || 2), 0) / items.length)
      : 2;

    const doneCount = items.reduce((s, t) => s + (t.done ? 1 : 0), 0);
    const allDone = items.length > 0 && doneCount === items.length;

    return { totalMin, avgLevel, doneCount, allDone, itemsCount: items.length };
  }

  function calcGroupPoints(g) {
    const meta = groupMeta(g);
    const p1 = meta.itemsCount;
    const p2 = Math.max(0, Math.floor((meta.totalMin || 0) / 30));
    return Math.max(1, p1 + p2);
  }

  function renderTasks() {
    if (!tasksListEl) return;

    const groups = Array.isArray(tasksState?.groups) ? tasksState.groups : [];
    tasksListEl.innerHTML = "";

    if (!groups.length) {
      const li = document.createElement("li");
      li.className = "taskItem";
      li.innerHTML = `<div class="taskText">Задач пока нет 🙂</div>`;
      tasksListEl.appendChild(li);
      return;
    }

    groups.forEach((g) => {
      const meta = groupMeta(g);
      const open = !!g.open;
      const submitted = !!g.submitted;

      const wrap = document.createElement("li");
      wrap.className = "taskGroup";
      wrap.dataset.groupId = g.id;

      const showSubmit = meta.allDone && !submitted;
      const groupPoints = calcGroupPoints(g);

      wrap.innerHTML = `
        <div class="taskGroupHead ${open ? "open" : ""}">
          <div class="taskGroupTitle">${escapeHTML(g.title || "План")}</div>

          <div class="taskGroupMeta">
            <span class="metaPill">⏱ ${meta.totalMin || 0}м</span>
            <span class="metaPill">⚡ ${levelLabel(meta.avgLevel)}</span>
            <span class="metaPill">✅ ${meta.doneCount}/${meta.itemsCount}</span>
          </div>

          <div class="taskGroupChevron">${open ? "▾" : "▸"}</div>
        </div>

        <div class="taskGroupBody ${open ? "open" : ""}"></div>
      `;

      const head = wrap.querySelector(".taskGroupHead");
      const body = wrap.querySelector(".taskGroupBody");

      head.addEventListener("click", () => {
        g.open = !g.open;
        saveTasksState();
        renderTasks();
      });

      if (submitted) {
        const okBar = document.createElement("div");
        okBar.className = "taskSubmitBar done";
        okBar.innerHTML = `🏆 Сдано • +${groupPoints} очков`;
        body.appendChild(okBar);
      } else if (showSubmit) {
        const bar = document.createElement("button");
        bar.type = "button";
        bar.className = "taskSubmitBar";
        bar.textContent = `🏁 Сдать задание (+${groupPoints} очков)`;
        bar.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (g.submitted) return;

          g.submitted = true;
          points += groupPoints;
          savePoints();

          saveTasksState();
          renderTasks();
          scheduleSyncPush();
        });
        body.appendChild(bar);
      }

      const items = Array.isArray(g.items) ? g.items : [];
      items.forEach((t) => {
        const row = document.createElement("div");
        row.className = "taskRow" + (t.done ? " done" : "");

        row.innerHTML = `
          <label class="taskRowLeft">
            <input type="checkbox" ${t.done ? "checked" : ""} />
            <span class="taskRowText">${escapeHTML(t.text || "")}</span>
          </label>
          <div class="taskRowRight">
            ${Number.isFinite(Number(t.min)) ? `<span class="miniMeta">⏱ ${Number(t.min)}м</span>` : ""}
            <span class="miniMeta">⚡ ${levelLabel(Number(t.level) || 2)}</span>
          </div>
        `;

        const cb = row.querySelector("input[type='checkbox']");
        cb.addEventListener("change", () => {
          t.done = !!cb.checked;
          if (!t.done) g.submitted = false;
          saveTasksState();
          renderTasks();
          scheduleSyncPush();
        });

        body.appendChild(row);
      });

      tasksListEl.appendChild(wrap);
    });
  }

  function clearAllTasks() {
    tasksState = { groups: [] };
    saveTasksState();
    renderTasks();
    scheduleSyncPush();
  }

  on(clearTasksBtn, "click", clearAllTasks);

  // =========================
  // PLAN MODAL
  // =========================
  function openPlanModal(htmlOrNode) {
    if (!planOverlay || !planModal || !planContent) return;

    if (typeof htmlOrNode === "string") {
      planContent.innerHTML = htmlOrNode;
    } else {
      planContent.innerHTML = "";
      planContent.appendChild(htmlOrNode);
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

  function normalizeCards(cards) {
    const arr = Array.isArray(cards) ? cards : [];
    return arr
      .map((c, idx) => {
        const title = String(c?.title || `План #${idx + 1}`).trim();
        const tasks = Array.isArray(c?.tasks) ? c.tasks : [];

        const items = tasks
          .map((t) => {
            const text = String(t?.t || "").trim();
            if (!text) return null;

            const min = Number.isFinite(Number(t?.min)) ? Number(t.min) : null;
            const level = energyToLevel(t?.energy);

            return { id: uuid(), text, min, level, done: false };
          })
          .filter(Boolean);

        return { id: uuid(), title, items };
      })
      .filter((g) => g.items.length > 0);
  }

  function addGroupToTasks(group) {
    if (!group?.items?.length) return;

    const existing = Array.isArray(tasksState.groups) ? tasksState.groups : [];
    const same = existing.find((g) => String(g.title) === String(group.title));

    if (same) {
      same.items = [...same.items, ...group.items];
      same.open = true;
      same.submitted = false;
    } else {
      tasksState.groups.unshift({
        id: uuid(),
        title: group.title,
        items: group.items,
        open: true,
        createdAt: Date.now(),
        submitted: false,
      });
    }

    saveTasksState();
    renderTasks();
    scheduleSyncPush();
  }

  function renderPlanForAccept(cardsNormalized) {
    const wrap = document.createElement("div");
    wrap.className = "planCards";

    cardsNormalized.forEach((g) => {
      const meta = groupMeta(g);

      const card = document.createElement("div");
      card.className = "planCard";

      card.innerHTML = `
        <div class="planCardHead">
          <div class="planCardTitle">${escapeHTML(g.title)}</div>
          <div class="planCardMeta">
            <span class="metaPill">⏱ ${meta.totalMin || 0}м</span>
            <span class="metaPill">⚡ ${levelLabel(meta.avgLevel)}</span>
          </div>
        </div>

        <div class="planCardBody"></div>

        <div class="planCardActions">
          <button class="planAcceptBtn" type="button">Принять</button>
          <button class="planDeclineBtn" type="button">Отклонить</button>
        </div>
      `;

      const body = card.querySelector(".planCardBody");
      g.items.forEach((t) => {
        const row = document.createElement("div");
        row.className = "planTaskRow";
        row.innerHTML = `
          <div class="planTaskText">${escapeHTML(t.text)}</div>
          <div class="planTaskMeta">
            ${Number.isFinite(Number(t.min)) ? `<span>⏱ ${Number(t.min)}м</span>` : ""}
            <span>⚡ ${levelLabel(Number(t.level) || 2)}</span>
          </div>
        `;
        body.appendChild(row);
      });

      const acceptBtn = card.querySelector(".planAcceptBtn");
      const declineBtn = card.querySelector(".planDeclineBtn");

      acceptBtn.addEventListener("click", () => {
        addGroupToTasks(g);
        card.remove();
        if (!wrap.querySelector(".planCard")) {
          closePlanModal();
          switchScreen("tasks");
        }
      });

      declineBtn.addEventListener("click", () => {
        card.remove();
        if (!wrap.querySelector(".planCard")) closePlanModal();
      });

      wrap.appendChild(card);
    });

    return wrap;
  }

  // =========================
  // CREATE PLAN
  // =========================
  async function createPlan() {
    if (isLoading) return;

    const tg_id = getTgIdOrNull();
    if (!tg_id) return tgPopup("Открой мини-апп внутри Telegram.");

    if (getMessages().length < 2) {
      tgPopup("Мало переписки для плана 🙂");
      return;
    }

    isLoading = true;
    if (planBtn) planBtn.disabled = true;

    try {
      const profile = loadProfile();
      const { ok, status, data } = await postJSON(`${API_BASE}/api/plan/create`, {
        tg_id,
        chat_id: activeChatId,
        profile,
      });

      if (!ok) {
        openPlanModal(`<div class="planError">Ошибка: ${escapeHTML(data?.error || `status_${status}`)}</div>`);
        return;
      }

      const cards = Array.isArray(data?.cards) ? data.cards : [];
      const normalized = normalizeCards(cards);

      if (!normalized.length) {
        openPlanModal(`<div class="planEmpty">План пустой. Напиши больше деталей 🙂</div>`);
        return;
      }

      openPlanModal(renderPlanForAccept(normalized));
    } catch {
      openPlanModal(`<div class="planError">Не удалось подключиться к серверу.</div>`);
    } finally {
      isLoading = false;
      if (planBtn) planBtn.disabled = false;
    }
  }

  // =========================
  // SEND MESSAGE
  // =========================
  async function sendMessage() {
  if (isLoading) return;

  const text = (promptEl?.value || "").trim();
  if (!text) return;

  switchScreen("chat");

  const clientUserMsgId = uuid();
  pushMsg("user", text, { msg_id: clientUserMsgId });

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
      msg_id: clientUserMsgId, // ← ВАЖНО: отправляем тот же msg_id
    });

    if (!ok) {
      pushMsg("ai", "Ошибка сервера: " + (data?.error || `status_${status}`));
      return;
    }

    // AI сообщение добавляем с msg_id от сервера (или fallback)
    const aiId = data?.ai_msg_id || uuid();
    pushMsg("ai", String(data?.text || "").trim() || "AI вернул пустой ответ 😶", { msg_id: aiId });

  } catch {
    pushMsg("ai", "Не удалось подключиться к серверу.");
  } finally {
    isLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    if (chatTypingEl) chatTypingEl.hidden = true;
  }
}


  // =========================
  // ATTACHMENTS
  // =========================
  function openAttach() {
    if (!attach) return;
    attach.classList.add("is-open");
    attach.setAttribute("aria-hidden", "false");
  }

  function closeAttach() {
    if (!attach) return;
    attach.classList.remove("is-open");
    attach.setAttribute("aria-hidden", "true");
  }

  function toggleAttach() {
    if (!attach) return;
    attach.classList.contains("is-open") ? closeAttach() : openAttach();
  }

  plusBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleAttach();
  });

  attach?.addEventListener("click", () => closeAttach());
  attachPanel?.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAttach();
  });

  pickPhoto?.addEventListener("change", () => {
    const file = pickPhoto.files?.[0];
    if (!file) return;
    closeAttach();
    sendAttachment({ file, kind: "photo" });
    pickPhoto.value = "";
  });

  pickFile?.addEventListener("change", () => {
    const file = pickFile.files?.[0];
    if (!file) return;
    closeAttach();
    sendAttachment({ file, kind: "file" });
    pickFile.value = "";
  });

  async function sendAttachment({ file, kind }) {
  if (isLoading) return;

  const tg_id = getTgIdOrNull();
  if (!tg_id) return tgPopup("Открой мини-апп внутри Telegram.");

  switchScreen("chat");

  const clientUserMsgId = uuid();
  const label = kind === "photo" ? `📷 Фото: ${file.name}` : `📎 Файл: ${file.name}`;
  pushMsg("user", label, { msg_id: clientUserMsgId });

  const fd = new FormData();
  fd.append("tg_id", String(tg_id));
  fd.append("chat_id", String(activeChatId));
  fd.append("kind", kind);
  fd.append("file", file);
  fd.append("profile", JSON.stringify(loadProfile() || {}));
  fd.append("msg_id", clientUserMsgId); // ← ВАЖНО

  isLoading = true;
  if (sendBtn) sendBtn.disabled = true;
  if (chatTypingEl) chatTypingEl.hidden = false;

  try {
    const { ok, status, data } = await postForm(`${API_BASE}/api/chat/attach`, fd);

    if (!ok) {
      pushMsg("ai", "Ошибка сервера: " + (data?.error || `status_${status}`));
      return;
    }

    const aiId = data?.ai_msg_id || uuid();
    pushMsg("ai", String(data?.text || "").trim() || "AI вернул пустой ответ 😶", { msg_id: aiId });

  } catch {
    pushMsg("ai", "Не удалось подключиться к серверу.");
  } finally {
    isLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    if (chatTypingEl) chatTypingEl.hidden = true;
  }
}


  // =========================
  // SUBSCRIPTION SCREEN (OPEN/CLOSE) — FIXED
  // =========================
  function openSubscription() {
    if (!screenSubscription) {
      tgPopup("Не найден #screen-subscription в HTML.");
      return;
    }
    switchScreen("subscription");
    screenSubscription.setAttribute("aria-hidden", "false");
  }

  function closeSubscription() {
    if (!screenSubscription) return;
    screenSubscription.setAttribute("aria-hidden", "true");
    switchScreen("home");
  }

  // 🔥 ФИКС: кнопка "Обновить план" должна открывать subscription
  if (upgradeBtn) {
    upgradeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSubscription();
    });
  } else {
    dbg("⚠️ upgradeBtn not found (.pass button / #upgradeBtn)");
  }

  on(subClose, "click", (e) => {
    e.preventDefault();
    closeSubscription();
  });

  // =========================
  // SUBSCRIPTION: plan selection (month/year)
  // =========================
  function setSelectedPlan(plan) {
    selectedPlan = plan === "year" ? "year" : "month";
    sSet(STORAGE_SUB_PLAN, selectedPlan);
  }
  setSelectedPlan(selectedPlan);
  updateSubscriptionUI();
screenSubscription?.addEventListener("change", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;
  if (t.name !== "lsd_plan") return;

  setSelectedPlan(t.value);
  updateSubscriptionUI();
});


  // =========================
  // PURCHASE (Telegram Stars) — FIXED FOR SERVER invoice OBJECT
  // =========================
  async function purchaseSubscription() {
    const tg_id = getTgIdOrNull();
    if (!tg_id) return tgPopup("Открой мини-апп внутри Telegram.");

    if (!tg?.openInvoice) {
      return tgPopup("Оплата доступна только внутри Telegram клиента (openInvoice недоступен).");
    }

    try {
      if (lsdSubscribeBtn) lsdSubscribeBtn.disabled = true;

const { ok, status, data } = await postJSON(`${API_BASE}/api/subscription/invoice`, {
  tg_id,
  plan: selectedPlan,
});

if (!ok) {
  tgPopup("Не удалось создать оплату: " + (data?.error || `status_${status}`));
  return;
}

const invoiceUrl = data?.invoice_url;
if (!invoiceUrl || typeof invoiceUrl !== "string") {
  tgPopup("Сервер вернул неправильный invoice_url.");
  return;
}

// ВАЖНО: openInvoice принимает СТРОКУ (invoice link)
tg.openInvoice(invoiceUrl, (status) => {
  if (status === "paid") {
    tgPopup("Оплата прошла ✅");
    closeSubscription();
  } else if (status === "cancelled") {
    tgPopup("Оплата отменена.");
  } else {
    tgPopup("Оплата не прошла.");
  }
});

    } catch (e) {
      tgPopup("Ошибка оплаты: " + String(e?.message || e));
    } finally {
      if (lsdSubscribeBtn) lsdSubscribeBtn.disabled = false;
    }
  }

  on(lsdSubscribeBtn, "click", purchaseSubscription);

  // =========================
  // SYNC (push / pull)
  // =========================
  function scheduleSyncPush() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncPush, 700);
  }

  function roleToWho(role) {
    return role === "assistant" ? "ai" : "user";
  }
  function whoToRole(who) {
    return who === "ai" ? "assistant" : "user";
  }

  async function syncPush() {
    const tg_id = getTgIdOrNull();
    if (!tg_id) return;

    const chats_upsert = (chatsIndex || [])
      .filter((id) => chatCache[id])
      .map((id) => {
        const c = chatCache[id];
        return {
          chat_id: id,
          title: c?.meta?.title || "Новый чат",
          emoji: c?.meta?.emoji || "💬",
          updated_at: nowISO(c?.meta?.updatedAt || Date.now()),
        };
      });

    const messages_upsert = [];
    (chatsIndex || []).forEach((chat_id) => {
      const arr = (chatCache[chat_id]?.messages || []).slice(-80);
      arr.forEach((m) => {
        if (!m.msg_id) m.msg_id = uuid();
        messages_upsert.push({
          chat_id,
          msg_id: m.msg_id,
          role: whoToRole(m.who),
          content: m.text,
          created_at: nowISO(m.ts || Date.now()),
        });
      });
    });

    await postJSON(`${API_BASE}/api/sync/push`, {
      tg_id,
      chats_upsert,
      messages_upsert,
      tasks_state: tasksState,
      points,
    });
  }

  async function syncPull() {
    const tg_id = getTgIdOrNull();
    if (!tg_id) return;

    const { ok, data } = await postJSON(`${API_BASE}/api/sync/pull`, { tg_id });
    if (!ok) return;

    if (Array.isArray(data?.chats)) {
      data.chats.forEach((c) => {
        const id = c.chat_id;
        if (!id) return;

        if (!chatCache[id]) chatCache[id] = { meta: {}, messages: [] };
        chatCache[id].meta = {
          title: c.title || "Новый чат",
          emoji: c.emoji || "💬",
          updatedAt: new Date(c.updated_at || Date.now()).getTime(),
        };

        if (!chatsIndex.includes(id)) chatsIndex.push(id);
        ensureChat(id);
      });
    }

    if (Array.isArray(data?.messages)) {
      const byChat = new Map();

      data.messages.forEach((m) => {
        const chat_id = m.chat_id;
        if (!chat_id) return;

        if (!byChat.has(chat_id)) byChat.set(chat_id, []);
        byChat.get(chat_id).push({
          msg_id: m.msg_id,
          who: roleToWho(m.role),
          text: m.content,
          ts: new Date(m.created_at || Date.now()).getTime(),
        });
      });

      byChat.forEach((arr, chat_id) => {
        ensureChat(chat_id);

        const existing = new Set((chatCache[chat_id].messages || []).map((x) => x.msg_id).filter(Boolean));

        arr.forEach((x) => {
          if (!x.msg_id) x.msg_id = uuid();
          if (!existing.has(x.msg_id)) chatCache[chat_id].messages.push(x);
        });

        chatCache[chat_id].messages.sort((a, b) => (a.ts || 0) - (b.ts || 0));

        const last = chatCache[chat_id].messages[chatCache[chat_id].messages.length - 1];
        if (last?.ts) chatCache[chat_id].meta.updatedAt = last.ts;
      });
    }

    if (data?.tasks_state && typeof data.tasks_state === "object") {
      tasksState = data.tasks_state;
      saveTasksState();
    }

    if (Number.isFinite(Number(data?.points))) {
      points = Number(data.points);
      savePoints();
    }

    chatsIndex = chatsIndex
      .filter((id) => chatCache[id])
      .sort((a, b) => (chatCache[b].meta.updatedAt || 0) - (chatCache[a].meta.updatedAt || 0));

    if (!activeChatId || !chatCache[activeChatId]) activeChatId = chatsIndex[0] || activeChatId;

    saveChats();
    renderTasks();
    renderChatsInHistory();
    renderMessages();
  }

  // =========================
  // PROFILE MODAL
  // =========================
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

  function saveProfileAndClose() {
    const p = {
      age: profileAge?.value ?? "",
      nick: profileNick?.value ?? "",
      bio: profileBio?.value ?? "",
    };
    saveProfile(p);
    closeProfile();
    initUserInDB();
    syncPull();
  }

  on(menuProfile, "click", () => {
    closeDrawer();
    openProfile();
  });

  on(clearHistoryBtn, "click", () => {
    resetAllChats();
    renderChatsInHistory();
    scheduleSyncPush();
  });

  on(closeProfileBtn, "click", saveProfileAndClose);
  on(profileOverlay, "click", saveProfileAndClose);

  // =========================
  // DRAWER USER INFO INIT
  // =========================
  function initDrawerUser() {
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

let pressTimer = null;

function shareTextToTelegram(text) {
  const t = String(text || "").trim();
  if (!t) return;

  // ЗАМЕНИ НА СВОЙ ЮЗЕРНЕЙМ БОТА
  const appLink = "https://t.me/ТВОЙ_БОТ?startapp=from_share";

  const full =
`🤖 Ответ LSD AI:

${t}

👉 Открыть LSD:
${appLink}`;

  // haptic если есть
  try { tg?.HapticFeedback?.impactOccurred?.("medium"); } catch {}

  // ВАЖНО: используем tg.openTelegramLink
  tg?.openTelegramLink?.(
    `https://t.me/share/url?text=${encodeURIComponent(full)}`
  );
}

// Делегирование: работает даже после renderMessages()
chatMessagesEl?.addEventListener("pointerdown", (e) => {
  const el = e.target?.closest?.(".msg.ai");
  if (!el) return;

  // не даём открыть системное меню
  e.preventDefault();

  pressTimer = setTimeout(() => {
    shareTextToTelegram(el.textContent || "");
  }, 450);
}, { passive: false });

chatMessagesEl?.addEventListener("pointerup", () => clearTimeout(pressTimer));
chatMessagesEl?.addEventListener("pointercancel", () => clearTimeout(pressTimer));
chatMessagesEl?.addEventListener("pointermove", () => clearTimeout(pressTimer));

chatMessagesEl?.addEventListener("contextmenu", (e) => {
  const el = e.target?.closest?.(".msg.ai");
  if (!el) return;
  e.preventDefault();
  shareTextToTelegram(el.textContent || "");
});




  // =========================
  // BOOT
  // =========================
  if (!activeChatId) {
    if (Array.isArray(chatsIndex) && chatsIndex.length) activeChatId = chatsIndex[0];
    else {
      activeChatId = uuid();
      chatsIndex = [activeChatId];
    }
  }
  ensureChat(activeChatId);

  if (!Array.isArray(chatsIndex)) chatsIndex = [activeChatId];
  if (!chatsIndex.includes(activeChatId)) chatsIndex.unshift(activeChatId);

  saveChats();

  initDrawerUser();
  renderPointsBar();
  renderTasks();
  renderMessages();
  renderChatsInHistory();
  cleanupEmptyChats();

  switchScreen("home");

  if (tg) {
    try {
      tg.ready();
      tg.expand();
    } catch {}

    const u = tg.initDataUnsafe?.user;
    if (userEl) userEl.textContent = "Привет, " + (u?.first_name || "друг");
    initUserInDB();
  } else {
    if (userEl) userEl.textContent = "Открой внутри Telegram WebApp 🙂";
  }

  
  syncPull();
  clearInterval(pullTimer);
  pullTimer = setInterval(syncPull, 30000);

  console.log("[LSD] loaded. activeChatId =", activeChatId);
});
