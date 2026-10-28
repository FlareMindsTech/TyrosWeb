// Tyros Admin Reports matching Flutter ShopReportScreen & Admin Reports Overview exactly
import { Auth } from '../auth.js';
import { Store } from '../store.js';
import { UI } from '../ui.js';

export async function renderAdminReports(router, params = {}) {
  const container = document.createElement('div');
  container.className = 'view-screen';

  const shops = await Store.getShops();
  const shopId = params?.id;

  // If a specific shop ID is provided, render the Single Shop 360 View
  if (shopId) {
    const selectedShop = shops.find(s => s.id === shopId) || shops[0] || { name: 'Shop', id: shopId };
    return renderSingleShopReport(container, router, selectedShop, shops);
  }

  // Otherwise, render the All-Shops Overview Report Screen (matching Screenshots 3 & 4)
  return renderAllShopsReportOverview(container, router, shops);
}

// =============================================================================
// 1. ALL-SHOPS REPORT OVERVIEW (Screenshots 3 & 4)
// =============================================================================
async function renderAllShopsReportOverview(container, router, shops) {
  const allEntries = await Store.getEntries();
  const nonDeletedEntries = allEntries.filter(e => !e.isDeleted);
  const totalEnquiriesCount = nonDeletedEntries.length;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Fetch daily reports and target history
  const dailyReports = await Store.getDailyReports();
  const targetHistory = await Store.getTargetHistory(null, currentYear);
  const monthTargets = targetHistory.filter(t => t.targetMonth === currentMonth);

  const todayStr = now.toISOString().slice(0, 10);
  const activeShops = shops.filter(s => s.isActive !== false);

  // Compute metrics for each shop
  const shopCardData = shops.map(shop => {
    const sEntries = nonDeletedEntries.filter(e => e.shopId === shop.id);
    const wonCount = sEntries.filter(e => e.status === 'COMPLETED' && e.fitStatus !== 'NOT_FIT').length;
    const pendingCount = sEntries.filter(e => e.status === 'PENDING' && e.fitStatus !== 'NOT_FIT' && !e.isNoResponse && !e.isOverdue).length;

    const sReports = dailyReports.filter(r => (r.shopId || r.shop_id) === shop.id);
    const mReports = sReports.filter(r => {
      const d = new Date(r.reportDate || r.report_date);
      return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
    });

    const hasTodayReport = sReports.some(r => (r.reportDate || r.report_date || '').slice(0, 10) === todayStr);

    const target = monthTargets.find(t => (t.shopId || '').toString() === (shop.id || '').toString());
    const revenueTarget = target?.amountTarget ?? target?.targetAmount ?? 0;
    const tyreTarget = target?.tyreTarget ?? target?.targetTyres ?? 0;
    const achievedRevenue = target?.achievedAmount ?? target?.revenueAchieved ?? 0;
    const achievedTyres = target?.achievedTyres ?? target?.tyreAchieved ?? 0;
    const tyrePercentage = target?.tyresPercentage ?? (tyreTarget > 0 ? Math.round((achievedTyres / tyreTarget) * 100) : 0);
    const revenuePercentage = target?.amountPercentage ?? (revenueTarget > 0 ? Math.round((achievedRevenue / revenueTarget) * 100) : 0);

    return {
      ...shop,
      wonCount,
      pendingCount,
      reportsCount: mReports.length,
      hasTodayReport,
      revenueTarget,
      tyreTarget,
      achievedRevenue,
      achievedTyres,
      tyrePercentage,
      revenuePercentage
    };
  });

  const todayReportsCount = shopCardData.filter(s => s.hasTodayReport).length;

  container.innerHTML = `
    <!-- Top Dark Header matching Screenshot 4 -->
    <header class="app-header" style="position:relative; overflow:hidden;">
      <div class="header-row">
        <div class="header-info">
          <div class="header-title" style="font-size:26px;">Report</div>
          <div class="header-subtitle" style="font-size:12px; color:#DDD5C4;">Shop targets, performance & activity</div>
        </div>
        <div class="header-actions">
          <button id="rep-targets-goals-btn" style="background:rgba(53,49,46,0.9); border:1px solid rgba(255,255,255,0.18); color:#fff; border-radius:24px; padding:7px 15px; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(0,0,0,0.25);">
            <span>Targets & Goals</span>
          </button>
        </div>
      </div>
    </header>

    <div style="padding: 14px 18px 80px;">
      <!-- Search Input matching Screenshot 4 -->
      <div style="margin-bottom:14px;">
        <div style="display:flex; align-items:center; background:#FFFFFA; border:1px solid var(--border-color); border-radius:12px; padding:10px 14px; gap:10px; box-shadow:0 1px 3px rgba(34,32,30,0.02);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="report-shop-search" placeholder="Search shops by name or address..." style="border:none; outline:none; background:transparent; font-size:14px; font-family:var(--font-body); color:var(--text-main); width:100%;">
        </div>
      </div>

      <!-- KPI Overview Card (Active Shops / Today's Reports / Total Enquiries) matching Screenshot 4 -->
      <div style="background:#FFFFFA; border:1px solid var(--border-color); border-radius:14px; padding:16px 14px; display:flex; align-items:center; box-shadow:0 1px 3px rgba(34,32,30,0.02); margin-bottom:18px;">
        <div style="flex:1; text-align:center;">
          <div style="font-size:11.5px; color:var(--text-muted); font-weight:500; margin-bottom:5px;">Active Shops</div>
          <div style="font-family:var(--font-condensed); font-size:26px; font-weight:700; color:var(--text-main); line-height:1;">
            ${activeShops.length} / ${shops.length}
          </div>
        </div>
        <div style="width:1px; height:36px; background:var(--border-color);"></div>
        <div style="flex:1.2; text-align:center;">
          <div style="font-size:11.5px; color:var(--text-muted); font-weight:500; margin-bottom:5px;">Today's Reports</div>
          <div style="font-family:var(--font-condensed); font-size:26px; font-weight:700; line-height:1;">
            <span style="color:var(--accent-rust);">${todayReportsCount}</span> <span style="color:var(--text-muted); font-size:20px;">/</span> <span style="color:var(--accent-rust);">${activeShops.length}</span>
          </div>
        </div>
        <div style="width:1px; height:36px; background:var(--border-color);"></div>
        <div style="flex:1; text-align:center;">
          <div style="font-size:11.5px; color:var(--text-muted); font-weight:500; margin-bottom:5px;">Total Enquiries</div>
          <div style="font-family:var(--font-condensed); font-size:26px; font-weight:700; color:var(--accent-steel); line-height:1;">
            ${totalEnquiriesCount}
          </div>
        </div>
      </div>

      <!-- Section Title matching Screenshot 4 -->
      <div style="font-size:11.5px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-muted); margin-bottom:12px;">
        SELECT A SHOP TO VIEW REPORT & TARGETS (<span id="shop-count-label">${shops.length}</span>)
      </div>

      <!-- Shop Cards Container -->
      <div id="shop-cards-list" style="display:flex; flex-direction:column; gap:14px;"></div>
    </div>
  `;

  const listContainer = container.querySelector('#shop-cards-list');
  const countLabel = container.querySelector('#shop-count-label');

  function renderCards(filterText = '') {
    listContainer.innerHTML = '';
    const q = filterText.trim().toLowerCase();
    const filtered = shopCardData.filter(s =>
      !q || (s.name && s.name.toLowerCase().includes(q)) || (s.address && s.address.toLowerCase().includes(q))
    );

    countLabel.textContent = filtered.length;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="background:#FFFFFA; border:1px solid var(--border-color); border-radius:14px; padding:28px 16px; text-align:center; color:var(--text-muted); font-size:13.5px;">
          No matching shops found for "${filterText}".
        </div>
      `;
      return;
    }

    filtered.forEach(shop => {
      const card = document.createElement('div');
      card.className = 'shop-overview-card';
      card.style.cssText = 'background:#FFFFFA; border:1px solid var(--border-color); border-radius:16px; padding:16px 18px; box-shadow:0 1px 4px rgba(34,32,30,0.03); cursor:pointer; transition:transform 0.15s ease, box-shadow 0.15s ease;';

      card.innerHTML = `
        <!-- Shop Header Row -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:42px; height:42px; border-radius:10px; background:#FDEEE6; display:flex; align-items:center; justify-content:center; color:var(--accent-rust); flex-shrink:0;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div>
              <div style="font-family:var(--font-body); font-size:16.5px; font-weight:700; color:var(--text-main);">${shop.name}</div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:1px;">${shop.address || 'Ms nagar'}</div>
            </div>
          </div>
          <span style="font-size:11.5px; font-weight:600; color:#16A34A; background:#EAF7EE; padding:2.5px 8px; border-radius:8px;">
            ${shop.isActive !== false ? 'Active' : 'Inactive'}
          </span>
        </div>

        <!-- Target Metrics Row matching Screenshot 3 & 4 -->
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; font-size:13.5px;">
          <div>
            <span style="color:var(--text-sub); font-weight:500;">Tyres: </span>
            <span style="font-weight:700; color:var(--text-main);">${shop.achievedTyres} / ${shop.tyreTarget} (${shop.tyrePercentage}%)</span>
          </div>
          <div>
            <span style="font-weight:700; color:var(--accent-rust);">Sales Value: ₹${Number(shop.achievedRevenue).toLocaleString('en-IN')} / ₹${Number(shop.revenueTarget).toLocaleString('en-IN')} (${shop.revenuePercentage}%)</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="width:100%; height:6px; background:var(--border-color); border-radius:3px; overflow:hidden; margin-bottom:12px;">
          <div style="width:${Math.min(100, Math.max(shop.tyrePercentage > 0 ? 4 : 0, shop.tyrePercentage))}%; height:100%; background:var(--accent-rust); border-radius:3px; transition:width 0.4s ease;"></div>
        </div>

        <!-- Chips Row matching Screenshot 3 & 4 -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:14px;">
          ${shop.hasTodayReport ? `
            <div style="display:flex; align-items:center; gap:5px; background:#EFEAE0; color:#16A34A; padding:5px 10px; border-radius:8px; font-size:12px; font-weight:600;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Report Submitted</span>
            </div>
          ` : `
            <div style="display:flex; align-items:center; gap:5px; background:#EFEAE0; color:var(--text-main); padding:5px 10px; border-radius:8px; font-size:12px; font-weight:600;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>${shop.reportsCount > 0 ? 'Today Pe... ›' : 'Report Pending'}</span>
            </div>
          `}
          ${shop.reportsCount > 0 ? `
            <div style="display:flex; align-items:center; gap:5px; background:#EFEAE0; color:var(--accent-rust); padding:5px 10px; border-radius:8px; font-size:12px; font-weight:700;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>${shop.reportsCount}</span>
            </div>
          ` : ''}
          <div style="display:flex; align-items:center; gap:5px; background:#EFEAE0; color:var(--text-main); padding:5px 10px; border-radius:8px; font-size:12px; font-weight:600;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>${shop.wonCount} won · ${shop.pendingCount} pending</span>
          </div>
        </div>

        <!-- Action Link at Bottom -->
        <div style="border-top:1px solid var(--row-divider); padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; font-weight:700; color:var(--accent-rust); display:flex; align-items:center; gap:4px;">
            View Shop Report, Operations & Targets
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </div>
      `;

      card.addEventListener('click', () => {
        router.navigate(`/reports/shop/${shop.id}`);
      });

      listContainer.appendChild(card);
    });
  }

  renderCards();

  // Search filter event
  const searchInput = container.querySelector('#report-shop-search');
  searchInput.addEventListener('input', (e) => {
    renderCards(e.target.value);
  });

  // Targets & Goals header CTA
  container.querySelector('#rep-targets-goals-btn')?.addEventListener('click', () => {
    router.navigate('/targets');
  });

  return container;
}

// =============================================================================
// 2. SINGLE SHOP 360 REPORT (Tabs: Target & Goals, Daily Reports, Enquiries, Staff)
// =============================================================================
async function renderSingleShopReport(container, router, selectedShop, shops) {
  const targetData = await Store.getTargetDashboard(selectedShop.id);
  const dailyReports = await Store.getDailyReports(selectedShop.id);

  const now = new Date();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  let currentMonthIdx = now.getMonth();
  let currentYear = now.getFullYear();

  function getMonthYearStr() {
    return `${monthNames[currentMonthIdx]} ${currentYear}`;
  }

  function getMonthReports() {
    return dailyReports.filter(r => {
      const d = new Date(r.reportDate || r.report_date);
      return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
    });
  }

  let monthReports = getMonthReports();
  let totalCollection = monthReports.reduce((s, r) => s + (r.amount || 0), 0);
  let totalTyresSold = monthReports.reduce((s, r) => s + (r.totalTyres || 0), 0);
  let totalServices = monthReports.reduce((s, r) => s + (r.totalServices || 0), 0);

  container.innerHTML = `
    <!-- Sub Header: Back + Shop Name -->
    <div class="sub-header" style="background:var(--bg-paper); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; padding:calc(12px + var(--safe-top)) 18px 12px; position:sticky; top:0; z-index:10;">
      <div style="display:flex; align-items:center; gap:12px;">
        <button id="rep-back-btn" class="back-btn" style="width:34px; height:34px; border-radius:50%; background:none; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div>
          <div style="font-family:var(--font-condensed); font-size:22px; font-weight:700; color:var(--text-main); line-height:1.15;">${selectedShop.name}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:1px;">Shop Report & Targets</div>
        </div>
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <button id="rep-targets-direct-btn" title="Targets & Goals" style="background:none; border:none; color:var(--accent-rust); cursor:pointer; display:flex; align-items:center; padding:4px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-rust)" stroke-width="2.2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        </button>
        <button id="rep-refresh-btn" title="Refresh" style="background:none; border:none; color:var(--text-main); cursor:pointer; display:flex; align-items:center; padding:4px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>
      </div>
    </div>

    <!-- Shop Info Card -->
    <div style="padding:14px 20px 8px; display:flex; align-items:center; gap:12px;">
      <div style="width:40px; height:40px; border-radius:10px; background:rgba(193,68,14,0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-rust)" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4"/><path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/></svg>
      </div>
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:16px; font-weight:700; color:var(--text-main);">${selectedShop.name}</span>
          <span style="font-size:11px; font-weight:600; color:#16A34A; background:#EAF7EE; padding:2px 8px; border-radius:10px;">${selectedShop.isActive !== false ? 'Active' : 'Inactive'}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${selectedShop.address || 'Ms nagar'}</div>
      </div>
    </div>

    <!-- Month Selector Card -->
    <div style="padding:8px 20px 12px;">
      <div style="display:flex; align-items:center; justify-content:space-between; background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:10px 14px;">
        <button id="rep-prev-month" style="width:28px; height:28px; border:none; background:none; cursor:pointer; color:var(--text-main); display:flex; align-items:center; justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:16px;">📅</span>
          <span id="rep-month-label" style="font-size:14.5px; font-weight:600; color:var(--text-main);">${getMonthYearStr()}</span>
        </div>
        <button id="rep-next-month" style="width:28px; height:28px; border:none; background:none; cursor:pointer; color:var(--text-main); display:flex; align-items:center; justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <!-- Tabs: Target & Goals / Daily Reports / Enquiries / Staff -->
    <div style="display:flex; border-bottom:1px solid var(--border-color); position:sticky; top:60px; background:var(--bg-paper); z-index:5;">
      <button class="rep-tab active" data-tab="targets" style="flex:1; padding:12px 0 10px; text-align:center; font-size:12px; font-weight:600; color:var(--accent-rust); border:none; background:none; cursor:pointer; position:relative; border-bottom:2px solid var(--accent-rust); margin-bottom:-1px;">
        <div style="font-size:18px; margin-bottom:3px;">🎯</div>
        Target & Goals
      </button>
      <button class="rep-tab" data-tab="reports" style="flex:1; padding:12px 0 10px; text-align:center; font-size:12px; font-weight:600; color:var(--text-muted); border:none; background:none; cursor:pointer; position:relative;">
        <div style="font-size:18px; margin-bottom:3px;">📋</div>
        Daily Reports
      </button>
      <button class="rep-tab" data-tab="enquiries" style="flex:1; padding:12px 0 10px; text-align:center; font-size:12px; font-weight:600; color:var(--text-muted); border:none; background:none; cursor:pointer; position:relative;">
        <div style="font-size:18px; margin-bottom:3px;">👥</div>
        Enquiries
      </button>
      <button class="rep-tab" data-tab="staff" style="flex:1; padding:12px 0 10px; text-align:center; font-size:12px; font-weight:600; color:var(--text-muted); border:none; background:none; cursor:pointer; position:relative;">
        <div style="font-size:18px; margin-bottom:3px;">⚙️</div>
        Staff
      </button>
    </div>

    <!-- TAB CONTENT PANELS -->
    <!-- Target & Goals Tab -->
    <div id="panel-targets" class="tab-panel" style="padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <span style="font-size:17px; font-weight:700; color:var(--text-main);">${getMonthYearStr()} Target</span>
        <button id="rep-edit-target-btn" style="font-size:13px; font-weight:700; color:var(--accent-rust); background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:4px;">
          ✏️ Edit Target
        </button>
      </div>

      <!-- Tyre Sales Target Card -->
      <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:18px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:34px; height:34px; border-radius:8px; background:#EBF3FA; display:flex; align-items:center; justify-content:center; color:#35516B;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="22"/></svg>
            </div>
            <span style="font-size:15px; font-weight:700; color:var(--text-main);">Tyre Sales Target</span>
          </div>
          <span style="font-size:12px; font-weight:700; color:var(--accent-rust); background:#FDF2E9; padding:3px 10px; border-radius:10px;">${targetData.tyresPercentage}%</span>
        </div>
        <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:10px;">
          <span style="font-family:var(--font-condensed); font-size:38px; font-weight:700; color:var(--text-main); line-height:1;">${targetData.achievedTyres}</span>
          <span style="font-size:14px; color:var(--text-muted); font-weight:500;">/ ${targetData.targetTyres} tyres</span>
        </div>
        <div style="width:100%; height:7px; background:var(--border-color); border-radius:4px; overflow:hidden; margin-bottom:8px;">
          <div style="width:${Math.min(100, targetData.tyresPercentage)}%; height:100%; background:var(--accent-rust); border-radius:4px;"></div>
        </div>
        <div style="font-size:12px; color:var(--text-muted);">${targetData.remainingTyres} tyres remaining</div>
      </div>

      <!-- Sales Value Target Card -->
      <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:18px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:34px; height:34px; border-radius:8px; background:#FDF2E9; display:flex; align-items:center; justify-content:center; color:var(--accent-rust); font-weight:700; font-size:16px;">
              ₹
            </div>
            <span style="font-size:15px; font-weight:700; color:var(--text-main);">Sales Value Target</span>
          </div>
          <span style="font-size:12px; font-weight:700; color:${targetData.amountPercentage >= 100 ? '#16A34A' : 'var(--accent-rust)'}; background:${targetData.amountPercentage >= 100 ? '#EAF7EE' : '#FDF2E9'}; padding:3px 10px; border-radius:10px;">${targetData.amountPercentage}%</span>
        </div>
        <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:10px;">
          <span style="font-family:var(--font-condensed); font-size:38px; font-weight:700; color:var(--text-main); line-height:1;">₹${Number(targetData.achievedAmount).toLocaleString('en-IN')}</span>
          <span style="font-size:14px; color:var(--text-muted); font-weight:500;">/ ₹${Number(targetData.targetAmount).toLocaleString('en-IN')}</span>
        </div>
        <div style="width:100%; height:7px; background:var(--border-color); border-radius:4px; overflow:hidden; margin-bottom:8px;">
          <div style="width:${Math.min(100, targetData.amountPercentage)}%; height:100%; background:${targetData.amountPercentage >= 100 ? '#16A34A' : 'var(--accent-rust)'}; border-radius:4px;"></div>
        </div>
        <div style="font-size:12.5px; color:${targetData.amountPercentage >= 100 ? '#16A34A' : 'var(--text-muted)'}; font-weight:600;">
          ${targetData.amountPercentage >= 100 ? `Target Achieved! (+₹${(targetData.achievedAmount - targetData.targetAmount).toLocaleString('en-IN')})` : `₹${(targetData.targetAmount - targetData.achievedAmount).toLocaleString('en-IN')} remaining`}
        </div>
      </div>
    </div>

    <!-- Daily Reports Tab -->
    <div id="panel-reports" class="tab-panel" style="padding:20px; display:none;">
      <!-- Date Filter Chips -->
      <div style="display:flex; gap:8px; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; padding-bottom:14px; min-height:48px; -webkit-overflow-scrolling:touch; align-items:center;">
        <button class="dr-chip active" data-dr="month" style="height:34px; padding:0 16px; border-radius:20px; font-size:13px; font-weight:700; background:var(--accent-rust); color:#fff; border:none; cursor:pointer; white-space:nowrap; flex-shrink:0;">This Month</button>
        <button class="dr-chip" data-dr="today" style="height:34px; padding:0 16px; border-radius:20px; font-size:13px; font-weight:600; background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); cursor:pointer; white-space:nowrap; flex-shrink:0;">Today</button>
        <button class="dr-chip" data-dr="yesterday" style="height:34px; padding:0 16px; border-radius:20px; font-size:13px; font-weight:600; background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); cursor:pointer; white-space:nowrap; flex-shrink:0;">Yesterday</button>
        <button class="dr-chip" data-dr="all" style="height:34px; padding:0 16px; border-radius:20px; font-size:13px; font-weight:600; background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); cursor:pointer; white-space:nowrap; flex-shrink:0;">All</button>
      </div>

      <!-- Aggregated Stats Summary Card -->
      <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:16px 18px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="flex:1.2;">
            <div style="font-size:11.5px; color:var(--text-muted); font-weight:500; margin-bottom:4px;">Total Collection</div>
            <div style="font-family:var(--font-condensed); font-size:26px; font-weight:700; color:var(--accent-rust); line-height:1;">${UI.formatCurrency(totalCollection)}</div>
          </div>
          <div style="border-left:1px solid var(--border-color); padding-left:18px; flex:1;">
            <div style="font-size:11.5px; color:var(--text-muted); font-weight:500; margin-bottom:4px;">Tyres Sold</div>
            <div style="font-family:var(--font-condensed); font-size:26px; font-weight:700; color:var(--text-main); line-height:1;">${totalTyresSold}</div>
          </div>
          <div style="border-left:1px solid var(--border-color); padding-left:18px; flex:1;">
            <div style="font-size:11.5px; color:var(--text-muted); font-weight:500; margin-bottom:4px;">Services</div>
            <div style="font-family:var(--font-condensed); font-size:26px; font-weight:700; color:var(--text-main); line-height:1;">${totalServices}</div>
          </div>
        </div>
      </div>

      <!-- Section Header -->
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">
        <span style="font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted);">DAY-WISE REPORTS (${monthReports.length})</span>
        <span style="font-size:11.5px; color:var(--text-muted);">Tap report for breakdown</span>
      </div>

      <!-- Daily Report Cards List -->
      <div id="daily-reports-list"></div>
    </div>

    <!-- Enquiries Tab -->
    <div id="panel-enquiries" class="tab-panel" style="padding:20px; display:none;">
      <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
        <div style="font-size:36px; margin-bottom:8px;">📋</div>
        <div style="font-size:15px; font-weight:600; color:var(--text-main);">Shop Enquiries</div>
        <div style="font-size:12px; margin-top:4px;">View all entries for this shop from the main Entries tab.</div>
        <button id="goto-entries-btn" class="btn-dark-cta" style="margin:16px auto 0; max-width:200px;">View Entries</button>
      </div>
    </div>

    <!-- Staff Tab -->
    <div id="panel-staff" class="tab-panel" style="padding:20px; display:none;">
      <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
        <div style="font-size:36px; margin-bottom:8px;">👥</div>
        <div style="font-size:15px; font-weight:600; color:var(--text-main);">Staff Management</div>
        <div style="font-size:12px; margin-top:4px;">Manage team members from the Manage tab.</div>
        <button id="goto-manage-btn" class="btn-dark-cta" style="margin:16px auto 0; max-width:200px;">Manage Staff</button>
      </div>
    </div>
  `;

  // Daily Report Detail Sheet matching Flutter daily_report_detail_sheet.dart
  function showDailyReportSheet(report, shop) {
    const d = new Date(report.reportDate || report.report_date);
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dateTitle = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    const sheetHtml = `
      <div style="padding-top:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
          <div>
            <div style="font-family:var(--font-condensed); font-size:22px; font-weight:700; color:var(--text-main);">${dateTitle}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${shop.name} · ${shop.address || 'Ms nagar'}</div>
          </div>
          <button id="close-sheet-btn" style="width:30px; height:30px; border-radius:50%; background:var(--field-bg); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; color:var(--text-muted);">✕</button>
        </div>

        <!-- Total Collection Banner -->
        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); font-weight:600;">Total Day Collection</div>
            <div style="font-family:var(--font-condensed); font-size:32px; font-weight:700; color:var(--accent-rust); line-height:1.1;">₹${Number(report.amount || 0).toFixed(2)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px; font-weight:700; color:var(--text-main);">${report.totalTyres || 0} Tyres</div>
            <div style="font-size:12px; color:var(--text-muted);">${report.totalServices || 0} Services</div>
          </div>
        </div>

        <!-- Breakdown: Tyres Sold -->
        <div style="margin-bottom:16px;">
          <div style="font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:8px; display:flex; justify-content:space-between;">
            <span>Tyres Breakdown</span>
            <span>${report.totalTyres || 0} total</span>
          </div>
          <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:8px;">
            ${(report.metrics || []).filter(m => m.label.toLowerCase().includes('tyre') || m.label.toLowerCase().includes('above 17')).map(m => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                <span style="color:var(--text-main); font-weight:500;">${m.label}</span>
                <span style="font-weight:700; color:${m.count > 0 ? 'var(--accent-rust)' : 'var(--text-muted)'}; background:${m.count > 0 ? 'rgba(193,68,14,0.08)' : 'transparent'}; padding:2px 8px; border-radius:8px;">${m.count}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Breakdown: Services -->
        <div style="margin-bottom:16px;">
          <div style="font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:8px; display:flex; justify-content:space-between;">
            <span>Services Performed</span>
            <span>${report.totalServices || 0} total</span>
          </div>
          <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:8px;">
            ${(report.metrics || []).filter(m => m.label.toLowerCase().includes('alignment') || m.label.toLowerCase().includes('wash') || m.label.toLowerCase().includes('service')).map(m => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                <span style="color:var(--text-main); font-weight:500;">${m.label}</span>
                <span style="font-weight:700; color:${m.count > 0 ? 'var(--status-done)' : 'var(--text-muted)'}; background:${m.count > 0 ? 'rgba(46,125,50,0.08)' : 'transparent'}; padding:2px 8px; border-radius:8px;">${m.count}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <button id="sheet-done-btn" class="btn-dark-cta" style="margin-top:12px;">Close Breakdown</button>
      </div>
    `;

    UI.showModal(sheetHtml, {
      onMounted(modal) {
        modal.querySelector('#close-sheet-btn')?.addEventListener('click', () => UI.hideModal());
        modal.querySelector('#sheet-done-btn')?.addEventListener('click', () => UI.hideModal());
      }
    });
  }

  // Render Daily Report Cards
  const drList = container.querySelector('#daily-reports-list');
  function renderDailyReports(reports) {
    drList.innerHTML = '';
    if (reports.length === 0) {
      drList.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-muted); font-size:13px;">No reports for this period.</div>';
      return;
    }
    reports.forEach(report => {
      const d = new Date(report.reportDate || report.report_date);
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dateStr = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      const card = document.createElement('div');
      card.style.cssText = 'background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:16px; margin-bottom:14px; cursor:pointer; box-shadow:0 1px 3px rgba(34,32,30,0.03);';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">📅</span>
            <span style="font-size:15px; font-weight:700; color:var(--text-main);">${dateStr}</span>
          </div>
          <span style="font-family:var(--font-condensed); font-size:17px; font-weight:700; color:var(--accent-rust);">₹${Number(report.amount || 0).toFixed(2)}</span>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
          ${(report.metrics || []).map(m => `
            <span style="font-size:11.5px; font-weight:500; padding:4px 10px; border-radius:8px; background:#FDFBF7; color:var(--text-main); border:1px solid #E8E2D5;">
              ${m.label}: <b style="color:${m.count > 0 ? 'var(--accent-rust)' : 'var(--text-muted)'}; font-weight:700;">${m.count}</b>
            </span>
          `).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px; border-top:1px solid var(--row-divider); padding-top:10px;">
          <span style="color:var(--accent-steel); font-weight:600;">Total Tyres: ${report.totalTyres || 0} · Total Services: ${report.totalServices || 0}</span>
          <span style="color:var(--accent-rust); font-weight:700; display:flex; align-items:center; gap:2px;">View Breakdown ›</span>
        </div>
      `;
      card.addEventListener('click', () => showDailyReportSheet(report, selectedShop));
      drList.appendChild(card);
    });
  }
  renderDailyReports(monthReports);

  // Tab switching
  container.querySelectorAll('.rep-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.rep-tab').forEach(t => {
        t.style.color = 'var(--text-muted)';
        t.style.borderBottom = 'none';
        t.style.marginBottom = '0';
      });
      tab.style.color = 'var(--accent-rust)';
      tab.style.borderBottom = '2px solid var(--accent-rust)';
      tab.style.marginBottom = '-2px';

      container.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
      container.querySelector(`#panel-${tab.dataset.tab}`).style.display = 'block';
    });
  });

  // Daily report date filter chips
  container.querySelectorAll('.dr-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.dr-chip').forEach(c => {
        c.style.background = 'var(--card-bg)';
        c.style.color = 'var(--text-main)';
        c.style.border = '1px solid var(--border-color)';
      });
      chip.style.background = 'var(--accent-rust)';
      chip.style.color = '#fff';
      chip.style.border = 'none';

      const filter = chip.dataset.dr;
      if (filter === 'all') {
        renderDailyReports(dailyReports);
      } else if (filter === 'month') {
        renderDailyReports(monthReports);
      } else if (filter === 'today') {
        const today = new Date().toISOString().slice(0, 10);
        renderDailyReports(dailyReports.filter(r => (r.reportDate || r.report_date || '').slice(0, 10) === today));
      } else if (filter === 'yesterday') {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().slice(0, 10);
        renderDailyReports(dailyReports.filter(r => (r.reportDate || r.report_date || '').slice(0, 10) === yStr));
      }
    });
  });

  // Navigation
  container.querySelector('#rep-back-btn')?.addEventListener('click', () => router.navigate('/reports'));
  container.querySelector('#goto-entries-btn')?.addEventListener('click', () => router.navigate('/entries'));
  container.querySelector('#goto-manage-btn')?.addEventListener('click', () => router.navigate('/manage'));
  container.querySelector('#rep-refresh-btn')?.addEventListener('click', () => window.location.reload());
  container.querySelector('#rep-targets-direct-btn')?.addEventListener('click', () => router.navigate('/targets'));

  // Edit target button in shop 360
  container.querySelector('#rep-edit-target-btn')?.addEventListener('click', () => {
    router.navigate('/targets');
  });

  return container;
}
