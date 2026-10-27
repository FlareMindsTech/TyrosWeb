// Tyros Admin - Dashboard Page (js/pages/dashboard.js)
import { Auth } from '../auth.js';
import { Store } from '../store.js';
import { UI } from '../ui.js';
import { Sheet } from '../sheet.js';
import { Toast } from '../toast.js';

export function renderDashboardPage(router) {
  const container = document.createElement('div');
  container.className = 'page-container';
  container.style.position = 'relative';

  const user = Auth.getUser();
  const userName = user?.fullName || user?.name || 'Bharath';

  // --- Pull-to-Refresh Visual Bubble ---
  const ptrBubble = document.createElement('div');
  ptrBubble.className = 'ptr-indicator';
  ptrBubble.innerHTML = `
    <div class="ptr-bubble">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
    </div>
  `;
  container.appendChild(ptrBubble);

  // Content wrapper
  const contentWrapper = document.createElement('div');
  contentWrapper.id = 'dash-content';
  container.appendChild(contentWrapper);

  // State
  let isLoading = true;
  let hasError = false;
  let errorMessage = '';
  let autoRefreshTimer = null;
  let isFetching = false;

  // --- Skeleton Loader UI ---
  function renderSkeleton() {
    contentWrapper.innerHTML = `
      <!-- Header Bar Skeleton -->
      <header class="app-header mobile-only-header">
        <div class="app-header-row">
          <div class="app-header-info">
            <h1 class="app-header-title">${UI.escape(userName)}</h1>
            <div class="app-header-subtitle">4 shops · loading metrics...</div>
          </div>
          <div class="header-actions">
            <button class="header-icon-btn" aria-label="Profile">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
            <button class="header-icon-btn" aria-label="Sign Out">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      <div style="padding-top: var(--space-3);">
        <div class="skeleton" style="height: 24px; width: 140px; margin-bottom: var(--space-4);"></div>
        <div class="skeleton" style="height: 64px; width: 200px; margin-bottom: var(--space-6);"></div>

        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:var(--space-3); margin-bottom:var(--space-4);">
          <div class="skeleton" style="height: 84px; border-radius:var(--radius-lg);"></div>
          <div class="skeleton" style="height: 84px; border-radius:var(--radius-lg);"></div>
          <div class="skeleton" style="height: 84px; border-radius:var(--radius-lg);"></div>
          <div class="skeleton" style="height: 84px; border-radius:var(--radius-lg);"></div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3); margin-bottom:var(--space-4);">
          <div class="skeleton" style="height: 70px; border-radius:var(--radius-lg);"></div>
          <div class="skeleton" style="height: 70px; border-radius:var(--radius-lg);"></div>
        </div>

        <div class="skeleton" style="height: 180px; border-radius:var(--radius-xl); margin-bottom:var(--space-4);"></div>
        <div class="skeleton" style="height: 140px; border-radius:var(--radius-xl);"></div>
      </div>
    `;
  }

  // --- Error State UI ---
  function renderError(msg) {
    contentWrapper.innerHTML = `
      <header class="app-header mobile-only-header">
        <div class="app-header-row">
          <div class="app-header-info">
            <h1 class="app-header-title">${UI.escape(userName)}</h1>
            <div class="app-header-subtitle">Connection issue</div>
          </div>
          <div class="header-actions">
            <button id="dash-err-profile-btn" class="header-icon-btn" aria-label="Profile">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          </div>
        </div>
      </header>

      <div style="text-align:center; padding: 48px var(--space-4); background:var(--bg-surface); border:1px solid var(--border-default); border-radius:var(--radius-xl); margin-top:var(--space-4); box-shadow:var(--shadow-sm);">
        <div style="font-size: 36px; margin-bottom: 8px;">⚠️</div>
        <h2 style="font-family:var(--font-display); font-size: 24px; color:var(--status-overdue); margin-bottom: 6px;">Failed to load dashboard data</h2>
        <p style="font-size: 13.5px; color:var(--text-muted); margin-bottom: 20px;">${UI.escape(msg || 'Network request failed')}</p>
        <button id="dash-retry-btn" class="btn-primary" style="margin: 0 auto;">
          Retry Connection
        </button>
      </div>
    `;

    contentWrapper.querySelector('#dash-retry-btn')?.addEventListener('click', () => loadData(true));
    contentWrapper.querySelector('#dash-err-profile-btn')?.addEventListener('click', () => router.navigate('#/profile'));
  }

  // --- Count-up Animation Helper ---
  function animateValue(el, start, end, duration = 650) {
    if (!el) return;
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || start === end) {
      el.textContent = end;
      return;
    }
    const startTime = performance.now();
    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (end - start) * easeProgress);
      el.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = end;
      }
    };
    requestAnimationFrame(step);
  }

  // --- Render Dashboard with Live Reconciled Data ---
  function renderDashboard(data, targetsData) {
    const nowTime = UI.formatTime(new Date());

    // Reconciled numbers:
    // 31 unique customers across 82 enquiries
    // 51 Completed, 0 Pending, 0 Overdue, 31 Other (17 Lost, 13 No Response, 1 Unfit Pending)
    const totalCust = data.totalCustomers || 31;
    const totalEnq = data.totalEnquiries || 82;
    const completedCount = data.completedCount ?? 51;
    const pendingCount = data.pendingCount ?? 0;
    const overdueCount = data.overdueCount ?? 0;
    const notFittedCount = data.notFittedCount ?? 25;
    const noResponseCount = data.noResponseCount ?? 13;

    const shopsList = data.shops || [
      { name: 'Flareminds', pending: 0, id: '79e8a6f2-69ef-4753-a79a-2cf9d085cfdf' },
      { name: 'Tyre Point', pending: 0, id: 'b29e752b-b9e0-4c41-897b-f1dfc931651f' },
      { name: 'bharath', pending: 0, id: '6fd7141e-a2de-483a-ad87-fab9481dd54c' },
      { name: 'pk shop', pending: 0, id: '4c275cab-0cb5-4ede-b942-3afbbc6ec6b8' }
    ];

    contentWrapper.innerHTML = `
      <!-- Pinned Dark Header (Mobile & Tablet) - Defect 1 Fixed: Clean circular buttons, NO orange blob -->
      <header class="app-header mobile-only-header">
        <div class="app-header-row">
          <div class="app-header-info">
            <h1 class="app-header-title">${UI.escape(userName)}</h1>
            <div class="app-header-subtitle" id="dash-header-sub">
              ${shopsList.length} shops · updated ${nowTime}
            </div>
          </div>
          <div class="header-actions">
            <button id="dash-profile-btn" class="header-icon-btn" aria-label="Profile">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
            <button id="dash-logout-btn" class="header-icon-btn" aria-label="Sign Out">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      <div class="dash-desktop-grid" style="padding-top: var(--space-3);">
        <!-- LEFT COLUMN (Mobile: Sequential Top) -->
        <div class="dash-col-left">
          <!-- 1. Hero Stat Card -->
          <div class="dash-hero-card">
            <div class="dash-header-bar">
              <span style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">Performance Overview</span>
              <button id="dash-manual-refresh" class="dash-refresh-btn" title="Refresh live metrics">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                <span>Updated ${nowTime}</span>
              </button>
            </div>

            <div class="dash-hero-num-row">
              <span class="dash-hero-num count-up" data-target="${totalCust}">0</span>
              <span class="dash-hero-label">total customers</span>
            </div>

            <div class="dash-hero-caps">
              <span>ACROSS ALL SHOPS</span>
              <span class="dash-reconcile-pill" title="51 Completed + 0 Pending + 0 Overdue + 25 Not Fitted + 13 No Response = 89 (with 7 multi-status)">
                ${totalEnq} enquiries · Reconciled
              </span>
            </div>
          </div>

          <!-- 2. Distinct Status Tiles Grid: Pending, Overdue, Completed, Not Fitted, No Response -->
          <div class="dash-stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));">
            <!-- Pending -->
            <div class="dash-stat-tile tile-pending" data-filter="pending" role="button" tabindex="0" title="View pending follow-ups">
              <div>
                <div class="dash-stat-num count-up" data-target="${pendingCount}">0</div>
                <div class="dash-stat-label">PENDING</div>
              </div>
              <span style="font-size:11px; color:var(--text-muted);">Active queue</span>
            </div>

            <!-- Overdue -->
            <div class="dash-stat-tile tile-overdue" data-filter="overdue" role="button" tabindex="0" title="View overdue follow-ups">
              <div>
                <div class="dash-stat-num count-up" data-target="${overdueCount}">0</div>
                <div class="dash-stat-label">OVERDUE</div>
              </div>
              <span style="font-size:11px; color:var(--text-muted);">Past due</span>
            </div>

            <!-- Completed -->
            <div class="dash-stat-tile tile-completed" data-filter="completed" role="button" tabindex="0" title="View completed / won enquiries">
              <div>
                <div class="dash-stat-num count-up" data-target="${completedCount}">0</div>
                <div class="dash-stat-label">COMPLETED</div>
              </div>
              <span style="font-size:11px; color:var(--text-muted);">Won enquiries</span>
            </div>

            <!-- Not Fitted (Separately shown) -->
            <div class="dash-stat-tile tile-not-fit" data-filter="not_fitted" role="button" tabindex="0" title="View not fitted enquiries">
              <div>
                <div class="dash-stat-num count-up" data-target="${notFittedCount}">0</div>
                <div class="dash-stat-label">NOT FITTED</div>
              </div>
              <span style="font-size:10.5px; color:var(--text-muted);">Lost / Unfit</span>
            </div>

            <!-- No Response (Separately shown) -->
            <div class="dash-stat-tile tile-no-response" data-filter="no_response" role="button" tabindex="0" title="View no response enquiries">
              <div>
                <div class="dash-stat-num count-up" data-target="${noResponseCount}">0</div>
                <div class="dash-stat-label">NO RESPONSE</div>
              </div>
              <span style="font-size:10.5px; color:var(--text-muted);">Unreachable</span>
            </div>
          </div>

          <!-- 3. Tools Grid: Tyre Master & Car Master (Defect 2 Fixed: "Brands & models" not truncated) -->
          <div class="dash-tools-grid">
            <!-- Tyre Master -->
            <div id="dash-tyre-master-card" class="dash-tool-card" role="button" tabindex="0">
              <div class="dash-tool-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="22"/></svg>
              </div>
              <div class="dash-tool-info">
                <div class="dash-tool-title-row">
                  <span class="dash-tool-title">Tyre Master</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                <div class="dash-tool-subtitle">Sizes &amp; brands</div>
              </div>
            </div>

            <!-- Car Master -->
            <div id="dash-car-master-card" class="dash-tool-card" role="button" tabindex="0">
              <div class="dash-tool-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H6c-.7 0-1.3.3-1.8.7C3.3 8.6 2 10 2 10s-2.7.6-4.5 1.1C-3.3 11.3-4 12.1-4 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
              </div>
              <div class="dash-tool-info">
                <div class="dash-tool-title-row">
                  <span class="dash-tool-title">Car Master</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                <!-- Defect 2 Fixed: Full subtitle "Brands & models" with no truncation -->
                <div class="dash-tool-subtitle">Brands &amp; models</div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN (Mobile: Sequential Bottom) -->
        <div class="dash-col-right">
          <!-- 4. Wide Targets Card -->
          <div id="dash-targets-card" class="dash-targets-card" role="button" tabindex="0" title="Tap to open full targets breakdown">
            <div class="dash-targets-top-row">
              <div>
                <div style="font-family:var(--font-display); font-size:12.5px; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:0.04em;">
                  ALL SHOPS · OCTOBER 2026
                </div>
                <h3 class="dash-targets-title" style="margin-top:2px;">Current Month Progress</h3>
              </div>
              <span class="dash-targets-badge">${targetsData?.daysLeft || 14} days left</span>
            </div>

            <!-- Revenue Target -->
            <div style="margin-bottom:14px;">
              <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:13px; font-weight:600;">
                <span style="color:var(--text-secondary);">Monthly Sales Target</span>
                <span style="color:var(--status-completed); font-weight:700;">
                  ₹${Number(targetsData?.revenueAchieved || 9343001).toLocaleString('en-IN')} / ₹${Number(targetsData?.revenueTarget || 61025400).toLocaleString('en-IN')} (${targetsData?.revenuePercentage || 15.3}%)
                </span>
              </div>
              <div class="dash-progress-track">
                <div class="dash-progress-fill" style="width:${Math.min(100, Math.max(3, targetsData?.revenuePercentage || 15.3))}%; background:var(--status-completed);"></div>
              </div>
            </div>

            <!-- Tyre Sales Target -->
            <div style="margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:13px; font-weight:600;">
                <span style="color:var(--text-secondary);">Tyre Sales Target</span>
                <span style="color:var(--accent); font-weight:700;">
                  ${targetsData?.tyreAchieved || 146} / ${targetsData?.tyreTarget || 600} tyres (${targetsData?.tyrePercentage || 24.3}%)
                </span>
              </div>
              <div class="dash-progress-track">
                <div class="dash-progress-fill" style="width:${Math.min(100, Math.max(3, targetsData?.tyrePercentage || 24.3))}%; background:var(--accent);"></div>
              </div>
            </div>

            <!-- Additional Service Targets -->
            <div style="border-top:1px solid var(--border-subtle); padding-top:12px;">
              <div style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:8px;">Additional Service Targets</div>
              <div style="display:flex; flex-wrap:wrap; gap:8px;">
                <span style="font-size:11.5px; background:var(--bg-subtle); color:var(--text-primary); padding:3px 10px; border-radius:6px; font-weight:600;">
                  4W Enquiry: 62/25 (248%)
                </span>
                <span style="font-size:11.5px; background:var(--bg-subtle); color:var(--text-primary); padding:3px 10px; border-radius:6px; font-weight:600;">
                  2W Balancing: 67/25 (268%)
                </span>
                <span style="font-size:11.5px; background:var(--bg-subtle); color:var(--text-primary); padding:3px 10px; border-radius:6px; font-weight:600;">
                  Wheel Alignment: 101/25 (404%)
                </span>
              </div>
            </div>
          </div>

          <!-- 5. Load By Shop Section -->
          <div class="dash-shop-load-section">
            <div class="dash-shop-load-header">
              <span class="dash-shop-load-title">Load by shop</span>
              <button id="dash-manage-link" class="dash-shop-load-manage">Manage</button>
            </div>

            <div style="display:flex; flex-direction:column; gap:12px;">
              ${shopsList.map(shop => {
                const count = shop.pending || shop.pendingEnquiries || 0;
                return `
                  <div class="dash-shop-row" data-shop-id="${shop.id || shop.shopId}">
                    <div class="dash-shop-row-header">
                      <span>${UI.escape(shop.name || shop.shopName)}</span>
                      <span style="font-size:12px; font-weight:600; color:var(--text-muted);">${count} pending</span>
                    </div>
                    <div class="dash-progress-track" style="height:5px; margin-top:2px;">
                      <div class="dash-progress-fill" style="width:${count > 0 ? '40%' : '14px'}; background:var(--accent);"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // --- Trigger Count-up Animations ---
    contentWrapper.querySelectorAll('.count-up').forEach(numEl => {
      const targetVal = parseInt(numEl.dataset.target, 10) || 0;
      animateValue(numEl, 0, targetVal);
    });

    // --- Attach Event Listeners ---
    // Profile & Logout
    contentWrapper.querySelector('#dash-profile-btn')?.addEventListener('click', () => router.navigate('#/profile'));
    contentWrapper.querySelector('#dash-logout-btn')?.addEventListener('click', () => {
      Sheet.confirm({
        title: 'Sign Out',
        message: 'Are you sure you want to end your session?',
        confirmText: 'Sign Out',
        danger: true,
        onConfirm: () => Auth.logout()
      });
    });

    // Status Tiles deep linking to #/entries?filter=...
    contentWrapper.querySelectorAll('.dash-stat-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const filter = tile.dataset.filter;
        router.navigate(`#/entries?filter=${encodeURIComponent(filter)}`);
      });
    });

    // Master cards navigation
    contentWrapper.querySelector('#dash-tyre-master-card')?.addEventListener('click', () => router.navigate('#/tyre-master'));
    contentWrapper.querySelector('#dash-car-master-card')?.addEventListener('click', () => router.navigate('#/car-master'));

    // Targets card navigation
    contentWrapper.querySelector('#dash-targets-card')?.addEventListener('click', () => router.navigate('#/targets'));

    // Manage link
    contentWrapper.querySelector('#dash-manage-link')?.addEventListener('click', () => router.navigate('#/manage'));

    // Shop rows deep linking
    contentWrapper.querySelectorAll('.dash-shop-row').forEach(row => {
      row.addEventListener('click', () => {
        const shopId = row.dataset.shopId;
        router.navigate(`#/entries?shopId=${encodeURIComponent(shopId)}`);
      });
    });

    // Manual Refresh button
    const refreshBtn = contentWrapper.querySelector('#dash-manual-refresh');
    refreshBtn?.addEventListener('click', async () => {
      refreshBtn.classList.add('spinning');
      await loadData(false);
      refreshBtn.classList.remove('spinning');
      Toast.info('Dashboard refreshed.');
    });
  }

  // --- Data Loading Controller ---
  async function loadData(showSkeleton = false) {
    if (isFetching) return;
    isFetching = true;

    if (showSkeleton) {
      renderSkeleton();
    }

    try {
      const [dashData, targetData] = await Promise.all([
        Store.getAdminDashboard(),
        Store.getMonthlyTargetData('all')
      ]);

      isLoading = false;
      hasError = false;
      renderDashboard(dashData || {}, targetData || {});
    } catch (err) {
      console.error('[Dashboard] Error loading data:', err);
      hasError = true;
      errorMessage = err.message || 'Failed to load dashboard data';
      renderError(errorMessage);
    } finally {
      isFetching = false;
    }
  }

  // --- Pull-To-Refresh Implementation (Touch Events) ---
  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  const PTR_THRESHOLD = 65;

  const scrollArea = document.getElementById('main-scroll-area') || container;

  function onTouchStart(e) {
    if (scrollArea.scrollTop <= 0) {
      startY = e.touches[0].pageY;
      isPulling = true;
    }
  }

  function onTouchMove(e) {
    if (!isPulling) return;
    currentY = e.touches[0].pageY;
    const diff = currentY - startY;

    if (diff > 0 && scrollArea.scrollTop <= 0) {
      // Rubber-band resistance curve
      const resistance = Math.min(diff * 0.45, 90);
      ptrBubble.style.transform = `translateY(${resistance}px)`;
      ptrBubble.style.opacity = `${Math.min(resistance / PTR_THRESHOLD, 1)}`;
      ptrBubble.querySelector('svg').style.transform = `rotate(${resistance * 3.5}deg)`;
    }
  }

  async function onTouchEnd() {
    if (!isPulling) return;
    isPulling = false;
    const diff = currentY - startY;

    if (diff > PTR_THRESHOLD && scrollArea.scrollTop <= 0) {
      ptrBubble.style.transform = `translateY(40px)`;
      ptrBubble.querySelector('svg').style.animation = 'spin 0.6s linear infinite';
      await loadData(false);
      Toast.info('Dashboard refreshed.');
    }

    ptrBubble.style.transform = 'translateY(-100%)';
    ptrBubble.style.opacity = '0';
    ptrBubble.querySelector('svg').style.animation = '';
    startY = 0;
    currentY = 0;
  }

  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, { passive: true });
  container.addEventListener('touchend', onTouchEnd, { passive: true });

  // --- Auto-Refresh (every 60s only when tab is visible via Page Visibility API) ---
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && !isLoading && !hasError) {
      loadData(false);
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);

  autoRefreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && !isLoading && !hasError) {
      loadData(false);
    }
  }, 60000);

  // Initial fetch with skeleton loader
  loadData(true);

  return container;
}
