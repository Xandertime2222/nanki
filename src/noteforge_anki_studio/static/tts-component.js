/**
 * Text-to-Speech Component for Nanki
 */

class TTSComponent {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.init();
  }

  init() {
    this.createTTSPanel();
    this.attachEventListeners();
  }

  createTTSPanel() {
    const panel = document.createElement('div');
    panel.id = 'tts-panel';
    panel.className = 'tts-panel';
    panel.innerHTML = `
      <button id="tts-play-btn" class="tts-btn" title="Read card aloud">
        🔊
      </button>
      <button id="tts-stop-btn" class="tts-btn hidden" title="Stop">
        ⏹️
      </button>
    `;
    
    // Insert into card editor
    const cardEditor = document.querySelector('.card-editor') || document.body;
    cardEditor.appendChild(panel);
  }

  attachEventListeners() {
    document.getElementById('tts-play-btn')?.addEventListener('click', () => this.speak());
    document.getElementById('tts-stop-btn')?.addEventListener('click', () => this.stop());
  }

  speak(text = null) {
    if (!this.synth) {
      console.error('Speech synthesis not supported');
      return;
    }

    // Get text from current card if not provided
    if (!text) {
      const cardFront = document.querySelector('.card-front-content')?.textContent;
      const cardBack = document.querySelector('.card-back-content')?.textContent;
      text = cardFront || cardBack || '';
    }

    if (!text.trim()) return;

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = document.documentElement.lang || 'de-DE';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => {
      this.isPlaying = true;
      document.getElementById('tts-play-btn')?.classList.add('hidden');
      document.getElementById('tts-stop-btn')?.classList.remove('hidden');
    };

    utterance.onend = () => {
      this.isPlaying = false;
      document.getElementById('tts-play-btn')?.classList.remove('hidden');
      document.getElementById('tts-stop-btn')?.classList.add('hidden');
    };

    this.synth.speak(utterance);
    this.currentUtterance = utterance;
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    document.getElementById('tts-play-btn')?.classList.remove('hidden');
    document.getElementById('tts-stop-btn')?.classList.add('hidden');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new TTSComponent());
