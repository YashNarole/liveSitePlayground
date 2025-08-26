# Einstein Agent Chat — split into `index.html`, `styles.css`, and `app.js`

> Drop these three files in the same folder and open `index.html`.

---

## `index.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Einstein Agent Chat • Vanilla JS</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <span class="dot" id="conn-dot" title="Ready"></span>
    <h1>Einstein Agent Chat (Salesforce API)</h1>
  </header>

  <section class="settings">
    <input id="sessionId" placeholder="SESSION_ID (required)" />
    <input id="accessToken" placeholder="ACCESS_TOKEN (required)" />
    <button id="saveCreds" title="Save to this tab only">Apply</button>
  </section>

  <main id="chat" aria-live="polite" aria-busy="false">
    <div class="msg ai">
      <div class="avatar">EA</div>
      <div>
        <div class="bubble">
          Hi! I'm wired up to the Einstein Agent Messages API.
          Provide your SESSION_ID and ACCESS_TOKEN above, then ask me something like:
          “Show me the cases associated with Lauren Bailey.”
        </div>
        <div class="meta">Tip: your credentials are only kept in-memory for this tab.</div>
      </div>
    </div>
  </main>

  <form class="composer" id="composer">
    <textarea id="input" placeholder="Type your message… (Ctrl/Cmd+Enter to send)"></textarea>
    <button id="mic" type="button" aria-pressed="false" title="Start voice input">🎤</button>
    <button id="send" type="submit">Send</button>
  </form>

  <script src="app.js"></script>
