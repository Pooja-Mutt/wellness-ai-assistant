(function () {
  const script = document.currentScript;
  const API_BASE = (script && script.getAttribute("data-api-url")) || window.location.origin;
  const STORAGE_KEY = "wa_session_id";

  const SUGGESTIONS = [
    "Why am I always tired?",
    "How much water should I drink daily?",
    "How can I improve my sleep?",
  ];

  const GREETING =
    "Hi! I'm your Wellness Assistant. I can help with general questions about nutrition, exercise, sleep, and healthy habits. What's on your mind?";

  function el(tag, className, html) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function getSessionId() {
    let id = localStorage.getItem(STORAGE_KEY);
    return id || null;
  }

  function setSessionId(id) {
    localStorage.setItem(STORAGE_KEY, id);
  }

  function buildUI() {
    const launcher = el(
      "button",
      null,
      '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.02 2 11c0 2.4 1.08 4.57 2.86 6.19L4 22l5.1-1.4c.92.25 1.9.4 2.9.4 5.52 0 10-4.02 10-9S17.52 2 12 2z"/></svg>'
    );
    launcher.id = "wa-launcher";
    launcher.setAttribute("aria-label", "Open wellness chat");

    const win = el("div");
    win.id = "wa-window";

    const header = el("div");
    header.id = "wa-header";
    header.innerHTML = `
      <div class="wa-avatar">💬</div>
      <div>
        <div class="wa-title">Wellness Assistant</div>
        <div class="wa-subtitle">General health &amp; wellness info</div>
      </div>
      <button class="wa-close" aria-label="Close chat">×</button>
    `;

    const disclaimer = el(
      "div",
      null,
      "This assistant provides general wellness information only and is not a substitute for professional medical advice, diagnosis, or treatment. For personal or urgent concerns, please consult a healthcare provider."
    );
    disclaimer.id = "wa-disclaimer";

    const messages = el("div");
    messages.id = "wa-messages";

    const suggestions = el("div", "wa-suggestions");
    SUGGESTIONS.forEach((q) => {
      const chip = el("button", "wa-chip", q);
      chip.addEventListener("click", () => sendMessage(q));
      suggestions.appendChild(chip);
    });

    const inputRow = el("div");
    inputRow.id = "wa-input-row";
    const input = el("textarea");
    input.id = "wa-input";
    input.rows = 1;
    input.placeholder = "Ask a health or wellness question...";
    const sendBtn = el(
      "button",
      null,
      '<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>'
    );
    sendBtn.id = "wa-send";

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    win.appendChild(header);
    win.appendChild(disclaimer);
    win.appendChild(messages);
    win.appendChild(suggestions);
    win.appendChild(inputRow);

    document.body.appendChild(launcher);
    document.body.appendChild(win);

    function open() {
      win.classList.add("wa-open");
      input.focus();
    }
    function close() {
      win.classList.remove("wa-open");
    }
    launcher.addEventListener("click", () => {
      win.classList.contains("wa-open") ? close() : open();
    });
    header.querySelector(".wa-close").addEventListener("click", close);

    function addMessage(text, who) {
      const bubble = el("div", `wa-msg wa-msg-${who}`, escapeHtml(text));
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
      return bubble;
    }

    function escapeHtml(str) {
      const d = document.createElement("div");
      d.innerText = str;
      return d.innerHTML;
    }

    function showTyping() {
      const t = el("div", "wa-typing", "<span></span><span></span><span></span>");
      t.id = "wa-typing-indicator";
      messages.appendChild(t);
      messages.scrollTop = messages.scrollHeight;
      return t;
    }

    let sending = false;

    async function sendMessage(text) {
      const trimmed = (text || input.value).trim();
      if (!trimmed || sending) return;
      sending = true;
      sendBtn.disabled = true;
      suggestions.style.display = "none";

      addMessage(trimmed, "user");
      input.value = "";

      const typingEl = showTyping();

      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, session_id: getSessionId() }),
        });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        setSessionId(data.session_id);
        typingEl.remove();
        addMessage(data.reply, "bot");
      } catch (err) {
        typingEl.remove();
        addMessage(
          "Sorry, I'm having trouble responding right now. Please try again in a moment.",
          "bot"
        );
      } finally {
        sending = false;
        sendBtn.disabled = false;
      }
    }

    sendBtn.addEventListener("click", () => sendMessage());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    addMessage(GREETING, "bot");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }
})();
