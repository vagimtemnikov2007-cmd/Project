// LSD Front — FULL (init user on open + chat + plan)
// Drop-in replacement for your current file

window.addEventListener("DOMContentLoaded", () => {
  // =========================
  // HELPERS
  // =========================
  const $ = (id) => document.getElementById(id);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

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
  const STORAGE_ACTIVE_CHAT = "lsd_active_chat_v2";
  const STORAGE_CHAT_CACHE = "lsd_chat_cache_v2";

  function uuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
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
  // ELEMENTS
  // =========================
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
  const avatarEl = $("avatar");

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
    [screenHome, screenTasks, screenChat].forEach((s) => s && s.classList.remove("active"));
    const el = name === "home" ? screenHome : name === "tasks" ? screenTasks : screenChat;
    el && el.classList.add("active");

    currentScreen = name;
    document.body.classList.toggle("chat-mode", name === "chat");
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
    return sJSONGet(STORAGE_PROFILE, { age: null, nick: "", bio: "" });
  }

  // =========================
  // CHAT STATE
  // =========================
  let activeChatId = sGet(STORAGE_ACTIVE_CHAT, "");
  if (!activeChatId) {
    activeChatId = uuid();
    sSet(STORAGE_ACTIVE_CHAT, activeChatId);
  }

  const chatCache = sJSONGet(STORAGE_CHAT_CACHE, {});
  if (!chatCache[activeChatId]) chatCache[activeChatId] = { messages: [] };

  function saveCache() {
    sJSONSet(STORAGE_CHAT_CACHE, chatCache);
  }

  function messages() {
    return chatCache[activeChatId]?.messages || [];
  }

  function pushMsg(who, text) {
    const msg = { who, text: String(text ?? ""), ts: Date.now() };
    chatCache[activeChatId].messages.push(msg);
    saveCache();
    renderMessages();
  }

  function renderMessages() {
    if (!chatMessagesEl) return;
    chatMessagesEl.innerHTML = "";

    messages().forEach((m) => {
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

    dbg(`⬅️ Ответ: ok=${ok} status=${status} data=${JSON.stringify(data)}`);
  } catch (e) {
    dbg("❌ Ошибка initUserInDB: " + String(e?.message || e));
  }
}

  // =========================
  // SEND MESSAGE
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
const debugLine = document.getElementById("debugLine");
function dbg(msg) {
  if (debugLine) debugLine.textContent = String(msg);
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

  // =========================
  // TELEGRAM INIT
  // =========================
const u = tg.initDataUnsafe?.user;

// 👇 проверяем, есть ли user и id
if (!u || !u.id) {
  if (userEl) {
    userEl.textContent = "tg_id: ❌ нет (открыто не из бота)";
  }
} else {
  if (userEl) {
    userEl.textContent = "Привет, " + (u.first_name || "друг") + " (id: " + u.id + ")";
  }
    initUserInDB();
  // аватар
  if (avatarEl && u.photo_url) {
    avatarEl.src = u.photo_url;
  }
}


    // create user in DB on open


  // =========================
  // INIT UI
  // =========================
  switchScreen("home");
  renderMessages();

  console.log("[LSD] loaded. chat_id =", activeChatId);
});