</body>
</html>
```

---

## `styles.css`

```css
:root {
  --bg: #0b1020;
  --panel: #121933;
  --muted: #9aa3b2;
  --text: #e8ecf3;
  --accent: #7aa2ff;
  --ok: #24c38b;
  --err: #ff6b6b;
  --bubble: #1a2347;
  --user: #20315e;
}
html, body { height: 100%; }
body {
  margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  background: radial-gradient(1400px 800px at 80% -100px, #1d2c5b 0%, transparent 50%), var(--bg);
  color: var(--text);
  display: grid; grid-template-rows: auto 1fr auto; gap: 12px;
}
header {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: transparent; border-bottom: 1px solid #1e274b;
}
header .dot { width: 10px; height: 10px; border-radius: 999px; background: var(--ok); box-shadow: 0 0 12px var(--ok); }
header h1 { font-size: 15px; margin: 0; opacity: .9; letter-spacing: .4px; }

.settings {
  display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; padding: 0 16px 6px; align-items: center;
}
.settings input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #27305e; background: #0f1634; color: var(--text); outline: none; }
.settings input::placeholder { color: #6e7792; }
.settings button { padding: 10px 14px; border-radius: 10px; border: 1px solid #27305e; background: #16214a; color: var(--text); cursor: pointer; }

#chat {
  padding: 16px; margin: 0 auto; width: min(900px, 100%);
  display: flex; flex-direction: column; gap: 12px; overflow-y: auto; height: 100%; box-sizing: border-box;
}

.msg { display: grid; grid-template-columns: 36px 1fr; gap: 10px; align-items: start; }
.avatar { width: 36px; height: 36px; border-radius: 14px; display: grid; place-items: center; font-weight: 700; font-size: 14px; }
.ai .avatar { background: #16214a; color: var(--accent); }
.me .avatar { background: #1a254e; color: #c8d3ff; }

.bubble { padding: 12px 14px; background: var(--bubble); border: 1px solid #253066; border-radius: 14px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
.me .bubble { background: var(--user); }
.meta { font-size: 11px; color: var(--muted); margin-top: 4px; }

.composer { display: grid; grid-template-columns: 1fr auto auto;  gap: 10px; padding: 8px 16px 16px; background: linear-gradient(transparent, rgba(0,0,0,.15));
}
.composer textarea {
  resize: none; min-height: 52px; max-height: 160px; padding: 14px 14px; border-radius: 14px; border: 1px solid #27305e; background: #0f1634; color: var(--text); outline: none;
}
.composer button { border-radius: 14px; border: 1px solid #27305e; background: var(--accent); color: #0a0f22; font-weight: 700; cursor: pointer; min-height: 52px; }
.composer button[disabled] { opacity: .6; cursor: not-allowed; }
#mic { min-width: 52px; }
#mic.recording { background: var(--err); color: #fff; box-shadow: 0 0 0 3px rgba(255,107,107,.25); animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

.badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background: #122053; border: 1px solid #27376f; color: #cfd6ff; font-size: 12px; }
.hide { display: none; }
```

---

## `app.js`

```js
// Minimal vanilla JS client for Salesforce Einstein Agent Messages API
// POST https://api.salesforce.com/einstein/ai-agent/v1/sessions/{SESSION_ID}/messages
// Body: { message: { sequenceId, type: "Text", text } }
// Response: { messages: [{ message: string, ... }] }

const els = {
  chat: document.getElementById('chat'),
  input: document.getElementById('input'),
  send: document.getElementById('send'),
  composer: document.getElementById('composer'),
  sessionId: document.getElementById('sessionId'),
  accessToken: document.getElementById('accessToken'),
  saveCreds: document.getElementById('saveCreds'),
  dot: document.getElementById('conn-dot'),
  mic: document.getElementById('mic'),
};

// In-memory state only
const state = { sessionId: '', accessToken: '', sequenceId: 1, sending: false, isRecording: false, recognition: null };

els.saveCreds.addEventListener('click', () => {
  state.sessionId = els.sessionId.value.trim();
  state.accessToken = els.accessToken.value.trim();
  pulseDot('ok');
});

function pulseDot(kind = 'ok') {
  const root = getComputedStyle(document.documentElement);
  const color = kind === 'err' ? root.getPropertyValue('--err') : root.getPropertyValue('--ok');
  els.dot.style.background = color;
  els.dot.style.boxShadow = `0 0 12px ${color}`;
}

function escapeHtml(str) {
  return str.replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s]));
}

function addMessage({ role, text }) {
  const item = document.createElement('div');
  item.className = `msg ${role === 'user' ? 'me' : 'ai'}`;
  item.innerHTML = `
    <div class="avatar">${role === 'user' ? 'You' : 'EA'}</div>
    <div>
      <`;
  item.innerHTML = `
    <div class="avatar">${role === 'user' ? 'You' : 'EA'}</div>
    <div>
      <div class="bubble">${escapeHtml(text)}</div>
      <div class="meta">${new Date().toLocaleTimeString()}</div>
    </div>`;
  els.chat.appendChild(item);
  els.chat.scrollTop = els.chat.scrollHeight;
  return item;
}

function setBusy(isBusy) {
  els.chat.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  els.send.disabled = isBusy;
  state.sending = isBusy;
}

async function callEinsteinAPI(userText) {
  if (!state.sessionId || !state.accessToken) {
    throw new Error('Please provide SESSION_ID and ACCESS_TOKEN, then click Apply.');
  }

  const url = `https://api.salesforce.com/einstein/ai-agent/v1/sessions/${encodeURIComponent(state.sessionId)}/messages`;
  const body = {
    message: {
      sequenceId: state.sequenceId++,
      type: 'Text',
      text: userText
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.accessToken}`,
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

function extractAssistantMessage(apiJson) {
  try {
    if (Array.isArray(apiJson.messages) && apiJson.messages.length) {
      const chunks = apiJson.messages
        .map(m => typeof m.message === 'string' ? m.message : '')
        .filter(Boolean);
      return chunks.join('\n\n');
    }
  } catch (e) { /* ignore and fallthrough */ }
  return '[No message returned]';
}

// Send handlers
els.composer.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = els.input.value.trim();
  if (!text || state.sending) return;

  addMessage({ role: 'user', text });
  els.input.value = '';

  const thinking = addMessage({ role: 'assistant', text: '…thinking' });
  thinking.querySelector('.bubble').classList.add('badge');
  setBusy(true);
  pulseDot('ok');

  try {
    const json = await callEinsteinAPI(text);
    const assistantText = extractAssistantMessage(json);
    thinking.querySelector('.bubble').classList.remove('badge');
    thinking.querySelector('.bubble').textContent = assistantText;
  } catch (err) {
    thinking.querySelector('.bubble').classList.remove('badge');
    thinking.querySelector('.bubble').textContent = `Error: ${err.message}`;
    pulseDot('err');
  } finally {
    setBusy(false);
  }
});

// Keyboard shortcut: Cmd/Ctrl + Enter
els.input.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    els.composer.requestSubmit();
  }
});
```

---

### Notes

* **CORS**: If your org’s API blocks browser-origin calls, serve this behind a tiny proxy (Node/Express, Apex REST, etc.) or host from an allowed origin.
* **Security**: Tokens are only kept in-memory. For production, avoid pasting user tokens directly in the browser; use a server-side session.
* **Sequence IDs**: The client auto-increments `sequenceId` per request.
