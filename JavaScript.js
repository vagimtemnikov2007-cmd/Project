function getTelegramTheme() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return "light";
  return tg.colorScheme === "dark" ? "dark" : "light";
}

// ---------- SCREEN SWITCH ----------
const tabHome = document.getElementById("tabHome");
const tabTasks = document.getElementById("tabTasks");

const screenHome = document.getElementById("screen-home");
const screenTasks = document.getElementById("screen-tasks");

function showScreen(name) {
  // screens
  screenHome.classList.toggle("active", name === "home");
  screenTasks.classList.toggle("active", name === "tasks");

  // tabs
  tabHome.classList.toggle("active", name === "home");
  tabTasks.classList.toggle("active", name === "tasks");
}

tabHome.addEventListener("click", () => showScreen("home"));
tabTasks.addEventListener("click", () => showScreen("tasks"));

// ---------- TELEGRAM USER ----------
const tg = window.Telegram?.WebApp;
const userEl = document.getElementById("user");
const avatarEl = document.getElementById("avatar");

if (!tg) {
  userEl.innerText = "Открой это внутри Telegram WebApp 🙂";
} else {
  tg.ready();
  tg.expand();

  const user = tg.initDataUnsafe?.user;
  const firstName = user?.first_name ?? "друг";
  userEl.innerText = "Привет, " + firstName;

  const photoUrl = user?.photo_url;
  if (photoUrl) avatarEl.src = photoUrl;
}

// ---------- TASKS STATE ----------
const STORAGE_KEY = "lsd_tasks_v1";
const tasksListEl = document.getElementById("tasksList");
const clearBtn = document.getElementById("clearTasks");

let tasks = loadTasks();

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function renderTasks() {
  tasksListEl.innerHTML = "";

  tasks.forEach((t) => {
    const li = document.createElement("li");
    li.className = "taskItem" + (t.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = t.done;

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

clearBtn.addEventListener("click", () => {
  tasks = [];
  saveTasks();
  renderTasks();
});

renderTasks();

// ---------- "AI" SEND (ПОКА ЗАГЛУШКА) ----------
const promptEl = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");

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

async function fakeAI(text) {
  // 1) если ввёл через запятую — превратим в задачи
  const parts = text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts;

  // 2) иначе — пример
  return [
    "Выбрать 1 главную задачу на сегодня",
    "25 минут фокуса",
    "5 минут отдых без телефона",
  ];
}

sendBtn.addEventListener("click", async () => {
  const text = promptEl.value.trim();
  if (!text) return;

  // получаем "ответ AI"
  const result = await fakeAI(text);

  // сохраняем задачи
  addTasksFromAI(result);

  // очищаем ввод
  promptEl.value = "";

  // переходим в задачи (по желанию)
  showScreen("tasks");
});

// Enter отправляет тоже
promptEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendBtn.click();
  }
});

// ---------- SETTINGS SHEET ----------
// ---- Drawer open/close ----
const settingsBtn = document.querySelector(".settings_bt");
const drawer = document.getElementById("settingsDrawer");
const overlay = document.getElementById("drawerOverlay");
const closeBtn = document.getElementById("drawerClose");

function openDrawer() {
  drawer.classList.add("open");
  overlay.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  drawer.classList.remove("open");
  overlay.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

settingsBtn.addEventListener("click", openDrawer);
closeBtn.addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);

// ---- Theme ----
const THEME_KEY = "lsd_theme";
const lightBtn = document.getElementById("lightBtn");
const darkBtn = document.getElementById("darkBtn");

function setTheme(mode) {
  document.body.classList.toggle("dark", mode === "dark");
  localStorage.setItem(THEME_KEY, mode);
  lightBtn.classList.toggle("active", mode === "light");
  darkBtn.classList.toggle("active", mode === "dark");
}

lightBtn.addEventListener("click", () => setTheme("light"));
darkBtn.addEventListener("click", () => setTheme("dark"));
const savedTheme = localStorage.getItem(THEME_KEY);

if (savedTheme) {
  setTheme(savedTheme);
} else {
  setTheme(getTelegramTheme());
}

// ---- History ----
const HISTORY_KEY = "lsd_history_v1";
const historyListEl = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");

let history = loadHistory();

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}
function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderHistory() {
  historyListEl.innerHTML = "";
  if (history.length === 0) {
    historyListEl.innerHTML = `<div class="historyItem">История пока пустая.</div>`;
    return;
  }
  history.forEach((item) => {
    const div = document.createElement("div");
    div.className = "historyItem";
    div.innerHTML = `
      <div>${escapeHtml(item.text)}</div>
      <div class="historyTime">${new Date(item.ts).toLocaleString()}</div>
    `;
    historyListEl.appendChild(div);
  });
}

