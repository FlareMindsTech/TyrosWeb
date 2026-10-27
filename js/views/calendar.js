// Employee Follow-up Calendar View matching Flutter EmployeeFollowUpCalendarScreen
import { Auth } from '../auth.js';
import { Store } from '../store.js';
import { UI } from '../ui.js';

export async function renderCalendar(router) {
  const container = document.createElement('div');
  container.className = 'view-screen';

  const shopId = Auth.getActiveShopId();
  const allEntries = await Store.getEntries(shopId);

  let viewDate = new Date();
  let selectedDate = new Date();

  container.innerHTML = `
    <header class="sub-header">
      <button id="cal-back-btn" class="back-btn">${UI.icons.back(18)}</button>
      <div class="sub-header-content">
        <div class="sub-header-title">Follow-up Calendar</div>
        <div class="sub-header-context" id="cal-month-header"></div>
      </div>
      <div style="display:flex; gap:6px;">
        <button id="cal-prev-btn" class="util-btn" style="padding:4px 8px;">◀</button>
        <button id="cal-next-btn" class="util-btn" style="padding:4px 8px;">▶</button>
      </div>
    </header>

    <div style="padding: 16px 20px;">
      <!-- Calendar Grid Container -->
      <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
        <!-- Day Names -->
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px;">
          <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
        </div>
        <!-- Dates Grid -->
        <div id="cal-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center;"></div>
      </div>

      <!-- Selected Day Queue -->
      <div style="margin-top: 18px;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 8px;">
          <span style="font-family: var(--font-condensed); font-size: 16px; font-weight: 700; text-transform: uppercase;" id="cal-selected-day-title">Day's Queue</span>
          <span style="font-size: 11.5px; color: var(--text-muted);" id="cal-selected-day-count"></span>
        </div>
        <div id="cal-day-entries"></div>
      </div>
    </div>
  `;

  const monthHeader = container.querySelector('#cal-month-header');
  const gridEl = container.querySelector('#cal-grid');
  const dayTitleEl = container.querySelector('#cal-selected-day-title');
  const dayCountEl = container.querySelector('#cal-selected-day-count');
  const dayEntriesEl = container.querySelector('#cal-day-entries');

  function renderMonth() {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    monthHeader.textContent = `${months[m]} ${y}`;

    gridEl.innerHTML = '';

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    // Map entries to days
    const entryCountMap = {};
    allEntries.forEach(e => {
      if (e.followUpDate) {
        const dStr = e.followUpDate.slice(0, 10);
        entryCountMap[dStr] = (entryCountMap[dStr] || 0) + 1;
      }
    });

    // Blank cells before first day
    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement('div');
      blank.style.height = '36px';
      gridEl.appendChild(blank);
    }

    // Helper for timezone-safe YYYY-MM-DD
    function toLocalYMD(d) {
      if (!d) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${date}`;
    }

    // Days
    const todayStr = toLocalYMD(new Date());
    const selStr = toLocalYMD(selectedDate);

    for (let day = 1; day <= daysInMonth; day++) {
      const thisDate = new Date(y, m, day);
      const thisDateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const count = entryCountMap[thisDateStr] || 0;
      const isSelected = thisDateStr === selStr;
      const isToday = thisDateStr === todayStr;

      const cell = document.createElement('div');
      cell.style.cssText = `
        height: 38px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        cursor: pointer;
        position: relative;
        font-size: 13px;
        font-weight: ${isSelected || isToday ? '700' : '500'};
        background: ${isSelected ? 'var(--accent-rust)' : (isToday ? 'rgba(193,68,14,0.1)' : 'transparent')};
        color: ${isSelected ? '#fff' : (isToday ? 'var(--accent-rust)' : 'var(--text-main)')};
      `;
      cell.innerHTML = `
        <span>${day}</span>
        ${count > 0 ? `<div style="width:5px; height:5px; border-radius:50%; background:${isSelected ? '#fff' : 'var(--accent-rust)'}; margin-top:1px;"></div>` : ''}
      `;

      cell.addEventListener('click', () => {
        selectedDate = thisDate;
        renderMonth();
        renderDayEntries();
      });

      gridEl.appendChild(cell);
    }

    renderDayEntries();
  }

  function renderDayEntries() {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const date = String(selectedDate.getDate()).padStart(2, '0');
    const selStr = `${year}-${month}-${date}`;
    dayTitleEl.textContent = `Queue for ${UI.formatDate(selectedDate, 'short')}`;

    const matching = allEntries.filter(e => e.followUpDate && e.followUpDate.slice(0, 10) === selStr);
    dayCountEl.textContent = `${matching.length} follow-up${matching.length !== 1 ? 's' : ''}`;

    dayEntriesEl.innerHTML = '';
    if (matching.length === 0) {
      dayEntriesEl.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 12px; background: var(--card-bg); border-radius: 8px;">
          No follow-ups scheduled on this date.
        </div>
      `;
      return;
    }

    matching.forEach((entry, idx) => {
      if (idx > 0) {
        const div = document.createElement('div');
        div.className = 'status-row-divider';
        dayEntriesEl.appendChild(div);
      }

      const row = document.createElement('div');
      row.className = `status-row ${entry.isOverdue ? 'overdue' : 'pending'}`;
      row.innerHTML = `
        <div class="status-row-info">
          <div class="status-row-name">${entry.customerName}</div>
          <div class="status-row-sub">${entry.vehicleNumber || ''} • ${entry.vehicleDetails || 'Car'}</div>
        </div>
        <div class="row-quick-actions">
          <a href="tel:${entry.mobileNumber}" class="quick-action-btn call">${UI.icons.phone(14)}</a>
          <a href="https://wa.me/91${entry.mobileNumber}" target="_blank" class="quick-action-btn whatsapp">${UI.icons.whatsapp(14)}</a>
        </div>
      `;
      row.querySelector('.status-row-info').addEventListener('click', () => {
        router.navigate(`/employee/entry/${entry.id}`);
      });
      dayEntriesEl.appendChild(row);
    });
  }

  container.querySelector('#cal-prev-btn').addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderMonth();
  });

  container.querySelector('#cal-next-btn').addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderMonth();
  });

  container.querySelector('#cal-back-btn').addEventListener('click', () => router.back());

  renderMonth();
  return container;
}
