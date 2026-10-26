import { i18n } from './i18n.js';

class EventAssistant {
  init() {
    this.form = document.getElementById('assistant-form');
    this.questionInput = document.getElementById('assistant-question');
    this.eventTypeInput = document.getElementById('assistant-event-type');
    this.messages = document.getElementById('assistant-messages');
    this.status = document.getElementById('assistant-status');
    this.sendButton = document.getElementById('assistant-send');
    this.panel = document.getElementById('assistant-panel');
    this.launchButton = document.getElementById('assistant-launcher');
    this.closeButton = document.getElementById('assistant-close');

    if (
      !this.form || !this.questionInput || !this.eventTypeInput || !this.messages ||
      !this.status || !this.sendButton || !this.panel || !this.launchButton || !this.closeButton
    ) {
      return;
    }

    this.launchButton.addEventListener('click', () => this.open());
    this.closeButton.addEventListener('click', () => this.close());
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !this.panel.hidden) {
        event.preventDefault();
        this.close();
      }
    });

    this.form.addEventListener('submit', event => {
      event.preventDefault();
      this.ask();
    });

    document.querySelectorAll('[data-assistant-prompt]').forEach(button => {
      button.addEventListener('click', () => {
        this.questionInput.value = button.dataset.assistantPrompt;
        this.questionInput.focus();
      });
    });
  }

  open() {
    this.panel.hidden = false;
    this.launchButton.setAttribute('aria-expanded', 'true');
    this.questionInput.focus();
  }

  close() {
    this.panel.hidden = true;
    this.launchButton.setAttribute('aria-expanded', 'false');
    this.launchButton.focus();
  }

  appendMessage(role, text) {
    const message = document.createElement('p');
    message.className = `assistant-message assistant-message-${role}`;
    message.textContent = text;
    this.messages.append(message);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  async ask() {
    const question = this.questionInput.value.trim();
    if (!question || this.sendButton.disabled) return;

    this.appendMessage('user', question);
    this.questionInput.value = '';
    this.sendButton.disabled = true;
    this.questionInput.disabled = true;
    this.eventTypeInput.disabled = true;
    this.status.textContent = i18n.t('assistant_thinking', 'Thinking of something lovely...');

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          eventType: this.eventTypeInput.value,
          language: i18n.currentAssistantLang
        })
      });
      const result = await response.json();

      if (!response.ok || !result.success || typeof result.answer !== 'string') {
        if (result.error === 'assistant_quota_exhausted') {
          throw new Error('assistant_quota_exhausted');
        }
        if (response.status === 429 || result.error === 'assistant_rate_limited') {
          throw new Error('assistant_rate_limited');
        }
        throw new Error('assistant_unavailable');
      }

      this.appendMessage('assistant', result.answer);
      this.status.textContent = '';
    } catch (error) {
      let message;
      if (error.message === 'assistant_rate_limited') {
        message = i18n.t('assistant_rate_limited', 'You’ve asked quite a few questions. Please try again in a little while.');
      } else if (error.message === 'assistant_quota_exhausted') {
        message = i18n.t('assistant_quota_exhausted', 'The AI assistant has reached today’s free usage limit. Please try again later.');
      } else {
        message = i18n.t('assistant_unavailable', 'I’m having trouble connecting right now. Please try again soon.');
      }
      this.appendMessage('assistant', message);
      this.status.textContent = '';
    } finally {
      this.sendButton.disabled = false;
      this.questionInput.disabled = false;
      this.eventTypeInput.disabled = false;
      if (!this.panel.hidden) this.questionInput.focus();
    }
  }
}

export const assistant = new EventAssistant();
