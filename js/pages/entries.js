// Tyros Admin - Customer Entries View (js/pages/entries.js)
// Featuring Not Fitted and No Response separate filter pills, Excel export, and card actions
import { Store } from '../store.js';
import { UI } from '../ui.js';
import { Sheet } from '../sheet.js';
import { Toast } from '../toast.js';

export async function renderEntriesPage(router, params = {}) {
  const container = document.createElement('div');
  container.className = 'page-container';

  // State
  // Allowed activeFilter: 'all' | 'pending' | 'overdue' | 'completed' | 'not_fitted' | 'no_response'
  let activeFilter = params.filter ? params.filter.toLowerCase() : 'all';
  if (activeFilter === 'other') activeFilter = 'not_fitted';
  let selectedShopId = params.shopId || 'all';
  let selectedTimeFilter = params.time || 'all';
  let selectedCustomDate = params.date || null;
  if (selectedCustomDate) {
    selectedTimeFilter = 'custom';
  }
  let searchQuery = '';
  let allEntries = [];
  let shops = [];
  let isFetching = false;

  // Helper: check if entry belongs to the selected shop
  function entryBelongsToShop(entry, targetShopId) {
    if (!targetShopId || targetShopId === 'all') return true;
    const targetIdStr = targetShopId.toString().trim();
    const entryShopIdStr = (entry.shopId || '').toString().trim();
    if (entryShopIdStr && entryShopIdStr === targetIdStr) return true;

    const targetShop = shops.find(s => (s.id || '').toString().trim() === targetIdStr);
    if (targetShop && targetShop.name && entry.shopName) {
      if (entry.shopName.trim().toLowerCase() === targetShop.name.trim().toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  // Date utilities for Find Date calendar
  function getEntryDate(entry) {
    const raw = entry.followUpDate || entry.follow_up_date || entry.createdAt || entry.created_at || entry.date;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatYMD(d) {
    if (!d || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDateDisplay(ymd) {
    if (!ymd) return '';
    const parts = ymd.split('-');
    if (parts.length !== 3) return ymd;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function entryMatchesYMD(entry, ymd) {
    if (!ymd) return false;
    const raw = entry.followUpDate || entry.follow_up_date || entry.createdAt || entry.created_at || entry.date;
    if (!raw) return false;
    if (typeof raw === 'string' && raw.slice(0, 10) === ymd) return true;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    return formatYMD(d) === ymd;
  }

  function getEntriesForDate(ymd, shopId = selectedShopId) {
    const nonDeleted = allEntries.filter(e => !e.isDeleted);
    return nonDeleted.filter(e => {
      if (!entryBelongsToShop(e, shopId)) return false;
      return entryMatchesYMD(e, ymd);
    });
  }

  // Helper: check if entry matches the selected time range
  function matchesTimeFilter(entry, timeFilter) {
    if (!timeFilter || timeFilter === 'all') return true;
    if (timeFilter === 'custom') {
      if (!selectedCustomDate) return true;
      return entryMatchesYMD(entry, selectedCustomDate);
    }
    const d = getEntryDate(entry);
    if (!d) return true;

    const now = new Date();
    if (timeFilter === 'today') {
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth() &&
             d.getDate() === now.getDate();
    }
    if (timeFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneWeekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return d >= oneWeekAgo && d <= oneWeekAhead;
    }
    if (timeFilter === 'month') {
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth();
    }
    return true;
  }

  // Initials generator
  function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  const avatarPalettes = [
    { bg: '#FEE2E2', text: '#DC2626' },
    { bg: '#FCE7F3', text: '#DB2777' },
    { bg: '#DCFCE7', text: '#16A34A' },
    { bg: '#FFEDD5', text: '#EA580C' },
    { bg: '#EDE9FE', text: '#7C3AED' },
    { bg: '#E0F2FE', text: '#0284C7' }
  ];

  function getAvatarColors(name) {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarPalettes[Math.abs(hash) % avatarPalettes.length];
  }

  // Render Skeleton while initial fetch happens
  container.innerHTML = `
    <header class="app-header mobile-only-header">
      <div class="app-header-row">
        <div class="app-header-info">
          <h1 class="app-header-title">All Entries</h1>
          <div class="app-header-subtitle">Loading records...</div>
        </div>
      </div>
    </header>
    <div style="padding-top: var(--space-4);">
      <div class="skeleton" style="height: 44px; border-radius: var(--radius-md); margin-bottom: var(--space-3);"></div>
      <div class="skeleton" style="height: 36px; border-radius: var(--radius-pill); margin-bottom: var(--space-4);"></div>
      <div style="display:flex; flex-direction:column; gap:var(--space-3);">
        <div class="skeleton" style="height: 120px; border-radius:var(--radius-lg);"></div>
        <div class="skeleton" style="height: 120px; border-radius:var(--radius-lg);"></div>
        <div class="skeleton" style="height: 120px; border-radius:var(--radius-lg);"></div>
      </div>
    </div>
  `;

  async function loadData() {
    if (isFetching) return;
    isFetching = true;
    try {
      const [entriesData, shopsData] = await Promise.all([
        Store.getEntries({ limit: 100 }),
        Store.getShops()
      ]);
      allEntries = entriesData || [];
      shops = shopsData || [];
      renderUI();
    } catch (err) {
      console.error('[Entries] Load error:', err);
      container.innerHTML = `
        <div style="text-align:center; padding: 48px var(--space-4); background:var(--bg-surface); border:1px solid var(--border-default); border-radius:var(--radius-xl); margin-top:var(--space-4);">
          <div style="font-size: 36px; margin-bottom: 8px;">⚠️</div>
          <h2 style="font-family:var(--font-display); font-size: 24px; color:var(--status-overdue); margin-bottom: 6px;">Failed to load entries</h2>
          <p style="font-size: 13.5px; color:var(--text-muted); margin-bottom: 20px;">${UI.escape(err.message || 'Network error')}</p>
          <button id="entries-retry-btn" class="btn-primary" style="margin: 0 auto;">Retry</button>
        </div>
      `;
      container.querySelector('#entries-retry-btn')?.addEventListener('click', loadData);
    } finally {
      isFetching = false;
    }
  }

  function getShopBaseEntries() {
    const nonDeleted = allEntries.filter(e => !e.isDeleted);
    return nonDeleted.filter(e => {
      if (!entryBelongsToShop(e, selectedShopId)) return false;
      if (selectedTimeFilter !== 'all' && !matchesTimeFilter(e, selectedTimeFilter)) return false;
      return true;
    });
  }

  function getFilteredEntries(shopBaseEntries) {
    return shopBaseEntries.filter(e => {
      // Status pill filter
      if (activeFilter === 'pending') {
        if (e.status !== 'PENDING' || e.fitStatus === 'NOT_FIT' || e.fit_status === 'NOT_FIT' || e.isNoResponse || e.isOverdue) return false;
      } else if (activeFilter === 'overdue') {
        if (!e.isOverdue) return false;
      } else if (activeFilter === 'completed') {
        if (e.status !== 'COMPLETED' || e.fitStatus === 'NOT_FIT' || e.fit_status === 'NOT_FIT') return false;
      } else if (activeFilter === 'not_fitted') {
        // Not Fitted / Lost
        const isNotFit = e.fitStatus === 'NOT_FIT' || e.fit_status === 'NOT_FIT' || e.status === 'LOST';
        if (!isNotFit) return false;
      } else if (activeFilter === 'no_response') {
        // No Response
        const isNoResp = e.status === 'NO_RESPONSE' || e.isNoResponse || e.is_no_response;
        if (!isNoResp) return false;
      }

      // Search query (debounced)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (e.customerName || '').toLowerCase().includes(q);
        const matchPhone = (e.mobileNumber || '').includes(q);
        const matchReg = (e.vehicleNumber || '').toLowerCase().includes(q);
        const matchModel = (e.vehicleDetails || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchReg && !matchModel) return false;
      }

      return true;
    });
  }

  // Export filtered entries to CSV / Excel
  function exportToExcel(records) {
    if (!records || records.length === 0) {
      Toast.show('No records to export', 'warning');
      return;
    }

    const headers = ['Customer Name', 'Phone', 'Vehicle Reg', 'Vehicle Details', 'Tyre Spec', 'Amount', 'Branch', 'Status', 'Date'];
    const rows = records.map(r => [
      `"${(r.customerName || '').replace(/"/g, '""')}"`,
      `"${r.mobileNumber || ''}"`,
      `"${(r.vehicleNumber || '').replace(/"/g, '""')}"`,
      `"${(r.vehicleDetails || '').replace(/"/g, '""')}"`,
      `"${r.tyreBrand || ''} ${r.tyreSize || ''}"`,
      r.amount || 0,
      `"${(r.shopName || '').replace(/"/g, '""')}"`,
      `"${r.status || ''}"`,
      `"${r.dateText || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tyros-enquiries-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Toast.show(`Exported ${records.length} records to Excel CSV`, 'success');
  }

  function showEntryDetailSheet(entry) {
    const avatarColor = getAvatarColors(entry.customerName);
    const detailContent = document.createElement('div');
    detailContent.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
        <div style="width:48px; height:48px; border-radius:var(--radius-pill); background:${avatarColor.bg}; color:${avatarColor.text}; font-family:var(--font-display); font-size:20px; font-weight:700; display:flex; align-items:center; justify-content:center;">
          ${getInitials(entry.customerName)}
        </div>
        <div>
          <div style="font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--text-primary); line-height:1.2;">
            ${UI.escape(entry.customerName)}
          </div>
          <a href="tel:${entry.mobileNumber}" style="font-size:13px; color:var(--accent); font-weight:600; text-decoration:none;">
            📞 ${UI.escape(entry.mobileNumber)}
          </a>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; font-size:13.5px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">Vehicle Registration</span>
          <strong>${UI.escape(entry.vehicleNumber || 'Not Provided')}</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">Vehicle Model</span>
          <span>${UI.escape(entry.vehicleDetails || 'Four Wheeler')}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">Tyre Spec</span>
          <span>${UI.escape(entry.tyreSize)} ${UI.escape(entry.tyreBrand)} (${entry.quantity} units)</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">Estimated Amount</span>
          <strong style="color:var(--accent); font-size:15px;">₹${Number(entry.amount || 0).toLocaleString('en-IN')}</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">Branch</span>
          <span>${UI.escape(entry.shopName || 'Workshop')}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">Status</span>
          <span style="font-weight:700; text-transform:uppercase; font-size:11.5px; padding:2px 8px; border-radius:6px; background:${entry.status === 'COMPLETED' ? 'rgba(22,163,74,0.15)' : 'rgba(234,88,12,0.15)'}; color:${entry.status === 'COMPLETED' ? 'var(--status-completed)' : 'var(--status-pending)'};">
            ${UI.escape(entry.status)}
          </span>
        </div>
        ${entry.remarks ? `
          <div style="border-top:1px dashed var(--border-default); padding-top:8px; margin-top:2px;">
            <div style="font-size:11.5px; color:var(--text-muted);">Remarks</div>
            <div style="font-size:13px; color:var(--text-primary); margin-top:2px;">${UI.escape(entry.remarks)}</div>
          </div>
        ` : ''}
      </div>
    `;

    Sheet.show({
      title: 'Enquiry Details',
      contentEl: detailContent,
      actions: [
        { label: 'Close', primary: true, fullWidth: true }
      ]
    });
  }

  function openCalendarSheet() {
    let calViewDate = selectedCustomDate ? new Date(selectedCustomDate + 'T00:00:00') : new Date();
    if (isNaN(calViewDate.getTime())) calViewDate = new Date();
    let calSelectedDate = selectedCustomDate || formatYMD(new Date());

    const calContainer = document.createElement('div');
    calContainer.className = 'cal-modal-wrap';

    function renderCalView() {
      const year = calViewDate.getFullYear();
      const month = calViewDate.getMonth();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthTitle = `${monthNames[month]} ${year}`;

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const todayYMD = formatYMD(new Date());

      // Pre-calculate entry counts for this month in current shop
      const countMap = {};
      const shopEntries = allEntries.filter(e => !e.isDeleted && entryBelongsToShop(e, selectedShopId));
      shopEntries.forEach(e => {
        const d = getEntryDate(e);
        if (d) {
          const ymd = formatYMD(d);
          countMap[ymd] = (countMap[ymd] || 0) + 1;
        }
      });

      // Get matching entries for the currently selected date in the calendar
      const selectedDayEntries = shopEntries.filter(e => entryMatchesYMD(e, calSelectedDate));

      calContainer.innerHTML = `
        <!-- Month Navigation Bar -->
        <div class="cal-nav-bar">
          <div style="display:flex; align-items:center; gap:8px;">
            <button id="cal-prev-btn" class="cal-nav-btn" type="button" title="Previous Month">◀</button>
            <span class="cal-month-title">${monthTitle}</span>
            <button id="cal-next-btn" class="cal-nav-btn" type="button" title="Next Month">▶</button>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button id="cal-today-btn" class="cal-today-btn" type="button" title="Jump to Today">Today</button>
          </div>
        </div>

        <!-- Jump to Specific Date Quick Input -->
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:var(--bg-subtle); padding:6px 12px; border-radius:10px;">
          <span style="font-size:12.5px; font-weight:600; color:var(--text-secondary);">Direct Date:</span>
          <input type="date" id="cal-date-input" value="${calSelectedDate}" style="border:1px solid var(--border-default); border-radius:6px; padding:3px 8px; font-size:12.5px; background:var(--bg-surface); color:var(--text-primary); cursor:pointer;" />
        </div>

        <!-- Weekdays Header -->
        <div class="cal-weekdays">
          <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
        </div>

        <!-- Days Grid -->
        <div id="cal-grid" class="cal-grid"></div>

        <!-- Selected Day's Queue & Details -->
        <div class="cal-day-details-box">
          <div class="cal-day-header">
            <div>
              <div class="cal-day-title">📅 Records for ${formatDateDisplay(calSelectedDate)}</div>
              <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">
                ${selectedDayEntries.length} ${selectedDayEntries.length === 1 ? 'customer record' : 'customer records'} found
              </div>
            </div>
            ${selectedDayEntries.length > 0 ? `
              <button id="cal-apply-direct-btn" type="button" class="btn-primary" style="font-size:12px; height:30px; padding:0 12px; border-radius:8px;">
                Show on Page (${selectedDayEntries.length})
              </button>
            ` : ''}
          </div>

          <div class="cal-entries-scroll" id="cal-entries-list">
            ${selectedDayEntries.length === 0 ? `
              <div style="text-align:center; padding:22px 10px; color:var(--text-muted); font-size:13px;">
                No enquiries or follow-ups recorded on this date.
              </div>
            ` : selectedDayEntries.map(entry => {
              const avatar = getAvatarColors(entry.customerName);
              const cleanPhone = (entry.mobileNumber || '').replace(/\D/g, '');
              let badgeBg = 'rgba(234,88,12,0.12)';
              let badgeColor = 'var(--status-pending)';
              let badgeText = entry.status || 'PENDING';
              if (entry.fitStatus === 'NOT_FIT' || entry.fit_status === 'NOT_FIT' || entry.status === 'LOST') {
                badgeBg = 'rgba(225,29,72,0.12)';
                badgeColor = '#E11D48';
                badgeText = 'NOT FITTED';
              } else if (entry.status === 'NO_RESPONSE' || entry.isNoResponse) {
                badgeBg = 'rgba(124,58,237,0.12)';
                badgeColor = '#7C3AED';
                badgeText = 'NO RESPONSE';
              } else if (entry.status === 'COMPLETED') {
                badgeBg = 'rgba(22,163,74,0.12)';
                badgeColor = 'var(--status-completed)';
                badgeText = 'COMPLETED';
              }

              return `
                <div class="cal-entry-item" data-id="${entry.id}">
                  <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
                    <div style="width:34px; height:34px; border-radius:50%; background:${avatar.bg}; color:${avatar.text}; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; flex-shrink:0;">
                      ${getInitials(entry.customerName)}
                    </div>
                    <div style="min-width:0; flex:1;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-weight:700; font-size:13.5px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                          ${UI.escape(entry.customerName)}
                        </span>
                        <span style="font-size:10px; font-weight:700; padding:1px 6px; border-radius:4px; background:${badgeBg}; color:${badgeColor}; flex-shrink:0;">
                          ${badgeText}
                        </span>
                      </div>
                      <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                        📞 ${UI.escape(entry.mobileNumber)} ${entry.vehicleNumber ? `· 🚗 ${UI.escape(entry.vehicleNumber)}` : ''}
                      </div>
                      <div style="font-size:11.5px; color:var(--text-secondary); margin-top:1px;">
                        ${UI.escape(entry.tyreBrand || '')} ${UI.escape(entry.tyreSize || '')} ${entry.amount ? `· <strong style="color:var(--accent);">₹${Number(entry.amount).toLocaleString('en-IN')}</strong>` : ''}
                      </div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:5px; flex-shrink:0;">
                    <a href="tel:${entry.mobileNumber}" class="quick-action-btn" title="Call Customer" onclick="event.stopPropagation()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                    <a href="https://wa.me/91${cleanPhone}" target="_blank" rel="noopener" class="quick-action-btn btn-whatsapp" title="WhatsApp Chat" onclick="event.stopPropagation()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    </a>
                    <button type="button" class="quick-action-btn cal-view-btn" data-id="${entry.id}" title="View Details" onclick="event.stopPropagation()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Fill Grid
      const gridEl = calContainer.querySelector('#cal-grid');
      // Blank cells for offset
      for (let i = 0; i < firstDay; i++) {
        const blank = document.createElement('div');
        blank.className = 'cal-cell is-blank';
        gridEl.appendChild(blank);
      }

      // Days of month
      for (let day = 1; day <= daysInMonth; day++) {
        const thisYMD = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const count = countMap[thisYMD] || 0;
        const isSelected = thisYMD === calSelectedDate;
        const isToday = thisYMD === todayYMD;

        const cell = document.createElement('div');
        cell.className = `cal-cell ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`;
        cell.innerHTML = `
          <span>${day}</span>
          ${count > 0 ? `<span class="cal-cell-badge">${count}</span>` : ''}
        `;

        cell.addEventListener('click', () => {
          calSelectedDate = thisYMD;
          renderCalView();
        });

        gridEl.appendChild(cell);
      }

      // Bind calendar navigation
      calContainer.querySelector('#cal-prev-btn')?.addEventListener('click', () => {
        calViewDate.setMonth(calViewDate.getMonth() - 1);
        renderCalView();
      });

      calContainer.querySelector('#cal-next-btn')?.addEventListener('click', () => {
        calViewDate.setMonth(calViewDate.getMonth() + 1);
        renderCalView();
      });

      calContainer.querySelector('#cal-today-btn')?.addEventListener('click', () => {
        calViewDate = new Date();
        calSelectedDate = formatYMD(new Date());
        renderCalView();
      });

      calContainer.querySelector('#cal-date-input')?.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) {
          calSelectedDate = val;
          const [y, m, d] = val.split('-').map(Number);
          calViewDate = new Date(y, m - 1, d);
          renderCalView();
        }
      });

      // Apply button inside day header
      calContainer.querySelector('#cal-apply-direct-btn')?.addEventListener('click', () => {
        selectedTimeFilter = 'custom';
        selectedCustomDate = calSelectedDate;
        Sheet.close();
        renderUI();
      });

      // Bind click on entry cards inside the calendar
      calContainer.querySelectorAll('.cal-entry-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          const entry = allEntries.find(it => it.id === id);
          if (entry) showEntryDetailSheet(entry);
        });
      });

      calContainer.querySelectorAll('.cal-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const entry = allEntries.find(it => it.id === id);
          if (entry) showEntryDetailSheet(entry);
        });
      });
    }

    renderCalView();

    Sheet.show({
      title: 'Find Date',
      subtitle: 'Pick a date to inspect follow-ups & enquiries',
      contentEl: calContainer,
      actions: [
        {
          label: 'Filter Entries Page',
          primary: true,
          fullWidth: true,
          onClick: () => {
            selectedTimeFilter = 'custom';
            selectedCustomDate = calSelectedDate;
            renderUI();
          }
        },
        {
          label: 'Show All (Clear Date)',
          primary: false,
          onClick: () => {
            selectedTimeFilter = 'all';
            selectedCustomDate = null;
            renderUI();
          }
        }
      ]
    });
  }

  function renderUI() {
    const activeEl = document.activeElement;
    const isSearchFocused = activeEl && activeEl.id === 'entries-search-input';
    const selectionStart = isSearchFocused ? activeEl.selectionStart : null;
    const selectionEnd = isSearchFocused ? activeEl.selectionEnd : null;

    // 1. Base entries for the selected shop (and time filter)
    const shopBaseEntries = getShopBaseEntries();

    // 2. Status counts specifically for this shop
    const countAll = shopBaseEntries.length;
    const countCompleted = shopBaseEntries.filter(e => e.status === 'COMPLETED' && e.fitStatus !== 'NOT_FIT' && e.fit_status !== 'NOT_FIT').length;
    const countPending = shopBaseEntries.filter(e => e.status === 'PENDING' && e.fitStatus !== 'NOT_FIT' && e.fit_status !== 'NOT_FIT' && !e.isNoResponse && !e.isOverdue).length;
    const countOverdue = shopBaseEntries.filter(e => e.isOverdue).length;
    const countNotFitted = shopBaseEntries.filter(e => e.fitStatus === 'NOT_FIT' || e.fit_status === 'NOT_FIT' || e.status === 'LOST').length;
    const countNoResponse = shopBaseEntries.filter(e => e.status === 'NO_RESPONSE' || e.isNoResponse || e.is_no_response).length;

    // 3. Filter down based on active status filter pill and search query
    const filtered = getFilteredEntries(shopBaseEntries);

    // 4. Header title & subtitle
    const selectedShop = shops.find(s => (s.id || '').toString().trim() === selectedShopId.toString().trim());
    const isAllShops = selectedShopId === 'all';
    const shopLabel = isAllShops ? `${shops.length} shops` : (selectedShop?.name || 'Shop');

    let subtitleText = '';
    if (filtered.length === countAll) {
      subtitleText = `${countAll} records · ${shopLabel}`;
    } else {
      subtitleText = `${filtered.length} of ${countAll} records · ${shopLabel}`;
    }

    container.innerHTML = `
      <header class="app-header mobile-only-header">
        <div class="app-header-row">
          <div class="app-header-info">
            <h1 class="app-header-title">All Entries</h1>
            <div class="app-header-subtitle">
              ${subtitleText}
            </div>
          </div>
          <div class="header-actions">
            <button id="entries-profile-btn" class="header-icon-btn" title="Profile">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          </div>
        </div>
      </header>

      <div style="padding-top: var(--space-3);">
        <!-- Search and Excel Row -->
        <div style="display:flex; gap:10px; margin-bottom:var(--space-3); align-items:center;">
          <div style="flex:1; position:relative;">
            <input
              type="text"
              id="entries-search-input"
              class="form-input"
              placeholder="Search customer, phone..."
              value="${UI.escape(searchQuery)}"
              style="width:100%; padding-left:36px; height:42px; border-radius:12px;"
            />
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.3" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); pointer-events:none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>

          <button id="entries-excel-btn" class="excel-export-btn" title="Export to Excel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
            <span>Excel</span>
          </button>
        </div>

        <!-- Filter Dropdowns Row -->
        <div style="display:flex; gap:10px; margin-bottom:var(--space-3); align-items:center;">
          <select id="entries-shop-select" class="form-input" style="flex:1; height:38px; font-size:13px; border-radius:10px; background:var(--bg-surface);">
            <option value="all" ${selectedShopId === 'all' ? 'selected' : ''}>🏪 All Shops (${shops.length})</option>
            ${shops.map(s => `<option value="${s.id}" ${(s.id || '').toString().trim() === selectedShopId.toString().trim() ? 'selected' : ''}>${UI.escape(s.name)}</option>`).join('')}
          </select>

          <div style="flex:1; display:flex; gap:6px;">
            <select id="entries-time-select" class="form-input" style="flex:1; height:38px; font-size:13px; border-radius:10px; background:var(--bg-surface);">
              ${selectedTimeFilter === 'custom' && selectedCustomDate ? `
                <option value="custom" selected>📅 ${formatDateDisplay(selectedCustomDate)}</option>
                <option value="find_date">📅 Pick another date...</option>
                <option value="all">📅 All Time (Clear Date)</option>
              ` : `
                <option value="all" ${selectedTimeFilter === 'all' ? 'selected' : ''}>📅 All Time</option>
              `}
              <option value="today" ${selectedTimeFilter === 'today' ? 'selected' : ''}>Today</option>
              <option value="week" ${selectedTimeFilter === 'week' ? 'selected' : ''}>This Week</option>
              <option value="month" ${selectedTimeFilter === 'month' ? 'selected' : ''}>This Month</option>
              ${selectedTimeFilter !== 'custom' ? `
                <option value="find_date">📅 Find Date...</option>
              ` : ''}
            </select>
            <button id="entries-calendar-btn" type="button" class="form-input" style="width:38px; height:38px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:10px; background:var(--bg-surface); cursor:pointer; flex-shrink:0; color:var(--accent);" title="Open Calendar (Find Date)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </button>
          </div>
        </div>

        ${selectedTimeFilter === 'custom' && selectedCustomDate ? `
          <!-- Active Date Filter Banner -->
          <div class="active-date-banner">
            <div style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--text-primary); min-width:0;">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" style="flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                Date: <strong style="color:var(--accent);">${formatDateDisplay(selectedCustomDate)}</strong> (${filtered.length} ${filtered.length === 1 ? 'record' : 'records'})
              </span>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
              <button id="entries-banner-change-btn" class="btn-action-small" style="background:var(--bg-surface);">Change Date</button>
              <button id="entries-banner-clear-btn" class="btn-action-small" style="background:var(--bg-surface); color:var(--status-overdue);">✕ Clear</button>
            </div>
          </div>
        ` : ''}

        <!-- Filter Pills Bar (All, Completed, Not Fitted, No Response, Pending, Overdue) -->
        <div class="filter-pills-row">
          <button class="filter-pill ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
            All (${countAll})
          </button>
          <button class="filter-pill ${activeFilter === 'completed' ? 'active' : ''}" data-filter="completed">
            Completed (${countCompleted})
          </button>
          <button class="filter-pill pill-not-fitted ${activeFilter === 'not_fitted' ? 'active' : ''}" data-filter="not_fitted">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#E11D48;"></span>
            Not Fitted (${countNotFitted})
          </button>
          <button class="filter-pill pill-no-response ${activeFilter === 'no_response' ? 'active' : ''}" data-filter="no_response">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#7C3AED;"></span>
            No Response (${countNoResponse})
          </button>
          <button class="filter-pill ${activeFilter === 'pending' ? 'active' : ''}" data-filter="pending">
            Pending (${countPending})
          </button>
          <button class="filter-pill ${activeFilter === 'overdue' ? 'active' : ''}" data-filter="overdue">
            Overdue (${countOverdue})
          </button>
        </div>

        <!-- Cards List Container -->
        <div id="entries-list-container" style="display:flex; flex-direction:column; gap:var(--space-3); padding-bottom:var(--space-6);"></div>
      </div>
    `;

    const listEl = container.querySelector('#entries-list-container');

    // Bind Excel button
    container.querySelector('#entries-excel-btn')?.addEventListener('click', () => {
      exportToExcel(filtered);
    });

    // Bind Profile header button
    container.querySelector('#entries-profile-btn')?.addEventListener('click', () => {
      router.navigate('#/profile');
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="background:var(--bg-surface); border:1px solid var(--border-default); border-radius:var(--radius-xl); padding:40px var(--space-4); text-align:center;">
          <div style="font-size:32px; margin-bottom:8px;">🔍</div>
          <div style="font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--text-primary);">No matching records</div>
          <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">Try selecting another status pill or clearing your search.</p>
        </div>
      `;
    } else {
      filtered.forEach(entry => {
        const avatarColor = getAvatarColors(entry.customerName);
        const card = document.createElement('div');
        card.className = 'enquiry-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        // Determine badge
        let badgeHtml = '';
        if (entry.fitStatus === 'NOT_FIT' || entry.fit_status === 'NOT_FIT' || entry.status === 'LOST') {
          badgeHtml = `<span class="status-badge-not-fitted">NOT FITTED</span>`;
        } else if (entry.status === 'NO_RESPONSE' || entry.isNoResponse || entry.is_no_response) {
          badgeHtml = `<span class="status-badge-no-response">NO RESPONSE</span>`;
        } else if (entry.status === 'COMPLETED') {
          badgeHtml = `<span class="status-badge-completed">COMPLETED</span>`;
        } else {
          badgeHtml = `<span class="status-badge-pending">PENDING</span>`;
        }

        const cleanPhone = (entry.mobileNumber || '').replace(/\D/g, '');

        card.innerHTML = `
          <!-- Card Top: Avatar + Name + Phone on Left, Status Badge on Right -->
          <div class="enquiry-top-row">
            <div style="display:flex; align-items:center; gap:12px; min-width:0;">
              <div class="enquiry-avatar" style="background:${avatarColor.bg}; color:${avatarColor.text};">
                ${getInitials(entry.customerName)}
              </div>
              <div style="min-width:0;">
                <div class="enquiry-cust-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${UI.escape(entry.customerName)}
                </div>
                <div class="enquiry-cust-phone">
                  <a href="tel:${entry.mobileNumber}" style="color:var(--text-muted); text-decoration:none;" onclick="event.stopPropagation()">
                    ${UI.escape(entry.mobileNumber)}
                  </a>
                </div>
              </div>
            </div>
            ${badgeHtml}
          </div>

          <!-- Vehicle license plate & details -->
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:13px;">
            ${entry.vehicleNumber ? `
              <div class="enquiry-vehicle-pill" style="background:var(--bg-subtle); border:1px solid var(--border-default); padding:2px 8px; border-radius:6px; font-weight:700;">
                <span>🚗 ${UI.escape(entry.vehicleNumber)}</span>
              </div>
            ` : ''}
            <span style="color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${UI.escape(entry.vehicleDetails || 'Four Wheeler')} · ${UI.escape(entry.tyreBrand || '')} · ${UI.escape(entry.tyreSize || '')}
            </span>
          </div>

          <!-- Bottom Row: Branch & Time on Left, Action Buttons on Right -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--border-subtle); padding-top:8px; margin-top:2px;">
            <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <span>🏪 ${UI.escape(entry.shopName || 'Branch')}</span>
              <span>·</span>
              <span>🕒 ${entry.dateText || '22 Oct, 11:30 AM'}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;" onclick="event.stopPropagation()">
              <a href="tel:${entry.mobileNumber}" class="quick-action-btn" title="Call Customer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </a>
              <a href="https://wa.me/91${cleanPhone}" target="_blank" rel="noopener" class="quick-action-btn btn-whatsapp" title="WhatsApp Chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              </a>
              <button class="quick-action-btn" title="View Details" onclick="showEntryDetailSheet(entry)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        `;

        card.addEventListener('click', () => showEntryDetailSheet(entry));
        listEl.appendChild(card);
      });
    }

    // Attach search listener (debounced 300ms)
    const searchInput = container.querySelector('#entries-search-input');
    searchInput?.addEventListener('input', UI.debounce((e) => {
      searchQuery = e.target.value.trim();
      renderUI();
    }, 300));

    // Attach shop filter listener
    const shopSelect = container.querySelector('#entries-shop-select');
    shopSelect?.addEventListener('change', (e) => {
      selectedShopId = e.target.value;
      renderUI();
    });

    // Attach time filter listener
    const timeSelect = container.querySelector('#entries-time-select');
    timeSelect?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'find_date' || val === 'custom') {
        openCalendarSheet();
      } else if (val === 'all') {
        selectedTimeFilter = 'all';
        selectedCustomDate = null;
        renderUI();
      } else {
        selectedTimeFilter = val;
        selectedCustomDate = null;
        renderUI();
      }
    });

    // Calendar quick trigger button
    container.querySelector('#entries-calendar-btn')?.addEventListener('click', () => {
      openCalendarSheet();
    });

    // Active date banner buttons
    container.querySelector('#entries-banner-change-btn')?.addEventListener('click', () => {
      openCalendarSheet();
    });

    container.querySelector('#entries-banner-clear-btn')?.addEventListener('click', () => {
      selectedTimeFilter = 'all';
      selectedCustomDate = null;
      renderUI();
    });

    // Attach filter pill buttons
    container.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        activeFilter = pill.dataset.filter;
        renderUI();
      });
    });

    // Restore focus if search was active
    if (isSearchFocused) {
      const newSearchInput = container.querySelector('#entries-search-input');
      if (newSearchInput) {
        newSearchInput.focus();
        try {
          newSearchInput.setSelectionRange(selectionStart, selectionEnd);
        } catch (_) {}
      }
    }
  }

  // Load live data
  loadData();

  return container;
}
