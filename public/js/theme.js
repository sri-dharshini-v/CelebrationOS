const THEME_STORAGE_KEY = 'celebrationos_theme';
const ACCENT_STORAGE_KEY = 'celebrationos_custom_accent';
const THEMES = new Set(['elegant', 'joyful', 'modern']);
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function readStorage(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (error) {
    console.warn('[Theme] Could not read saved theme preference:', error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('[Theme] Could not save theme preference:', error);
  }
}

function getAccentTextColor(hex) {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  const luminance = channels
    .map(channel => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    })
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);

  return luminance > 0.18 ? '#3b2028' : '#ffffff';
}

class ThemeController {
  constructor() {
    this.theme = 'elegant';
    this.accent = '#c99a4a';
  }

  init() {
    const savedTheme = readStorage(THEME_STORAGE_KEY, 'elegant');
    this.theme = THEMES.has(savedTheme) ? savedTheme : 'elegant';

    const savedAccent = readStorage(ACCENT_STORAGE_KEY, '#c99a4a');
    this.accent = HEX_COLOR_PATTERN.test(savedAccent) ? savedAccent : '#c99a4a';
    this.apply();
    this.bindControls();
    this.bindEventDecorations();
  }

  apply() {
    const root = document.documentElement;
    root.dataset.theme = this.theme;
    root.style.setProperty('--custom-accent', this.accent);
    root.style.setProperty('--accent-contrast', getAccentTextColor(this.accent));

    const themeSelect = document.getElementById('settings-theme-select');
    const accentPicker = document.getElementById('settings-accent-picker');
    if (themeSelect) themeSelect.value = this.theme;
    if (accentPicker) accentPicker.value = this.accent;
  }

  setTheme(theme) {
    if (!THEMES.has(theme)) return;
    this.theme = theme;
    writeStorage(THEME_STORAGE_KEY, theme);
    this.apply();
  }

  setAccent(accent) {
    if (!HEX_COLOR_PATTERN.test(accent)) return;
    this.accent = accent;
    writeStorage(ACCENT_STORAGE_KEY, accent);
    this.apply();
  }

  bindControls() {
    const themeSelect = document.getElementById('settings-theme-select');
    const accentPicker = document.getElementById('settings-accent-picker');
    const accentValue = document.getElementById('settings-accent-value');

    if (themeSelect) {
      themeSelect.addEventListener('change', () => this.setTheme(themeSelect.value));
    }
    if (accentPicker) {
      accentPicker.addEventListener('input', () => {
        this.setAccent(accentPicker.value);
        if (accentValue) accentValue.textContent = accentPicker.value.toUpperCase();
      });
      if (accentValue) accentValue.textContent = this.accent.toUpperCase();
    }
  }

  bindEventDecorations() {
    const hero = document.querySelector('.hero-card');
    const quickType = document.getElementById('q-type');
    const guidedType = document.getElementById('g-type');
    if (!hero) return;

    const update = eventType => {
      hero.dataset.eventType = ['wedding', 'birthday'].includes(eventType) ? eventType : '';
    };

    [quickType, guidedType].forEach(select => {
      if (select) select.addEventListener('change', () => update(select.value));
    });
    update(quickType?.value || guidedType?.value || '');
  }
}

export const themeController = new ThemeController();
