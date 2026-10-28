// Employee Home Tab matching Flutter HomeTab
import { Auth } from '../auth.js';
import { Store } from '../store.js';
import { UI } from '../ui.js';

export async function renderEmployeeHome(router) {
  const container = document.createElement('div');
  container.className = 'view-screen';

  const user = Auth.getUser();
  const shopId = Auth.getActiveShopId();
  const shop = await Store.getShopById(shopId);
  const shopName = shop?.name || 'Anna Nagar';

  // Fetch entries & target dashboard
  const entries = await Store.getEntries(shopId);
  const targetData = await Store.getTargetDashboard(shopId);

  // Filter entries
  const activePending = entries.filter(e => (e.status || 'PENDING') === 'PENDING' && (e.fitStatus || 'FIT') === 'FIT');
  const attentionEntries = activePending.filter(e => e.needsAttention);
  const overdueEntries = activePending.filter(e => e.isOverdue);
  const dueTodayOrTomorrow = activePending.filter(e => e.isDueToday || e.isDueTomorrow);

  const heroDueCount = attentionEntries.length.toString().padStart(2, '0');
  const heroDateTag = UI.formatDate(new Date(), 'hero');

  // Warning text
  let bannerText = '';
  if (dueTodayOrTomorrow.length > 0 && overdueEntries.length > 0) {
    bannerText = `${dueTodayOrTomorrow.length} due today/tomorrow, ${overdueEntries.length} overdue`;
  } else if (dueTodayOrTomorrow.length > 0) {
    bannerText = `${dueTodayOrTomorrow.length} follow-up${dueTodayOrTomorrow.length > 1 ? 's' : ''} due today or tomorrow`;
  } else if (overdueEntries.length > 0) {
    bannerText = `${overdueEntries.length} follow-up${overdueEntries.length > 1 ? 's' : ''} overdue`;
  }

  container.innerHTML = `
    <!-- Dark App Header -->
    <header class="app-header">
      <div class="header-row">
        <div class="header-info">
          <div class="header-title">${shopName}</div>
          <div class="header-subtitle">${user?.name || 'Staff Member'}</div>
        </div>
        <div class="header-actions">
          <button id="home-add-btn" class="header-add-btn">
            ${UI.icons.plus(14)} New Entry
          </button>
        </div>
      </div>
    </header>

    <!-- Hero Stat -->
    <div class="hero-stat-card">
      <div class="hero-number">${heroDueCount}</div>
      <div class="hero-meta">
        <div class="hero-label">follow-ups due</div>
        <div class="hero-date-tag">${heroDateTag}</div>
      </div>
    </div>

    <!-- Monthly Target Dashboard Card -->
    <div class="target-dashboard-card" id="target-card">
      <div class="target-card-header">
        <div class="target-card-title-group">
          <div class="target-icon-wrap">
            ${UI.icons.chart(16)}
          </div>
          <div>
            <div class="target-card-title">Target Dashboard</div>
            <div class="target-period-sub">${targetData.formattedPeriod}</div>
          </div>
        </div>
        <span class="target-status-badge ${targetData.isOverallAchieved ? 'achieved' : 'in-progress'}">
          ${targetData.isOverallAchieved ? 'Target Achieved' : 'In Progress'}
        </span>
      </div>

      <!-- Metric 1: Amount -->
      <div class="target-metric">
        <div class="metric-header">
          <span class="metric-name">Sales Value Target</span>
          <span class="metric-values">${UI.formatCurrency(targetData.achievedAmount)} / ${UI.formatCurrency(targetData.targetAmount)} (${targetData.amountPercentage}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill amount ${targetData.amountPercentage >= 100 ? 'done' : ''}" style="width: ${targetData.amountPercentage}%;"></div>
        </div>
      </div>

      <!-- Metric 2: Tyres -->
      <div class="target-metric">
        <div class="metric-header">
          <span class="metric-name">Tyres Target</span>
          <span class="metric-values">${targetData.achievedTyres} / ${targetData.targetTyres} tyres (${targetData.tyresPercentage}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill tyres ${targetData.tyresPercentage >= 100 ? 'done' : ''}" style="width: ${targetData.tyresPercentage}%;"></div>
        </div>
      </div>

      <!-- Footer -->
      <div class="target-card-footer">
        <span class="target-footer-remaining">
          ${targetData.isOverallAchieved ? 'Target completed' : `${UI.formatCurrency(targetData.remainingAmount)} remaining`}
        </span>
        <span class="target-footer-action">
          View Details ${UI.icons.chevronRight(14)}
        </span>
      </div>
    </div>

    <!-- Warning Notice Banner -->
    ${bannerText ? `
      <div class="notice-warn-card">
        <span class="icon">${UI.icons.clock(16)}</span>
        <span class="text">${bannerText}</span>
      </div>
    ` : ''}

    <!-- Daily Report CTA Button -->
    <button id="home-daily-report-btn" class="btn-dark-cta">
      ${UI.icons.list(18)} Daily Report
    </button>

    <!-- Add Follow-up CTA Button -->
    <button id="home-primary-cta" class="btn-primary-cta">
      + Add Follow-Up / Enquiry
    </button>

    <!-- Section Head: Today's queue -->
    <div class="section-head">
      <span class="title">Today's Queue</span>
      <button id="view-all-pending-btn" class="action-link">View all</button>
    </div>

    <!-- Entries List -->
    <div id="home-entries-list">
      ${attentionEntries.length === 0 ? `
        <div style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
          <div style="color: var(--status-done); margin-bottom: 8px;">${UI.icons.checkCircle(38)}</div>
          <div style="font-size: 15px; font-weight: 600; color: var(--text-main);">You're all caught up!</div>
          <div style="font-size: 12px; margin-top: 4px;">No urgent pending follow-ups right now.</div>
        </div>
      ` : ''}
    </div>
  `;

  // Populate Queue Rows
  const listEl = container.querySelector('#home-entries-list');
  const displayEntries = attentionEntries.slice(0, 5);

  displayEntries.forEach((entry, idx) => {
    if (idx > 0) {
      const divider = document.createElement('div');
      divider.className = 'status-row-divider';
      listEl.appendChild(divider);
    }

    const row = document.createElement('div');
    row.className = `status-row ${entry.isOverdue ? 'overdue' : (entry.isDueToday ? 'pending' : '')}`;
    row.innerHTML = `
      <div class="status-row-info">
        <div class="status-row-name">${entry.customerName || 'Customer'}</div>
        <div class="status-row-sub">
          <span>${entry.vehicleNumber || entry.vehicleDetails || 'Vehicle'}</span>
          <span>•</span>
          <span style="color: ${entry.isOverdue ? 'var(--status-overdue)' : 'var(--text-sub)'}; font-weight: 500;">
            ${UI.formatDate(entry.followUpDate, 'relative')}
          </span>
        </div>
      </div>

      <div class="row-quick-actions">
        <a href="tel:${entry.mobileNumber}" class="quick-action-btn call" title="Call Customer">
          ${UI.icons.phone(14)}
        </a>
        <a href="https://wa.me/91${entry.mobileNumber}?text=Hi%20${encodeURIComponent(entry.customerName)},%20regarding%20your%20tyre%20enquiry%20at%20${encodeURIComponent(shopName)}" target="_blank" class="quick-action-btn whatsapp" title="WhatsApp">
          ${UI.icons.whatsapp(14)}
        </a>
      </div>

      <span class="status-badge ${entry.isOverdue ? 'overdue' : 'pending'}">
        ${entry.isOverdue ? 'OVERDUE' : 'PENDING'}
      </span>
    `;

    row.querySelector('.status-row-info').addEventListener('click', () => {
      router.navigate(`/employee/entry/${entry.id}`);
    });

    listEl.appendChild(row);
  });

  // Attach button navigation events
  container.querySelector('#home-add-btn')?.addEventListener('click', () => router.navigate('/employee/add-enquiry'));
  container.querySelector('#home-primary-cta')?.addEventListener('click', () => router.navigate('/employee/add-enquiry'));
  container.querySelector('#home-daily-report-btn')?.addEventListener('click', () => router.navigate('/employee/daily-report'));
  container.querySelector('#view-all-pending-btn')?.addEventListener('click', () => router.navigate('/employee/pending'));
  container.querySelector('#target-card')?.addEventListener('click', () => router.navigate('/employee/targets'));

  return container;
}
