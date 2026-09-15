// VidyaSetu AI Doubt Guru Module
const AiTutor = {
  activeSubject: 'Data Structures & Algorithms',
  activeLanguage: 'en',
  isSpeaking: false,

  init() {
    this.bindEvents();
    this.loadHistory();
  },

  bindEvents() {
    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('aiSendBtn');

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }
  },

  open(prefillSubject = null, prefillQuery = null) {
    const overlay = document.getElementById('aiModalOverlay');
    if (overlay) overlay.classList.add('active');

    if (prefillSubject) {
      this.activeSubject = prefillSubject;
      const subBadge = document.getElementById('aiSubjectBadge');
      if (subBadge) subBadge.textContent = prefillSubject;
    }

    if (prefillQuery) {
      const input = document.getElementById('aiChatInput');
      if (input) {
        input.value = prefillQuery;
        this.sendMessage();
      }
    }
  },

  close() {
    const overlay = document.getElementById('aiModalOverlay');
    if (overlay) overlay.classList.remove('active');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    this.isSpeaking = false;
  },

  async loadHistory() {
    const res = await API.getAiHistory('student_demo');
    if (res.success && res.data && res.data.length > 0) {
      const container = document.getElementById('aiChatMessages');
      if (!container) return;
      // Keep welcome message, add recent history if any
    }
  },

  usePrompt(chipText) {
    const input = document.getElementById('aiChatInput');
    if (input) {
      input.value = chipText;
      this.sendMessage();
    }
  },

  async sendMessage() {
    const input = document.getElementById('aiChatInput');
    const query = input.value.trim();
    if (!query) return;

    input.value = '';
    const container = document.getElementById('aiChatMessages');

    // 1. Append User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-bubble user';
    userMsg.innerHTML = `<strong>You:</strong><br>${this.escapeHtml(query)}`;
    container.appendChild(userMsg);

    // 2. Append Loading Indicator
    const botLoading = document.createElement('div');
    botLoading.className = 'chat-bubble assistant';
    botLoading.id = 'botLoadingIndicator';
    botLoading.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; color: #38bdf8;">
        <span class="loading-spinner">✨</span>
        <span>VidyaSetu AI Guru is thinking & generating step-by-step GTU solution...</span>
      </div>
    `;
    container.appendChild(botLoading);
    container.scrollTop = container.scrollHeight;

    // 3. Request API
    const res = await API.askAi(query, this.activeSubject, this.activeLanguage, 'student_demo');

    // Remove loading
    const loadingElem = document.getElementById('botLoadingIndicator');
    if (loadingElem) loadingElem.remove();

    if (res.success && res.data) {
      const botMsg = document.createElement('div');
      botMsg.className = 'chat-bubble assistant';
      
      const responseHtml = DocViewer.renderMarkdown(res.data.response);
      const uniqueId = `ai_ans_${Date.now()}`;

      botMsg.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
          <span style="font-weight: 700; color: #38bdf8; font-size: 0.82rem; background: rgba(56,189,248,0.15); padding: 2px 8px; border-radius: 4px;">
            🤖 ${res.data.category || 'GTU Academic Solution'}
          </span>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-sm btn-secondary" onclick="AiTutor.copyAnswer('${uniqueId}')" title="Copy to clipboard">
              📋 Copy
            </button>
            <button class="btn btn-sm btn-secondary" onclick="AiTutor.speakAnswer('${uniqueId}')" title="Read Aloud">
              🔊 Listen
            </button>
          </div>
        </div>

        <div id="${uniqueId}">
          ${responseHtml}
        </div>

        ${res.data.exam_tips ? `
          <div style="margin-top: 1rem; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 8px; padding: 0.75rem 1rem; color: #fbbf24; font-size: 0.85rem;">
            💡 <strong>GTU Exam Tip:</strong> ${res.data.exam_tips}
          </div>
        ` : ''}
      `;

      container.appendChild(botMsg);
      container.scrollTop = container.scrollHeight;
    } else {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'chat-bubble assistant';
      errorMsg.innerHTML = `<span style="color: #ef4444;">⚠️ Could not solve this query right now. Please verify your connection or try another topic.</span>`;
      container.appendChild(errorMsg);
    }
  },

  copyAnswer(elemId) {
    const elem = document.getElementById(elemId);
    if (!elem) return;
    navigator.clipboard.writeText(elem.innerText);
    App.showToast('Solution copied to clipboard!', 'success');
  },

  speakAnswer(elemId) {
    if (!window.speechSynthesis) {
      App.showToast('Text-to-speech is not supported in this browser.', 'error');
      return;
    }

    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      App.showToast('Audio playback stopped.', 'info');
      return;
    }

    const elem = document.getElementById(elemId);
    if (!elem) return;

    const utterance = new SpeechSynthesisUtterance(elem.innerText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = () => { this.isSpeaking = false; };

    this.isSpeaking = true;
    window.speechSynthesis.speak(utterance);
    App.showToast('Reading solution aloud...', 'info');
  },

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};
