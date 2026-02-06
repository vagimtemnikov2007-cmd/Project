// LSD Front — OPTIMIZED STABLE VERSION
// Handles all UI, Data, and Sync logic

window.addEventListener("DOMContentLoaded", () => {
  // =========================
  // UTILITIES & HELPERS
  // =========================
  const $ = (id) => document.getElementById(id);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // Safe storage wrapper
  const sGet = (k, def) => {
    try { return localStorage.getItem(k) || def; } catch { return def; }
  };
  const sSet = (k, v) => {
    try { localStorage.setItem(k, v); } catch {}
  };
  const sJSONGet = (k, def) => {
    try { return JSON.parse(sGet(k, null)) || def; } catch { return def; }
  };
  const sJSONSet = (k, v) => sSet(k, JSON.stringify(v));

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function fmtTime(ts) {
    const d = new Date(ts || Date.now());
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  // =========================
  // TELEGRAM INIT
  // =========================
  const tg = window.Telegram?.WebApp;
  let tg_id = null;

  try {
    tg?.ready();
    tg?.expand();
    // Enable closing confirmation if needed
    // tg?.enableClosingConfirmation(); 
    tg_id = tg?.initDataUnsafe?.user?.id;
  } catch (e) {
    console.warn("Telegram API not ready", e);
  }

  const tgPopup = (msg) => {
    tg?.showPopup ? tg.showPopup({ message: String(msg) }) : alert(msg);
  };

  // =========================
  // STATE MANAGEMENT
  // =========================
  const API_BASE = "https://lsd-server-ml3z.onrender.com";
  
  // State variables
  let currentScreen = "home";
  let isLoading = false;
  let points = Number(sGet("lsd_points", 0));
  let activeChatId = sGet("lsd_active_chat", uuid());
  let chatCache = sJSONGet("lsd_chat_cache", {});
  let chatsIndex = sJSONGet("lsd_chats_index", [activeChatId]);
  let tasksState = sJSONGet("lsd_tasks", { groups: [] });
  let selectedPlan = "year";

  // Ensure active chat exists
  if (!chatCache[activeChatId]) {
    chatCache[activeChatId] = { messages: [], meta: { title: "Новый чат", emoji: "💬" } };
    sJSONSet("lsd_chat_cache", chatCache);
  }

  // =========================
  // UI REFERENCES
  // =========================
  const els = {
    screens: {
      home: $("screen-home"),
      tasks: $("screen-tasks"),
      chat: $("screen-chat"),
      sub: $("screen-subscription")
    },
    nav: $("navBtn"),
    drawer: {
      btn: $("openDrawer"),
      el: $("settingsDrawer"),
      overlay: $("drawerOverlay"),
      name: $("drawerName"),
      avatar: $("drawerAvatar"),
      themeBtn: $("themeMiniBtn")
    },
    chat: {
      msgs: $("chatMessages"),
      input: $("prompt"),
      send: $("sendBtn"),
      typing: $("chatTyping")
    },
    tasks: {
      list: $("tasksList"),
      points: $("pointsValue"),
      progressFill: $("progressFill"),
      progressPct: $("progressPercent")
    },
    modals: {
      profile: $("profileModal"),
      profileOverlay: $("profileOverlay"),
      plan: $("planModal"),
      planOverlay: $("planOverlay"),
      planContent: $("planContent")
    },
    sub: {
      close: $("subscriptionClose"),
      upgrade: $("upgradeBtn"), // In profile
      btn: $("lsdSubscribeBtn"),
      price: $("lsdCtaPrice")
    },
    attach: {
      el: $("attach"),
      btn: $("plusBtn"),
      panel: $("attach")?.querySelector(".attach__panel")
    }
  };

  // =========================
  // CORE FUNCTIONS
  // =========================

  // --- Navigation ---
  function switchScreen(name) {
    Object.values(els.screens).forEach(el => el?.classList.remove("active", "open"));
    
    // Special handling for subscription (it's a modal-like screen)
    if (name === 'sub') {
      els.screens.sub?.classList.add("open");
    } else {
      els.screens.sub?.classList.remove("open");
      els.screens[name]?.classList.add("active");
    }
    
    currentScreen = name;
    
    // Update Nav Button Text
    const span = els.nav?.querySelector("span");
    if (span) span.textContent = name === "home" ? "задачи" : "назад";

    // Scroll chat to bottom
    if (name === "chat") setTimeout(scrollToBottom, 100);
    
    // UI Updates
    updatePointsUI();
  }

  // --- Chat Logic ---
  function renderMessages() {
    if (!els.chat.msgs) return;
    const chat = chatCache[activeChatId] || { messages: [] };
    
    els.chat.msgs.innerHTML = chat.messages.map(m => `
      <div class="msg ${m.role === 'user' ? 'user' : 'ai'}">
        ${m.content.replace(/</g, "&lt;")}
      </div>
    `).join("");
    
    scrollToBottom();
  }

  function scrollToBottom() {
    if (els.chat.msgs) els.chat.msgs.scrollTop = els.chat.msgs.scrollHeight;
  }

  async function sendMessage() {
    const text = els.chat.input?.value.trim();
    if (!text || isLoading) return;
    
    isLoading = true;
    els.chat.input.value = "";
    switchScreen("chat");

    // Optimistic UI
    const userMsg = { role: "user", content: text, id: uuid(), ts: Date.now() };
    chatCache[activeChatId].messages.push(userMsg);
    renderMessages();
    sJSONSet("lsd_chat_cache", chatCache);

    if (els.chat.typing) els.chat.typing.hidden = false;

    try {
      // Mock API call if no real backend, or fetch real one
      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tg_id: tg_id || 12345, // Fallback ID for testing
          chat_id: activeChatId, 
          text: text 
        })
      });

      const data = await res.json();
      
      const aiMsg = { 
        role: "assistant", 
        content: data.text || data.error || "Нет ответа от сервера", 
        id: uuid(), 
        ts: Date.now() 
      };
      
      chatCache[activeChatId].messages.push(aiMsg);
      renderMessages();
      sJSONSet("lsd_chat_cache", chatCache);

    } catch (e) {
      chatCache[activeChatId].messages.push({ role: "assistant", content: "Ошибка сети. Попробуй позже.", id: uuid() });
      renderMessages();
    } finally {
      isLoading = false;
      if (els.chat.typing) els.chat.typing.hidden = true;
    }
  }

  // --- Tasks Logic ---
  function renderTasks() {
    if (!els.tasks.list) return;
    els.tasks.list.innerHTML = "";
    
    let total = 0, done = 0;

    tasksState.groups.forEach(group => {
      const gEl = document.createElement("li");
      gEl.className = "taskGroup";
      
      const itemsHtml = group.items.map((item, idx) => {
        total++;
        if (item.done) done++;
        return `
        <div class="taskRow ${item.done ? 'done' : ''}" data-g="${group.id}" data-i="${idx}">
          <div class="taskRowLeft">
            <input type="checkbox" ${item.done ? 'checked' : ''} class="taskCheck">
            <span class="taskRowText">${item.text}</span>
          </div>
        </div>`;
      }).join("");

      gEl.innerHTML = `
        <div class="taskGroupHead ${group.open ? 'open' : ''}">
          <div class="taskGroupTitle">${group.title}</div>
          <div class="taskGroupMeta">
             <span class="metaPill">${group.items.filter(i=>i.done).length}/${group.items.length}</span>
          </div>
        </div>
        <div class="taskGroupBody ${group.open ? 'open' : ''}">${itemsHtml}</div>
      `;

      // Toggle group
      gEl.querySelector(".taskGroupHead").addEventListener("click", () => {
        group.open = !group.open;
        sJSONSet("lsd_tasks", tasksState);
        renderTasks();
      });

      // Check items
      gEl.querySelectorAll(".taskCheck").forEach((cb, idx) => {
        cb.addEventListener("change", (e) => {
          e.stopPropagation(); // prevent group toggle
          group.items[idx].done = cb.checked;
          if (cb.checked) {
             points += 10;
             sSet("lsd_points", points);
             updatePointsUI();
          }
          sJSONSet("lsd_tasks", tasksState);
          renderTasks();
        });
      });

      els.tasks.list.appendChild(gEl);
    });

    // Update Progress Widget
    if (els.tasks.progressFill) {
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      els.tasks.progressFill.style.width = `${pct}%`;
      if (els.tasks.progressPct) els.tasks.progressPct.textContent = `${pct}%`;
    }
    
    // Stats
    $("completedCount").textContent = done;
    $("totalCount").textContent = total;
  }

  function updatePointsUI() {
    if (els.tasks.points) els.tasks.points.textContent = points;
  }

  // =========================
  // EVENTS & LISTENERS
  // =========================

  // Nav Switch
  on(els.nav, "click", () => {
    switchScreen(currentScreen === "home" ? "tasks" : "home");
  });

  // Drawer
  on(els.drawer.btn, "click", () => {
    els.drawer.el?.classList.add("open");
    els.drawer.overlay?.classList.add("open");
  });
  const closeDrawer = () => {
    els.drawer.el?.classList.remove("open");
    els.drawer.overlay?.classList.remove("open");
  };
  on(els.drawer.overlay, "click", closeDrawer);

  // Chat Input
  on(els.chat.send, "click", sendMessage);
  on(els.chat.input, "keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Theme Toggle
  on(els.drawer.themeBtn, "click", () => {
    document.body.classList.toggle("dark");
    // Change icon based on theme
    const isDark = document.body.classList.contains("dark");
    els.drawer.themeBtn.textContent = isDark ? "☀️" : "🌙";
  });

  // Profile Modal
  on($("menuProfile"), "click", () => {
    closeDrawer();
    els.modals.profile?.classList.add("open");
    els.modals.profileOverlay?.classList.add("open");
  });
  const closeProfile = () => {
    els.modals.profile?.classList.remove("open");
    els.modals.profileOverlay?.classList.remove("open");
  };
  on($("closeProfile"), "click", closeProfile);
  on(els.modals.profileOverlay, "click", closeProfile);

  // Subscription Screen
  const openSub = () => switchScreen("sub");
  on(els.sub.upgrade, "click", openSub);
  on(els.sub.close, "click", () => switchScreen("home"));
  
  // Premium Plan Selection
  const planRadios = document.querySelectorAll('input[name="lsd_plan"]');
  planRadios.forEach(r => {
    r.addEventListener("change", (e) => {
      selectedPlan = e.target.value;
      if (els.sub.price) {
        els.sub.price.textContent = selectedPlan === "year" ? "1990 ⭐" : "199 ⭐";
      }
    });
  });

  // Attach Menu
  on(els.attach.btn, "click", (e) => {
    e.stopPropagation();
    els.attach.el?.classList.toggle("is-open");
  });
  on(document, "click", (e) => {
    if (!e.target.closest(".attach__panel") && !e.target.closest(".plus")) {
      els.attach.el?.classList.remove("is-open");
    }
  });

  // Plan Button (Create Plan)
  on($("planBtn"), "click", async () => {
     // Mock Plan Creation
     switchScreen("chat");
     chatCache[activeChatId].messages.push({ role: "assistant", content: "Генерирую план...", id: uuid() });
     renderMessages();
     
     setTimeout(() => {
        const newGroup = {
          id: uuid(),
          title: "План на сегодня",
          open: true,
          items: [
             { text: "Закончить проект", done: false },
             { text: "Прочитать статью", done: false }
          ]
        };
        tasksState.groups.unshift(newGroup);
        sJSONSet("lsd_tasks", tasksState);
        renderTasks();
        chatCache[activeChatId].messages.push({ role: "assistant", content: "План создан! Проверь вкладку Задачи.", id: uuid() });
        renderMessages();
     }, 1500);
  });

  // Clear Logic
  on($("clearTasks"), "click", () => {
    if(confirm("Удалить все задачи?")) {
      tasksState.groups = [];
      sJSONSet("lsd_tasks", tasksState);
      renderTasks();
    }
  });

  on($("clearHistory"), "click", () => {
     if(confirm("Очистить историю чата?")) {
       chatCache[activeChatId].messages = [];
       sJSONSet("lsd_chat_cache", chatCache);
       renderMessages();
     }
  });

  // =========================
  // INIT
  // =========================
  // Set User Info
  if (els.drawer.name && tg?.initDataUnsafe?.user) {
    els.drawer.name.textContent = tg.initDataUnsafe.user.first_name;
    $("user").textContent = tg.initDataUnsafe.user.first_name;
  }
  
  // Initial Renders
  renderTasks();
  renderMessages();
  updatePointsUI();

  console.log("LSD App Initialized");
});