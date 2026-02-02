// JavaScript.js — FULL WORKING VERSION (chat -> plan button -> cards)
// Без дублей, только одна система чатов.

window.addEventListener("DOMContentLoaded", () => {
  // =========================
  // HELPERS
  // =========================
  const $ = (id) => document.getElementById(id);

  function safeOn(el, event, handler) {
    if (el) el.addEventListener(event, handler);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

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

  const tasksListEl = $("tasksList");
  const clearTasksBtn = $("clearTasks");

  const planBtn = $("planBtn");
  const planOverlay = $("planOverlay");
  const planModal = $("planModal");
  const planContent = $("planContent");
  const closePlanBtn = $("closePlan");

  const settingsBtn = document.querySelector(".settings_bt");
  const drawer = $("settingsDrawer");
  const drawerOverlay = $("drawerOverlay");
  const drawerClose = $("drawerClose");

  const lightBtn = $("lightBtn");
  const darkBtn = $("darkBtn");

  const historyListEl = $("historyList");
  const clearHistoryBtn = $("clearHistory");

  const openProfileBtn = $("openProfile");
  const profileModal = $("profileModal");
  const profileOverlay = $("profileOverlay");
  const closeProfileBtn = $("closeProfile");

  const avatarEl = $("avatar");
  const userEl = $("user");

  const profileAvatarEl = $("profileAvatar");
  const profileNameEl = $("profileName");
  const profileAgeEl = $("profileAge");
  const profileNickEl = $("profileNick");
  const profileBioEl = $("profileBio");

  const chatMessages = $("chatMessages");
  const chatTyping = $("chatTyping");

  // =========================
  // STATE
  // =========================
  let currentScreen = "home";
  let isLoading = false;

  // =========================
  // STORAGE KEYS
  // =========================
  const STORAGE_TASKS = "lsd_tasks_v1";
  const STORAGE_THEME = "lsd_theme";
  const STORAGE_PROFILE = "lsd_profile_v1";

  // Чаты-сессии
  const STORAGE_CHATS = "lsd_chats_v1";          // [{id,title,createdAt,updatedAt,messages:[{who,text,ts}]}]
  const STORAGE_ACTIVE_CHAT = "lsd_active_chat"; // id текущего

  // =========================
  // API
  // =========================
  const API_BASE = "https://lsd-server-ml3z.onrender.com";


  function getTgIdOrNull() {
  const tg = window.Telegram?.WebApp;
  const id = tg?.initDataUnsafe?.user?.id;
  return Number.isFinite(Number(id)) ? Number(id) : null;
}

  // =========================
  // SCREEN SWITCH (smooth)
  // =========================
  function scrollChatToBottom() {
    if (!chatMessages) return;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function switchScreen(nextName) {
    const all = [screenHome, screenTasks, screenChat].filter(Boolean);
    const currentEl = all.find((s) => s.classList.contains("active"));

    const nextEl =
      nextName === "home" ? screenHome :
      nextName === "tasks" ? screenTasks :
      screenChat;

    if (!nextEl) return;
    if (currentEl === nextEl) return;

    if (currentEl) currentEl.classList.add("leaving");

    setTimeout(() => {
      all.forEach((s) => s.classList.remove("active", "leaving"));
      nextEl.classList.add("active");

      currentScreen = nextName;
      document.body.classList.toggle("chat-mode", nextName === "chat");

      setNavLabel();
      if (nextName === "chat") scrollChatToBottom();
    }, 220);
  }

  // =========================
  // NAV LABEL
  // =========================
  function setNavLabel() {
    if (!navBtn || !navBtnText) return;

    if (currentScreen === "home") {
      navBtnText.textContent = "задачи";
      navBtn.classList.remove("active");
    } else {
      navBtnText.textContent = "назад";
      navBtn.classList.add("active");
    }
  }

  safeOn(navBtn, "click", () => {
    if (currentScreen === "home") switchScreen("tasks");
    else switchScreen("home");
  });

  // старт
  document.body.classList.remove("chat-mode");
  if (screenHome) screenHome.classList.add("active");
  if (screenTasks) screenTasks.classList.remove("active");
  if (screenChat) screenChat.classList.remove("active");
  setNavLabel();

  // =========================
  // THEME
  // =========================
  function getTelegramTheme() {
    const tg = window.Telegram?.WebApp;
    if (!tg) return "light";
    return tg.colorScheme === "dark" ? "dark" : "light";
  }

  function setTheme(mode) {
    document.body.classList.toggle("dark", mode === "dark");
    localStorage.setItem(STORAGE_THEME, mode);
    lightBtn?.classList.toggle("active", mode === "light");
    darkBtn?.classList.toggle("active", mode === "dark");
  }

  setTheme(localStorage.getItem(STORAGE_THEME) || getTelegramTheme());
  safeOn(lightBtn, "click", () => setTheme("light"));
  safeOn(darkBtn, "click", () => setTheme("dark"));

  // =========================
  // DRAWER
  // =========================
  function openDrawer() {
    if (!drawer || !drawerOverlay) return;
    drawer.classList.add("open");
    drawerOverlay.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeDrawerFn() {
    if (!drawer || !drawerOverlay) return;
    drawer.classList.remove("open");
    drawerOverlay.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  safeOn(settingsBtn, "click", openDrawer);
  safeOn(drawerClose, "click", closeDrawerFn);
  safeOn(drawerOverlay, "click", closeDrawerFn);

  // =========================
  // PROFILE
  // =========================
  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(STORAGE_PROFILE) || "{}"); }
    catch { return {}; }
  }

  function saveProfile(data) {
    localStorage.setItem(STORAGE_PROFILE, JSON.stringify(data));
  }

  function fillProfileUI() {
    const tg = window.Telegram?.WebApp;
    const u = tg?.initDataUnsafe?.user;

    const nameFromTG = u
      ? [u.first_name, u.last_name].filter(Boolean).join(" ")
      : "Не в Telegram";

    const photo = u?.photo_url;

    if (profileNameEl) profileNameEl.value = nameFromTG;
    if (profileAvatarEl) profileAvatarEl.src = photo || (avatarEl?.src || "img/Avatar.svg");

    const saved = loadProfile();
    if (profileAgeEl) profileAgeEl.value = saved.age ?? "";
    if (profileNickEl) profileNickEl.value = saved.nick ?? "";
    if (profileBioEl) profileBioEl.value = saved.bio ?? "";
  }

  function persistProfileFromUI() {
    const ageRaw = (profileAgeEl?.value || "").trim();
    const age = ageRaw === "" ? null : Math.max(0, Math.min(120, Number(ageRaw)));

    const data = {
      age,
      nick: (profileNickEl?.value || "").trim(),
      bio: (profileBioEl?.value || "").trim(),
      updatedAt: Date.now()
    };
    saveProfile(data);
  }

  safeOn(profileAgeEl, "input", persistProfileFromUI);
  safeOn(profileNickEl, "input", persistProfileFromUI);
  safeOn(profileBioEl, "input", persistProfileFromUI);

  function openProfile() {
    if (!profileModal || !profileOverlay) return;
    fillProfileUI();
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

  safeOn(openProfileBtn, "click", openProfile);
  safeOn(closeProfileBtn, "click", closeProfile);
  safeOn(profileOverlay, "click", closeProfile);

  // Telegram user name + avatar on main
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

  // =========================
  // TASKS
  // =========================
  let tasks = loadTasks();

  function loadTasks() {
    try { return JSON.parse(localStorage.getItem(STORAGE_TASKS) || "[]"); }
    catch { return []; }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
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
      text.textContent = t.title;

      li.appendChild(checkbox);
      li.appendChild(text);
      tasksListEl.appendChild(li);
    });
  }

  function addTasksFromAI(list) {
    const newOnes = list.map((title) => ({
      id: crypto.randomUUID(),
      title,
      done: false,
    }));

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
  // CHATS (SESSIONS)
  // =========================
  let chats = loadChats();
  let activeChatId = loadActiveChat();
  let activeMessages = [];

  function loadChats() {
    try { return JSON.parse(localStorage.getItem(STORAGE_CHATS) || "[]"); }
    catch { return []; }
  }

  function saveChats() {
    localStorage.setItem(STORAGE_CHATS, JSON.stringify(chats));
  }

  function loadActiveChat() {
    return localStorage.getItem(STORAGE_ACTIVE_CHAT) || "";
  }

  function setActiveChat(id) {
    activeChatId = id;
    localStorage.setItem(STORAGE_ACTIVE_CHAT, id);
  }

  function getChatById(id) {
    return chats.find((c) => c.id === id);
  }

  function makeTitle(text) {
    const t = String(text || "").trim();
    if (!t) return "Чат";
    return t.length > 32 ? t.slice(0, 32) + "…" : t;
  }

  // Создать новый чат (ВСЕГДА новый)
  function startNewChat(firstUserText) {
    const id = crypto.randomUUID();
    const now = Date.now();

    const chat = {
      id,
      title: makeTitle(firstUserText),
      createdAt: now,
      updatedAt: now,
      messages: []
    };

    chats.unshift(chat);
    saveChats();
    setActiveChat(id);

    activeMessages = chat.messages;
    renderChatMessages();
    renderChatsList();
    updatePlanButtonVisibility();
  }

  // Создать чат только если активного нет/удалён
  function ensureActiveChat(firstUserText) {
    if (activeChatId && getChatById(activeChatId)) return;
    startNewChat(firstUserText);
  }

  function pushMsg(who, text) {
    const chat = getChatById(activeChatId);
    if (!chat) return;

    chat.messages.push({ who, text, ts: Date.now() });
    chat.updatedAt = Date.now();

    // если title дефолтный — берём по первому user-сообщению
    if ((!chat.title || chat.title === "Чат") && who === "user") {
      chat.title = makeTitle(text);
    }

    saveChats();

    activeMessages = chat.messages;
    renderChatMessages();
    renderChatsList();
    updatePlanButtonVisibility();
  }

  function renderChatMessages() {
    if (!chatMessages) return;
    chatMessages.innerHTML = "";

    activeMessages.forEach((m) => {
      const div = document.createElement("div");
      div.className = `msg ${m.who === "user" ? "user" : "ai"}`;
      div.textContent = m.text;
      chatMessages.appendChild(div);
    });

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

    // открыть чат
    historyListEl.querySelectorAll(".historyChat").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.open;
        const chat = getChatById(id);
        if (!chat) return;

        setActiveChat(id);
        activeMessages = chat.messages || [];
        renderChatMessages();

        closeDrawerFn();
        switchScreen("chat");
        updatePlanButtonVisibility();
      });
    });

    // удалить чат
    historyListEl.querySelectorAll(".historyDelBtn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.del;

        chats = chats.filter((c) => c.id !== id);

        if (activeChatId === id) {
          setActiveChat("");
          activeMessages = [];
          renderChatMessages();
        }

        saveChats();
        renderChatsList();
        updatePlanButtonVisibility();
      });
    });
  }

  safeOn(clearHistoryBtn, "click", () => {
    chats = [];
    saveChats();
    setActiveChat("");
    activeMessages = [];
    renderChatMessages();
    renderChatsList();
    updatePlanButtonVisibility();
  });

  // при старте подтянем активный
  if (activeChatId && getChatById(activeChatId)) {
    activeMessages = getChatById(activeChatId).messages || [];
  } else {
    activeMessages = [];
  }

  renderChatMessages();
  renderChatsList();

  // =========================
  // PLAN MODAL
  // =========================
  function openPlanModal(htmlOrNode = null) {
    if (!planOverlay || !planModal || !planContent) return;

    if (typeof htmlOrNode === "string") {
      planContent.innerHTML = htmlOrNode;
    } else if (htmlOrNode instanceof Node) {
      planContent.innerHTML = "";
      planContent.appendChild(htmlOrNode);
    }

    planOverlay.classList.add("open");
    planModal.classList.add("open");
    planModal.setAttribute("aria-hidden", "false");
  }

  function closePlanModal() {
    if (!planOverlay || !planModal) return;
    planOverlay.classList.remove("open");
    planModal.classList.remove("open");
    planModal.setAttribute("aria-hidden", "true");
  }

  safeOn(closePlanBtn, "click", closePlanModal);
  safeOn(planOverlay, "click", closePlanModal);

  // =========================
  // HISTORY PAYLOAD for SERVER
  // =========================
  function buildHistoryPayload(limit = 40) {
    const chat = getChatById(activeChatId);
    const msgs = (chat?.messages || []).slice(-limit);

    const history = msgs.map((m) => ({
      role: m.who === "user" ? "user" : "assistant",
      content: m.text
    }));

    const transcript = msgs
      .map((m) => (m.who === "user" ? "User: " : "AI: ") + m.text)
      .join("\n");

    return { history, transcript };
  }

  // =========================
  // PLAN BUTTON VISIBILITY
  // =========================
  function updatePlanButtonVisibility() {
    if (!planBtn) return;
    const chat = getChatById(activeChatId);
    const ok = chat && chat.messages && chat.messages.length >= 2;
    planBtn.hidden = !ok;
  }

  updatePlanButtonVisibility();

  // =========================
  // RENDER PLAN CARDS (accept/reject)
  // =========================
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

      const tasksInCard = Array.isArray(card?.tasks) ? card.tasks : [];
      const taskTexts = [];

      tasksInCard.forEach((t) => {
        const txt = (t && (t.t || t.text || t.title)) ? String(t.t || t.text || t.title) : (t ? String(t) : "");
        if (!txt) return;

        taskTexts.push(txt);

        const li = document.createElement("li");
        li.className = "cardTask";

        const left = document.createElement("div");
        left.textContent = txt;

        const right = document.createElement("div");
        right.className = "taskMeta";
        right.textContent = (t && (t.time || t.tag)) ? String(t.time || t.tag) : "";

        li.appendChild(left);
        li.appendChild(right);
        ul.appendChild(li);
      });

      const actions = document.createElement("div");
      actions.className = "cardActions";

      const accept = document.createElement("button");
      accept.className = "cardBtn accept";
      accept.type = "button";
      accept.textContent = "Принять";

      const reject = document.createElement("button");
      reject.className = "cardBtn reject";
      reject.type = "button";
      reject.textContent = "Отклонить";

      accept.addEventListener("click", () => {
        if (taskTexts.length) addTasksFromAI(taskTexts);
        box.style.opacity = "0.6";
        accept.disabled = true;
        reject.disabled = true;
        accept.textContent = "Принято ✅";
      });

      reject.addEventListener("click", () => {
        box.style.opacity = "0.35";
        accept.disabled = true;
        reject.disabled = true;
        reject.textContent = "Отклонено ❌";
      });

      actions.appendChild(accept);
      actions.appendChild(reject);

      box.appendChild(title);
      box.appendChild(ul);
      box.appendChild(actions);

      wrap.appendChild(box);
    });

    return wrap;
  }

  // =========================
  // SEND TO AI (CHAT MODE)
  // =========================
