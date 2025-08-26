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
const state = {
  sessionId: '',
  accessToken: '',
  sequenceId: 1,
  sending: false,
  isRecording: false,
  recognition: null,
};

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
      return chunks.join('\\n\\n');
    }
  } catch (e) { /* ignore and fallthrough */ }
  return '[No message returned]';
}

// Submit handling
els.composer.addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw = els.input.value.trim();
  if (!raw || state.sending) return;
  const text = transformOutgoingText(raw);

  addMessage({ role: 'user', text });
  els.input.value = '';

  const thinking = addMessage({ role: 'assistant', text: '…thinking' });
  setBusy(true);
  pulseDot('ok');

  try {
    const json = await callEinsteinAPI(text);
    const assistantText = handleAssistantMessage(json);
    thinking.querySelector('.bubble').textContent = assistantText;
  } catch (err) {
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

// ---- Speech to Text (Web Speech API) ----
initSpeech();

els.mic.addEventListener('click', () => {
  if (!state.recognition) return; // unsupported
  if (state.isRecording) stopListening(); else startListening();
});

function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    els.mic.disabled = true;
    els.mic.title = 'Speech recognition not supported in this browser';
    return;
  }
  const rec = new SR();
  rec.lang = navigator.language || 'en-US';
  rec.interimResults = true;
  rec.continuous = false;

  rec.onstart = () => {
    state.isRecording = true;
    els.mic.classList.add('recording');
    els.mic.setAttribute('aria-pressed', 'true');
    onSpeechStart();
  };
  rec.onresult = (evt) => {
    let finalText = '';
    for (let i = evt.resultIndex; i < evt.results.length; i++) {
      const res = evt.results[i];
      const txt = res[0].transcript;
      const isFinal = res.isFinal;
      if (isFinal) finalText += txt;
      els.input.value = (finalText || txt).trim();
      onSpeechResult(txt, isFinal);
    }
  };
  rec.onerror = (evt) => {
    onSpeechError(evt.error || 'speech-error');
  };
  rec.onend = () => {
    state.isRecording = false;
    els.mic.classList.remove('recording');
    els.mic.setAttribute('aria-pressed', 'false');
    onSpeechEnd();
  };

  state.recognition = rec;
}

function startListening() { try { state.recognition.start(); } catch (_) {} }
function stopListening() { try { state.recognition.stop(); } catch (_) {} }

// ---- Extension hooks (stubs for future use) ----
function onSpeechStart() { /* no-op: hook for future */ }
function onSpeechEnd() { /* no-op: hook for future */ }
function onSpeechResult(text, isFinal) { /* no-op: hook for future */ }
function onSpeechError(err) { /* no-op: hook for future */ }
function transformOutgoingText(text) { return text; }
function handleAssistantMessage(json) { return extractAssistantMessage(json); }