function addToHistory(text) {
  history.unshift({ text, ts: Date.now() });
  history = history.slice(0, 50);
  saveHistory();
  renderHistory();
}

clearHistoryBtn.addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
});

renderHistory();

// ---------- PROFILE ----------
const PROFILE_KEY = "lsd_profile_v1";

const openProfileBtn = document.getElementById("openProfile");
const profileModal = document.getElementById("profileModal");
const profileOverlay = document.getElementById("profileOverlay");
const closeProfileBtn = document.getElementById("closeProfile");

const profileAvatarEl = document.getElementById("profileAvatar");
const profileNameEl = document.getElementById("profileName");
const profileUsernameEl = document.getElementById("profileUsername");
const profileAgeEl = document.getElementById("profileAge");
const profileNickEl = document.getElementById("profileNick");
const profileBioEl = document.getElementById("profileBio");
const saveProfileBtn = document.getElementById("saveProfile");

function openProfile() {
  profileModal.classList.add("open");
  profileOverlay.classList.add("open");
  profileModal.setAttribute("aria-hidden", "false");
}

function closeProfile() {
  profileModal.classList.remove("open");
  profileOverlay.classList.remove("open");
  profileModal.setAttribute("aria-hidden", "true");
}

openProfileBtn.addEventListener("click", openProfile);
closeProfileBtn.addEventListener("click", closeProfile);
profileOverlay.addEventListener("click", closeProfile);

// load/save
function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

// Fill from Telegram + local profile
function fillProfileUI() {
  const tg = window.Telegram?.WebApp;
  const u = tg?.initDataUnsafe?.user;

  const nameFromTG = u ? [u.first_name, u.last_name].filter(Boolean).join(" ") : "Не в Telegram";
  const usernameFromTG = u?.username ? "@" + u.username : "—";
  const photo = u?.photo_url;

  profileNameEl.value = nameFromTG;
  profileUsernameEl.value = usernameFromTG;

  // аватар в профиле = тот же, что и в шапке
  if (photo) {
    profileAvatarEl.src = photo;
  } else {
    profileAvatarEl.src = document.getElementById("avatar").src;
  }

  const saved = loadProfile();
  profileAgeEl.value = saved.age ?? "";
  profileNickEl.value = saved.nick ?? "";
  profileBioEl.value = saved.bio ?? "";
}

saveProfileBtn.addEventListener("click", () => {
  const ageRaw = profileAgeEl.value.trim();
  const age = ageRaw === "" ? null : Math.max(0, Math.min(120, Number(ageRaw)));

  const data = {
    age,
    nick: profileNickEl.value.trim(),
    bio: profileBioEl.value.trim(),
    updatedAt: Date.now()
  };

  saveProfile(data);
  closeProfile();
});

// заполняем при старте и при открытии
fillProfileUI();
openProfileBtn.addEventListener("click", fillProfileUI);

// ВАЖНО: вызывай addToHistory(text) там, где отправляешь запрос AI
window.LSD_addToHistory = addToHistory;
