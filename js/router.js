// Tyros Admin - Hash Router (js/router.js)
import { Auth } from './auth.js';
import { ApiClient } from './api.js';

export class HashRouter {
  constructor() {
    this.currentRoute = null;
    this.container = null;
    this.routes = {
      '#/login': () => import('./pages/login.js?v=2.1.0').then(m => m.renderLoginPage),
      '#/dashboard': () => import('./pages/dashboard.js?v=2.1.0').then(m => m.renderDashboardPage),
      '#/entries': () => import('./pages/entries.js?v=2.1.0').then(m => m.renderEntriesPage),
      '#/report': () => import('./pages/report.js?v=2.1.0').then(m => m.renderReportPage),
      '#/manage': () => import('./pages/manage.js?v=2.1.0').then(m => m.renderManagePage),
      '#/profile': () => import('./pages/profile.js?v=2.1.0').then(m => m.renderProfilePage),
      '#/targets': () => import('./views/targets.js?v=2.1.0').then(m => m.renderTargets),
      '#/tyre-master': () => import('./views/tyreMaster.js?v=2.1.0').then(m => m.renderTyreMaster),
      '#/car-master': () => import('./views/carMaster.js?v=2.1.0').then(m => m.renderCarMaster),
      '#/calendar': () => import('./views/calendar.js?v=2.1.0').then(m => m.renderCalendar),
    };
  }

  init() {
    this.container = document.getElementById('main-scroll-area');
    window.addEventListener('hashchange', () => this.handleRouting());
    return this.handleRouting();
  }

  handleRouting() {
    return this.route();
  }

  navigate(hash) {
    if (!hash.startsWith('#')) hash = `#${hash}`;
    window.location.hash = hash;
  }

  async route() {
    let hash = window.location.hash || '';
    if (!hash || hash === '#' || hash === '#/') {
      hash = Auth.isAuthenticated() ? '#/dashboard' : '#/login';
    }

    // Separate path from query params
    const queryIdx = hash.indexOf('?');
    const path = queryIdx !== -1 ? hash.slice(0, queryIdx) : hash;
    const queryString = queryIdx !== -1 ? hash.slice(queryIdx + 1) : '';
    const params = Object.fromEntries(new URLSearchParams(queryString));

    // Auth guard
    if (!Auth.isAuthenticated() && path !== '#/login') {
      window.location.hash = '#/login';
      return;
    }

    if (Auth.isAuthenticated() && path === '#/login') {
      window.location.hash = '#/dashboard';
      return;
    }

    // Abort in-flight API requests from previous view
    ApiClient.abortAll();

    const loader = this.routes[path];
    if (!loader) {
      window.location.hash = Auth.isAuthenticated() ? '#/dashboard' : '#/login';
      return;
    }

    this.currentRoute = path;
    this.updateNavigationUI(path);

    // Render using View Transitions API if supported
    const renderAction = async () => {
      this.container = this.container || document.getElementById('main-scroll-area');
      if (this.container) {
        this.container.scrollTop = 0;
        this.container.innerHTML = `
          <div style="display:flex; justify-content:center; align-items:center; min-height:260px;">
            <div class="spinner" aria-label="Loading page"></div>
          </div>
        `;
        try {
          const renderFn = await loader();
          const pageEl = await renderFn(this, params);
          this.container.innerHTML = '';
          this.container.appendChild(pageEl);
        } catch (err) {
          console.error('[Router] Failed to render view:', err);
          this.container.innerHTML = `
            <div class="page-container" style="text-align:center; padding:48px var(--space-4);">
              <div style="font-size:36px; margin-bottom:12px;">⚠️</div>
              <h2 style="font-family:var(--font-display); font-size:24px; color:var(--status-overdue);">Failed to load view</h2>
              <p style="font-size:13.5px; color:var(--text-muted); margin:8px 0 20px;">${err.message || 'An error occurred'}</p>
              <button class="btn-primary" style="margin:0 auto;" onclick="window.location.reload()">Retry</button>
            </div>
          `;
        }
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(() => renderAction());
    } else {
      await renderAction();
    }
  }

  updateNavigationUI(currentPath) {
    const isLoginPage = currentPath === '#/login';
    document.body.classList.toggle('is-login-page', isLoginPage);

    const mobileTabBar = document.querySelector('.mobile-tab-bar');
    const desktopSidebar = document.querySelector('.desktop-sidebar');
    const desktopTopBar = document.querySelector('.desktop-top-bar');

    // Toggle nav bars on login vs app
    if (mobileTabBar) mobileTabBar.style.display = isLoginPage ? 'none' : '';
    if (desktopSidebar) desktopSidebar.style.display = isLoginPage ? 'none' : '';
    if (desktopTopBar) desktopTopBar.style.display = isLoginPage ? 'none' : '';

    if (isLoginPage) return;

    // Normalize '#/reports' to '#/report' for navigation match
    const normalizedPath = currentPath === '#/reports' ? '#/report' : currentPath;

    // Update Mobile Tab Bar
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const btnHref = btn.getAttribute('href');
      if (btnHref === normalizedPath) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    // Update Desktop Sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
      const linkHref = link.getAttribute('href');
      if (linkHref === normalizedPath) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }
}

// Instance for singleton usage
const defaultRouter = new HashRouter();

// Allow Router to be used both as a class (`new Router()`) or as an instance/static proxy (`Router.init()`)
export const Router = new Proxy(HashRouter, {
  get(target, prop) {
    if (prop in defaultRouter) {
      const val = defaultRouter[prop];
      return typeof val === 'function' ? val.bind(defaultRouter) : val;
    }
    return target[prop];
  }
});

export default defaultRouter;
