// Tyros Admin - UI Utilities (js/ui.js)
import { Toast } from './toast.js';
import { Sheet } from './sheet.js';

class UIManager {
  constructor() {
    this.themeKey = 'tyros_theme_preference';
    this.initTheme();

    // SVG Icons
    this.icons = {
      tyre(size = 20, color = 'currentColor') {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="4"/>
            <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/>
            <line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
            <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/>
            <line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>
          </svg>
        `;
      },
      home(size = 20) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        `;
      },
      clock(size = 20) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        `;
      },
      checkCircle(size = 20) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        `;
      },
      crossCircle(size = 20) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        `;
      },
      user(size = 20) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        `;
      },
      grid(size = 20) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
        `;
      },
      list(size = 20) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        `;
      },
      chart(size = 20) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        `;
      },
      building(size = 20) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
            <path d="M6 12H4a2 2 0 0 0-2 2v8h4"/>
            <path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/>
            <path d="M10 6h4"/>
            <path d="M10 10h4"/>
            <path d="M10 14h4"/>
            <path d="M10 18h4"/>
          </svg>
        `;
      },
      phone(size = 18) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        `;
      },
      whatsapp(size = 18) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        `;
      },
      calendar(size = 18) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        `;
      },
      search(size = 18) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        `;
      },
      chevronRight(size = 16) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        `;
      },
      back(size = 18) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        `;
      },
      plus(size = 16) {
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        `;
      }
    };
  }

  initTheme() {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(this.themeKey);
    // Explicitly default to 'light' theme unless user manually chose 'dark'
    if (stored === 'dark') {
      this.setTheme('dark');
    } else {
      this.setTheme('light', false);
    }
  }

  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  setTheme(theme, save = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (save) {
      localStorage.setItem(this.themeKey, theme);
    }
    // Update theme-color meta tag for Safari header
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0E0C0B' : '#1F1B18');
    }
    window.dispatchEvent(new CustomEvent('tyros:theme-changed', { detail: { theme } }));
  }

  toggleTheme() {
    const current = this.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  }

  // Toast notification
  showToast(message, type = 'info', duration) {
    Toast.show(message, type, duration);
  }

  // Modal / Bottom Sheet
  showModal(contentHtmlOrConfig, options = {}) {
    if (typeof contentHtmlOrConfig === 'string') {
      return Sheet.open({
        content: contentHtmlOrConfig,
        onMount: options.onMounted || options.onMount,
        onDismiss: options.onDismiss,
        ...options
      });
    }
    return Sheet.open({
      ...contentHtmlOrConfig,
      ...options
    });
  }

  hideModal() {
    Sheet.close();
  }

  // Safe string escape (prevent XSS)
  escape(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Currency formatting
  formatCurrency(num) {
    const val = Number(num || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }

  // Time format
  formatTime(date = new Date()) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  // Format Date helper
  formatDate(dateInput, format = 'row') {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const d = date.getDate();
    const m = months[date.getMonth()];
    const y = date.getFullYear();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;

    if (format === 'hero') {
      return `TODAY, ${d} ${m}`;
    }

    if (format === 'relative') {
      if (dateStr === todayStr) return 'Due Today';
      if (dateStr === tomorrowStr) return 'Due Tomorrow';
      if (dateStr === yesterdayStr) return 'Overdue (Yesterday)';
      if (dateStr < todayStr) return `Overdue (${d} ${m})`;
      return `Due ${d} ${m}`;
    }

    if (format === 'short') {
      return `${d} ${m}`;
    }

    return `${d} ${m} ${y}`;
  }

  // Vehicle Plate Auto-Formatter (e.g. "TN 01 AB 1234")
  formatPlate(str) {
    if (!str) return '';
    const clean = str.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 4) return `${clean.slice(0,2)} ${clean.slice(2)}`;
    if (clean.length <= 6) return `${clean.slice(0,2)} ${clean.slice(2,4)} ${clean.slice(4)}`;
    return `${clean.slice(0,2)} ${clean.slice(2,4)} ${clean.slice(4,6)} ${clean.slice(6,10)}`;
  }

  // Debounce utility (e.g., 300ms for search)
  debounce(func, waitMs = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), waitMs);
    };
  }
}

export const UI = new UIManager();
if (typeof window !== 'undefined') {
  window.UI = UI;
}

