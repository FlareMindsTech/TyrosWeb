// All Entries Tab matching Flutter AllEntriesTab Screenshot exactly
import { Auth } from '../auth.js';
import { Store } from '../store.js';
import { UI } from '../ui.js';

export async function renderAllEntries(router, params) {
  const container = document.createElement('div');
  container.className = 'view-screen';

  const shops = await Store.getShops();
  const users = await Store.getUsers();
  const allEntries = await Store.getEntries();

  const userMap = Object.fromEntries(users.map(u => [u.id, u.fullName || u.name]));
  const shopMap = Object.fromEntries(shops.map(s => [s.id, s.name]));
  const activeShopCount = shops.filter(s => s.isActive).length;

  // Parse initial filter from URL
  const hash = window.location.hash;
  const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
  const initialShopId = urlParams.get('shopId') || '';
  const initialFilter = urlParams.get('filter') || '';

  // Count stats (matching Flutter)
  const nonDeleted = allEntries.filter(e => !e.isDeleted);
  const totalCount = nonDeleted.length;
  const completedCount = nonDeleted.filter(e => e.status === 'COMPLETED' && e.fitStatus !== 'NOT_FIT').length;
  const pendingCount = nonDeleted.filter(e => e.status === 'PENDING' && e.fitStatus !== 'NOT_FIT' && !e.isNoResponse && !e.isOverdue).length;
  const overdueCount = nonDeleted.filter(e => e.isOverdue).length;

  // Generate initials and curated pastel avatar colors matching Flutter
  function getInitials(name) {
    return name.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '??';
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
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarPalettes[Math.abs(hash) % avatarPalettes.length];
  }

  container.innerHTML = `
    <!-- Header matching Flutter "All Entries" header -->
    <header class="app-header">
      <div class="header-row">
        <div class="header-info">
          <div class="header-title">All Entries</div>
          <div class="header-subtitle">${totalCount} records · ${activeShopCount} shops</div>
        </div>
        <div class="header-actions">
          <button id="entries-profile-btn" class="header-icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          <button id="entries-logout-btn" class="header-icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Search Bar + Excel Button -->
    <div style="padding: 10px 16px 8px; display: flex; gap: 8px; align-items: center;">
      <div style="flex:1; position:relative;">
        <span style="position:absolute; left:12px; top:12px; color:var(--text-muted); display:flex; align-items:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input type="text" id="entries-search" class="form-input" placeholder="Search customer, phone..." style="padding-left:38px; height:44px; border-radius:12px; font-size:13.5px;">
      </div>
      <button id="entries-excel-btn" style="height:44px; padding:0 14px; background:rgba(16,124,65,0.08); border:1px solid rgba(16,124,65,0.25); border-radius:12px; display:flex; align-items:center; gap:6px; cursor:pointer; color:#107C41; font-weight:700; font-size:13px; flex-shrink:0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        Excel
      </button>
    </div>

    <!-- Filter Dropdowns: All Shops + All Time -->
    <div style="padding: 0 16px 8px; display: flex; gap: 8px;">
      <div style="flex:1; position:relative;">
        <select id="entries-shop-filter" class="form-select" style="padding-left:32px;">
          <option value="">All Shops</option>
          ${shops.map(s => `<option value="${s.id}" ${s.id === initialShopId ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        <span style="position:absolute; left:10px; top:11px; pointer-events:none; color:var(--text-muted); display:flex; align-items:center;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4"/><path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/></svg>
        </span>
      </div>
      <div style="flex:1;">
        <select id="entries-time-filter" class="form-select">
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>
    </div>

    <!-- Status Filter Pills (matching Flutter: All 71, • Completed 47, • Pending 0) -->
    <div class="filter-pills-row" style="padding: 8px 16px 16px; min-height: 60px; overflow-y: hidden;">
      <button class="entry-pill active" data-status="all" style="height: 36px; min-height: 36px;">
        All <span style="font-weight:800; background:rgba(255,255,255,0.2); padding:1px 7px; border-radius:10px; margin-left:3px;">${totalCount}</span>
      </button>
      <button class="entry-pill" data-status="completed" style="height: 36px; min-height: 36px;">
        <span style="width:7px; height:7px; border-radius:50%; background:var(--status-done); display:inline-block;"></span>
        Completed <span style="font-weight:800; color:var(--status-done); margin-left:3px;">${completedCount}</span>
      </button>
      <button class="entry-pill" data-status="pending" style="height: 36px; min-height: 36px;">
        <span style="width:7px; height:7px; border-radius:50%; background:var(--status-pending); display:inline-block;"></span>
        Pending <span style="font-weight:800; color:var(--status-pending); margin-left:3px;">${pendingCount}</span>
      </button>
    </div>

    <!-- Entries List -->
    <div id="entries-list" style="padding-bottom: 40px;"></div>
  `;

  const listEl = container.querySelector('#entries-list');
  const searchInput = container.querySelector('#entries-search');
  const shopFilter = container.querySelector('#entries-shop-filter');
  const timeFilter = container.querySelector('#entries-time-filter');
  let currentStatus = initialFilter ? initialFilter.toLowerCase() : 'all';

  // Set initial active pill
  if (initialFilter) {
    container.querySelectorAll('.entry-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.status === initialFilter.toLowerCase());
    });
  }

  function renderList() {
    listEl.innerHTML = '';
    const selectedShop = shopFilter.value;
    const query = searchInput.value.trim().toLowerCase();

    // Reconcile stats for selected shop
    const shopBase = allEntries.filter(e => {
      if (e.isDeleted) return false;
      if (!selectedShop) return true;
      const targetIdStr = selectedShop.toString().trim();
      const entryShopIdStr = (e.shopId || '').toString().trim();
      if (entryShopIdStr && entryShopIdStr === targetIdStr) return true;
      const targetShop = shops.find(s => (s.id || '').toString().trim() === targetIdStr);
      if (targetShop && targetShop.name && e.shopName) {
        return e.shopName.trim().toLowerCase() === targetShop.name.trim().toLowerCase();
      }
      return false;
    });

    const sTotal = shopBase.length;
    const sCompleted = shopBase.filter(e => e.status === 'COMPLETED' && e.fitStatus !== 'NOT_FIT').length;
    const sPending = shopBase.filter(e => e.status === 'PENDING' && e.fitStatus !== 'NOT_FIT' && !e.isNoResponse && !e.isOverdue).length;

    // Update pill labels
    const pillAllSpan = container.querySelector('.entry-pill[data-status="all"] span');
    if (pillAllSpan) pillAllSpan.textContent = sTotal;
    const pillCompletedSpan = container.querySelector('.entry-pill[data-status="completed"] span:last-child');
    if (pillCompletedSpan) pillCompletedSpan.textContent = sCompleted;
    const pillPendingSpan = container.querySelector('.entry-pill[data-status="pending"] span:last-child');
    if (pillPendingSpan) pillPendingSpan.textContent = sPending;

    // Update header subtitle
    const headerSub = container.querySelector('.header-subtitle');
    if (headerSub) {
      if (!selectedShop) {
        headerSub.textContent = `${sTotal} records · ${activeShopCount} shops`;
      } else {
        const sObj = shops.find(s => (s.id || '').toString().trim() === selectedShop.toString().trim());
        headerSub.textContent = `${sTotal} records · ${sObj?.name || 'Shop'}`;
      }
    }

    const filtered = shopBase.filter(e => {
      const isPending = e.status === 'PENDING' && e.fitStatus === 'FIT' && !e.isOverdue;
      const isCompleted = e.status === 'COMPLETED' && e.fitStatus === 'FIT';
      const isOverdue = e.isOverdue;

      if (currentStatus === 'pending' && !isPending && !isOverdue) return false;
      if (currentStatus === 'completed' && !isCompleted) return false;
      if (currentStatus === 'overdue' && !isOverdue) return false;

      if (query) {
        const full = `${e.customerName} ${e.mobileNumber} ${e.vehicleNumber} ${e.vehicleDetails} ${e.tyreBrand} ${e.shopName}`.toLowerCase();
        return full.includes(query);
      }
      return true;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding:48px 20px; color:var(--text-muted);">
          <div style="font-size:36px; margin-bottom:8px;">📋</div>
          <div style="font-size:15px; font-weight:600; color:var(--text-main);">No entries found</div>
          <div style="font-size:12px; margin-top:4px;">Try adjusting your filters or search.</div>
        </div>`;
      return;
    }

    filtered.forEach(entry => {
      const initials = getInitials(entry.customerName);
      const palette = getAvatarColors(entry.customerName);
      const isOverdue = entry.isOverdue;
      const isCompleted = entry.status === 'COMPLETED' && entry.fitStatus === 'FIT';
      const isNotFit = entry.fitStatus === 'NOT_FIT';

      let statusBadge = '';
      if (isOverdue) {
        statusBadge = `<span class="status-pill-badge overdue">OVERDUE</span>`;
      } else if (isNotFit) {
        statusBadge = `<span class="status-pill-badge not-fitted">NOT FITTED</span>`;
      } else if (isCompleted) {
        statusBadge = `<span class="status-pill-badge completed">COMPLETED</span>`;
      } else {
        statusBadge = `<span class="status-pill-badge pending">PENDING</span>`;
      }

      const shopName = shopMap[entry.shopId] || entry.shopName || '';
      const dateStr = entry.dateText || (entry.followUpDate ? new Date(entry.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

      const card = document.createElement('div');
      card.className = 'entry-card';
      card.innerHTML = `
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <!-- Avatar Circle -->
          <div class="entry-avatar" style="background:${palette.bg}; color:${palette.text};">
            ${initials}
          </div>
          <div style="flex:1; min-width:0;">
            <!-- Row 1: Name + Status Badge -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <div style="font-size:15.5px; font-weight:700; color:var(--text-main);">${entry.customerName}</div>
              ${statusBadge}
            </div>
            <!-- Phone Number -->
            <div style="font-size:12px; color:var(--text-sub); margin-bottom:8px;">${entry.mobileNumber}</div>
            
            <!-- Vehicle Plate + Model + Brand + Size -->
            <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:10px;">
              <span class="vehicle-plate-pill">
                🚗 ${entry.vehicleNumber || 'No plate'}
              </span>
              ${entry.vehicleDetails ? `<span style="font-size:12px; color:var(--text-sub);">${entry.vehicleDetails}</span>` : ''}
              ${entry.tyreBrand ? `<span style="font-size:12px; color:var(--text-muted);">·</span><span style="font-size:12px; color:var(--text-sub); font-weight:600;">${entry.tyreBrand}</span>` : ''}
              ${entry.tyreSize ? `<span style="font-size:12px; color:var(--text-muted);">·</span><span style="font-size:12px; color:var(--text-muted);">${entry.tyreSize}</span>` : ''}
            </div>

            <!-- Bottom Row: Shop + Date + Action Buttons -->
            <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid var(--row-divider); padding-top:8px;">
              <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:6px;">
                <span>🏪 ${shopName}</span>
                <span>·</span>
                <span>🕐 ${dateStr}</span>
              </div>
              <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
                <a href="tel:${entry.mobileNumber}" class="circle-action-btn" onclick="event.stopPropagation();" title="Call">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.11 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </a>
                <a href="https://wa.me/91${entry.mobileNumber}" target="_blank" class="circle-action-btn" onclick="event.stopPropagation();" title="WhatsApp">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </a>
                <div style="color:var(--text-muted); display:flex; align-items:center; padding-left:2px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      card.addEventListener('click', () => router.navigate(`/entry/${entry.id}`));
      listEl.appendChild(card);
    });
  }

  container.querySelectorAll('.entry-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.entry-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentStatus = pill.dataset.status;
      renderList();
    });
  });

  shopFilter.addEventListener('change', renderList);
  timeFilter.addEventListener('change', renderList);
  searchInput.addEventListener('input', renderList);

  // Profile / Logout
  container.querySelector('#entries-profile-btn')?.addEventListener('click', () => router.navigate('/profile'));
  container.querySelector('#entries-logout-btn')?.addEventListener('click', async () => {
    if (confirm('Sign out?')) { await Auth.logout(); router.navigate('/login'); }
  });

  // Excel export using /admin/export/csv with client-side fallback
  container.querySelector('#entries-excel-btn')?.addEventListener('click', async () => {
    try {
      UI.showToast('Preparing CSV export...', 'info');
      await Store.downloadEnquiriesCsv();
      UI.showToast('CSV export downloaded successfully', 'success');
    } catch (err) {
      console.warn('[AllEntries] Remote CSV export fallback to client-generated CSV:', err.message);
      const headers = ['Customer Name', 'Mobile', 'Vehicle', 'Model', 'Branch', 'Status', 'Tyre', 'Amount'];
      const rows = allEntries.map(e => [
        `"${e.customerName}"`, `"${e.mobileNumber}"`, `"${e.vehicleNumber}"`,
        `"${e.vehicleDetails}"`, `"${shopMap[e.shopId] || ''}"`, e.status,
        `"${e.tyreBrand} ${e.tyreSize}"`, e.amount || 0
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const a = document.createElement('a');
      a.href = encodeURI(csv);
      a.download = `tyros_entries_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      UI.showToast('Excel export downloaded', 'success');
    }
  });

  renderList();
  return container;
}