async function sendToAI() {
  if (isLoading) return;

  const text = (promptEl?.value || "").trim();
  if (!text) return;

  // ✅ если отправили НЕ из экрана чата — начинаем НОВЫЙ чат
  if (currentScreen !== "chat") startNewChat(text);
  else ensureActiveChat(text);

  switchScreen("chat");

  // ✅ сохраняем сообщение пользователя в локальный чат
  pushMsg("user", text);

  if (promptEl) promptEl.value = "";

  const tg_id = getTgIdOrNull();
  if (!tg_id) {
    pushMsg("ai", "Ошибка: tg_id_required (открой мини-апп внутри Telegram)");
    return;
  }

  isLoading = true;
  if (sendBtn) sendBtn.disabled = true;
  if (chatTyping) chatTyping.hidden = false;

  try {
    const profile = loadProfile();
    const { history, transcript } = buildHistoryPayload(80);

    const res = await fetch(`${API_BASE}/api/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tg_id,
        mode: "chat",
        text,
        profile,
        history,
        transcript,
      }),
    });

    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); }
    catch {
      pushMsg("ai", "Ошибка: сервер вернул не JSON.");
      return;
    }

    if (!res.ok) {
      pushMsg("ai", "Ошибка AI: " + (data?.error || data?.message || "bad response"));
      return;
    }

    const answer = (typeof data?.text === "string" ? data.text.trim() : "");
    pushMsg("ai", answer || "AI вернул пустой ответ 😶");

    updatePlanButtonVisibility();
  } catch (e) {
    console.log(e);
    pushMsg("ai", "Ошибка: не удалось подключиться к серверу.");
  } finally {
    if (chatTyping) chatTyping.hidden = true;
    isLoading = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}


  safeOn(sendBtn, "click", sendToAI);

  safeOn(promptEl, "keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendToAI();
    }
  });

  // =========================
  // CREATE PLAN (PLAN MODE) — ONLY BY BUTTON
  // =========================
  async function createPlanFromChat() {
    if (isLoading) return;

    const chat = getChatById(activeChatId);
    if (!chat || !chat.messages || chat.messages.length < 2) {
      pushMsg("ai", "Пока мало переписки для плана 🙂");
      return;
    }

    isLoading = true;
    planBtn.disabled = true;

    try {
const tg_id = getTgIdOrNull();
if (!tg_id) {
  openPlanModal("<div class='historyItem'>Ошибка: tg_id_required (открой внутри Telegram)</div>");
  return;
}

const res = await fetch(`${API_BASE}/api/plan`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tg_id,
    mode: "plan",
    text: "Сделай план на основе диалога и верни карточки задач.",
    profile,
    history,
    transcript
  })
});


      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); }
      catch {
        openPlanModal("<div class='historyItem'>Ошибка: сервер вернул не JSON.</div>");
        return;
      }

      if (!res.ok) {
        openPlanModal("<div class='historyItem'>Ошибка плана: " + (data?.error || data?.message || "bad response") + "</div>");
        return;
      }

      const cards = Array.isArray(data?.cards) ? data.cards : [];
      if (!cards.length) {
        openPlanModal("<div class='historyItem'>План пустой. Напиши больше деталей в чате 🙂</div>");
        return;
      }

      openPlanModal(renderPlanCards(cards));
    } catch (e) {
      console.log(e);
      openPlanModal("<div class='historyItem'>Ошибка: не удалось подключиться к серверу.</div>");
    } finally {
      isLoading = false;
      planBtn.disabled = false;
    }
  }


  function updatePlanButton() {
  if (!planBtn) return;

  const enough = Array.isArray(activeMessages) && activeMessages.length >= 2;
  const inChat = currentScreen === "chat";

  // показываем только если мы в чате и есть хотя бы 2 сообщения
  planBtn.hidden = !(inChat && enough);
}


  safeOn(planBtn, "click", createPlanFromChat);

  // =========================
  // EXPORT (если нужно)
  // =========================
  window.LSD = {
    startNewChat,
    getActiveChatId: () => activeChatId
  };
});

