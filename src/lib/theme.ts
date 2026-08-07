export interface ThemeColors {
  primaryNavy: string;
  accentNavy: string;
  luxuryGold: string;
  highlightGold: string;
}

export const DEFAULT_THEME: ThemeColors = {
  primaryNavy: '#12113D',
  accentNavy: '#0A0923',
  luxuryGold: '#DCAE3E',
  highlightGold: '#E8C466',
};

const THEME_STORAGE_KEY = 'spihead_crm_theme_colors';

export const themeService = {
  getTheme(): ThemeColors {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.primaryNavy && parsed.accentNavy && parsed.luxuryGold && parsed.highlightGold) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse theme from storage', e);
    }
    return DEFAULT_THEME;
  },

  applyTheme(theme: ThemeColors) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.style.setProperty('--brand-primary-navy', theme.primaryNavy);
    root.style.setProperty('--brand-accent-navy', theme.accentNavy);
    root.style.setProperty('--brand-luxury-gold', theme.luxuryGold);
    root.style.setProperty('--brand-highlight-gold', theme.highlightGold);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch (e) {
      console.error('Failed to save theme to storage', e);
    }
  },

  resetTheme() {
    this.applyTheme(DEFAULT_THEME);
    return DEFAULT_THEME;
  },
};
