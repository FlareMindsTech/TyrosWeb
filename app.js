// Tyros Admin - Application Entry Point (app.js)
import { Router } from './js/router.js?v=2.6.0';
import { Auth } from './js/auth.js';
import { UI } from './js/ui.js';
import { Sheet } from './js/sheet.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize UI & Theme
  UI.initTheme();

  // 2. Setup Desktop Sidebar Theme & Logout handlers
  const desktopThemeToggle = document.getElementById('sidebar-theme-toggle');
  if (desktopThemeToggle) {
    desktopThemeToggle.addEventListener('click', () => {
      UI.toggleTheme();
    });
  }

  const desktopLogoutBtn = document.getElementById('sidebar-logout-btn');
  if (desktopLogoutBtn) {
    desktopLogoutBtn.addEventListener('click', () => {
      Sheet.confirm({
        title: 'Sign Out',
        message: 'Are you sure you want to log out of your session?',
        confirmText: 'Sign Out',
        danger: true,
        onConfirm: () => {
          Auth.logout();
        }
      });
    });
  }

  // 3. Update desktop user profile label on auth change
  const updateDesktopUser = () => {
    const user = Auth.getUser();
    const badge = document.getElementById('desktop-user-badge');
    if (badge) {
      badge.textContent = user?.fullName || user?.name || 'Admin';
    }
  };
  window.addEventListener('tyros:auth-changed', updateDesktopUser);
  updateDesktopUser();

  // 4. Initialize Hash Router
  await Router.init();

  // 5. Register PWA Service Worker if available
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('[PWA] Service worker registration skipped:', err.message);
    });
  }
});
