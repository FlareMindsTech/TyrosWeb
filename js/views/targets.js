// Monthly Targets Screen matching Screenshot 1 exactly
import { Store } from '../store.js';
import { UI } from '../ui.js';

export async function renderTargets(router) {
  const container = document.createElement('div');
  container.className = 'view-screen';

  let selectedShopId = 'all'; // 'all' | 'shop-flare' | 'shop-point' | 'shop-tyros' | 'shop-bharath'
  let selectedMonth = 'October';
  let selectedYear = '2026';

  const shops = await Store.getShops();

  async function renderContent() {
    const monthMap = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    };
    const monthNum = monthMap[selectedMonth] || 10;
    const yearNum = parseInt(selectedYear, 10) || 2026;

    const data = await Store.getMonthlyTargetData(selectedShopId, yearNum, monthNum);
    const historyList = await Store.getTargetHistory(selectedShopId === 'all' ? null : selectedShopId, yearNum);
    const filteredHistory = historyList.filter(t => t.targetMonth === monthNum);

    const shopDisplayName = selectedShopId === 'all'
      ? 'All Shops Targets'
      : (shops.find(s => s.id === selectedShopId)?.name || 'Shop Targets');

    const subHeaderShop = selectedShopId === 'all'
      ? 'ALL SHOPS'
      : (shops.find(s => s.id === selectedShopId)?.name || 'SHOP').toUpperCase();

    container.innerHTML = `
      <!-- Header matching Screenshot 1 -->
      <header class="master-header">
        <div class="master-header-left">
          <button id="targets-back-btn" class="back-btn" style="background:none; border:none; padding:4px; cursor:pointer; color:var(--text-main); display:flex; align-items:center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div class="master-header-title">Monthly Targets</div>
        </div>
        <button id="set-target-header-btn" class="master-header-btn" style="padding: 7px 12px; gap: 6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <span>Set Target</span>
        </button>
      </header>

      <div style="padding: 14px 16px 80px;">
        <!-- Shop Dropdown Card -->
        <div id="shop-selector-card" style="background:#FFFFFA; border:1px solid var(--border-color); border-radius:12px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; margin-bottom:14px; box-shadow:0 1px 3px rgba(34,32,30,0.02);">
          <div style="display:flex; align-items:center; gap:10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-sub)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span style="font-size:15px; font-weight:600; color:var(--text-main);">${shopDisplayName}</span>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>

        <!-- Main Progress Card matching Screenshot 1 -->
        <div style="background:#FFFFFA; border:1px solid var(--border-color); border-radius:16px; padding:18px 18px 20px; box-shadow:0 1px 4px rgba(34,32,30,0.03); margin-bottom:24px;">
          <!-- Top Row -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="font-family:var(--font-condensed); font-size:12.5px; font-weight:700; color:var(--accent-rust); letter-spacing:0.04em; text-transform:uppercase;">
              ${subHeaderShop} · ${selectedMonth.toUpperCase()} ${selectedYear}
            </div>
            <div style="background:#EFEAE0; color:var(--text-main); font-size:12px; font-weight:600; padding:3.5px 10px; border-radius:12px;">
              ${data.daysLeft || 14} days left
            </div>
          </div>

          <h2 style="font-family:var(--font-body); font-size:22px; font-weight:700; color:var(--text-main); margin-bottom:18px; letter-spacing:-0.01em;">
            Current Month Progress
          </h2>

          <!-- Metric 1: Monthly Sales Target -->
          <div style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
              <span style="font-size:14px; font-weight:500; color:var(--text-main);">Monthly Sales Target</span>
              <span style="font-size:13.5px; font-weight:700; color:#16A34A;">
                ₹${Number(data.revenueAchieved).toLocaleString('en-IN')} / ₹${Number(data.revenueTarget).toLocaleString('en-IN')} (${data.revenuePercentage}%)
              </span>
            </div>
            <div style="width:100%; height:8px; background:var(--border-color); border-radius:4px; overflow:hidden;">
              <div style="width:${Math.min(100, Math.max(3, data.revenuePercentage))}%; height:100%; background:#16A34A; border-radius:4px; transition:width 0.5s ease;"></div>
            </div>
          </div>

          <!-- Metric 2: Tyre Sales Target -->
          <div style="margin-bottom:18px;">
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
              <span style="font-size:14px; font-weight:500; color:var(--text-main);">Tyre Sales Target</span>
              <span style="font-size:13.5px; font-weight:700; color:var(--accent-rust);">
                ${data.tyreAchieved} / ${data.tyreTarget} tyres (${data.tyrePercentage}%)
              </span>
            </div>
            <div style="width:100%; height:8px; background:var(--border-color); border-radius:4px; overflow:hidden;">
              <div style="width:${Math.min(100, Math.max(3, data.tyrePercentage))}%; height:100%; background:var(--accent-rust); border-radius:4px; transition:width 0.5s ease;"></div>
            </div>
          </div>

          <div style="border-top:1px solid var(--row-divider); margin:18px 0 14px;"></div>

          <!-- Additional Service Targets -->
          <div style="font-size:14px; font-weight:600; color:var(--text-main); margin-bottom:12px;">
            Additional Service Targets
          </div>

          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px;">
            ${(data.services || [
              { name: '2W Tyre', achieved: 62, target: 25, percentage: 248 },
              { name: '2W Balancing', achieved: 67, target: 25, percentage: 268 },
              { name: 'Wheel Alignment', achieved: 101, target: 25, percentage: 404 }
            ]).map(s => `
              <div style="background:#EFEAE0; border-radius:10px; padding:10px 12px;">
                <div style="font-size:11.5px; color:var(--text-sub); margin-bottom:4px;">${s.name}</div>
                <div style="font-size:13.5px; font-weight:700; color:var(--text-main);">
                  ${s.achieved} / ${s.target} (${s.percentage}%)
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Target History Section matching Screenshot 1 & 2 -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="font-family:var(--font-body); font-size:20px; font-weight:700; color:var(--text-main);">
            Target History
          </h3>
          <div style="display:flex; gap:8px;">
            <!-- Month Select Pill -->
            <div style="position:relative;">
              <select id="history-month-select" style="appearance:none; -webkit-appearance:none; background:#FFFFFA; border:1px solid var(--border-color); border-radius:8px; padding:6px 26px 6px 12px; font-size:13px; font-weight:600; color:var(--text-main); cursor:pointer;">
                <option value="October" ${selectedMonth === 'October' ? 'selected' : ''}>October</option>
                <option value="September" ${selectedMonth === 'September' ? 'selected' : ''}>September</option>
                <option value="August" ${selectedMonth === 'August' ? 'selected' : ''}>August</option>
                <option value="July" ${selectedMonth === 'July' ? 'selected' : ''}>July</option>
              </select>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <!-- Year Select Pill -->
            <div style="position:relative;">
              <select id="history-year-select" style="appearance:none; -webkit-appearance:none; background:#FFFFFA; border:1px solid var(--border-color); border-radius:8px; padding:6px 26px 6px 12px; font-size:13px; font-weight:600; color:var(--text-main); cursor:pointer;">
                <option value="2026" ${selectedYear === '2026' ? 'selected' : ''}>2026</option>
                <option value="2025" ${selectedYear === '2025' ? 'selected' : ''}>2025</option>
              </select>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        </div>

        <!-- Target History Cards List matching Screenshot 2 & 5 -->
        <div class="target-history-list" style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
          ${filteredHistory.length === 0 ? `
            <div style="background:#FFFFFA; border:1px solid var(--border-color); border-radius:12px; padding:24px; text-align:center; color:var(--text-muted); font-size:13px;">
              No target history found for ${selectedMonth} ${selectedYear}.
            </div>
          ` : filteredHistory.map(item => `
            <div style="background:#FFFFFA; border:1px solid var(--border-color); border-radius:14px; padding:16px 16px 14px; box-shadow:0 1px 3px rgba(34,32,30,0.02);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <div>
                  <div style="font-family:var(--font-body); font-size:16px; font-weight:700; color:var(--text-main);">${selectedMonth} ${selectedYear}</div>
                  <div style="display:flex; align-items:center; gap:5px; margin-top:2px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span style="font-size:12px; font-weight:500; color:var(--text-muted);">${item.shopName}</span>
                  </div>
                </div>
                <div style="background:#EFEAE0; color:var(--text-main); font-size:11.5px; font-weight:700; padding:2px 8px; border-radius:6px;">
                  ${item.amountPercentage}%
                </div>
              </div>

              <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
                <div style="flex:1;">
                  <div style="font-size:11px; color:var(--text-muted);">Sales Achieved</div>
                  <div style="font-size:13px; font-weight:700; color:var(--text-main); margin-top:2px;">
                    ₹${Number(item.achievedAmount).toLocaleString('en-IN')} / ₹${Number(item.amountTarget).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style="flex:1;">
                  <div style="font-size:11px; color:var(--text-muted);">Tyres Sold</div>
                  <div style="font-size:13px; font-weight:700; color:var(--text-main); margin-top:2px;">
                    ${item.achievedTyres} / ${item.tyreTarget} tyres
                  </div>
                </div>
                <button class="target-edit-item-btn" data-shop-id="${item.shopId}" data-target-id="${item.id}" style="border:none; background:none; color:var(--text-muted); cursor:pointer; padding:6px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>

              ${(item.fourWheelerEnquiryTarget > 0 || item.twoWheelerAlignmentTarget > 0 || item.wheelAlignmentTarget > 0) ? `
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:12px;">
                  ${item.fourWheelerEnquiryTarget > 0 ? `
                    <span style="font-size:11px; background:#EFEAE0; color:var(--text-main); padding:3px 8px; border-radius:6px; font-weight:500;">
                      2W Tyre: ${item.achieved4wEnq}/${item.fourWheelerEnquiryTarget}
                    </span>
                  ` : ''}
                  ${item.twoWheelerAlignmentTarget > 0 ? `
                    <span style="font-size:11px; background:#EFEAE0; color:var(--text-main); padding:3px 8px; border-radius:6px; font-weight:500;">
                      2W Balancing: ${item.achieved2wAlign}/${item.twoWheelerAlignmentTarget}
                    </span>
                  ` : ''}
                  ${item.wheelAlignmentTarget > 0 ? `
                    <span style="font-size:11px; background:#EFEAE0; color:var(--text-main); padding:3px 8px; border-radius:6px; font-weight:500;">
                      Wheel Alignment: ${item.achievedWheelAlign}/${item.wheelAlignmentTarget}
                    </span>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    setupEvents();
  }

  function setupEvents() {
    container.querySelector('#targets-back-btn')?.addEventListener('click', () => router.navigate('/dashboard'));

    // Shop selector dropdown card click
    container.querySelector('#shop-selector-card')?.addEventListener('click', () => {
      UI.showModal(`
        <h3 class="sheet-title">Select Shop Targets</h3>
        <p class="sheet-sub">Choose a branch or view aggregate target metrics across all shops.</p>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
          <button class="shop-select-opt" data-id="all" style="text-align:left; padding:12px 14px; background:${selectedShopId === 'all' ? '#FCEFEA' : '#FFFFFA'}; border:1px solid ${selectedShopId === 'all' ? 'var(--accent-rust)' : 'var(--border-color)'}; border-radius:10px; font-weight:${selectedShopId === 'all' ? '700' : '500'}; color:var(--text-main); cursor:pointer;">
            🏪 All Shops Targets
          </button>
          ${shops.map(s => `
            <button class="shop-select-opt" data-id="${s.id}" style="text-align:left; padding:12px 14px; background:${selectedShopId === s.id ? '#FCEFEA' : '#FFFFFA'}; border:1px solid ${selectedShopId === s.id ? 'var(--accent-rust)' : 'var(--border-color)'}; border-radius:10px; font-weight:${selectedShopId === s.id ? '700' : '500'}; color:var(--text-main); cursor:pointer;">
              🏬 ${s.name}
            </button>
          `).join('')}
        </div>
      `, {
        onMounted(sheet) {
          sheet.querySelectorAll('.shop-select-opt').forEach(btn => {
            btn.addEventListener('click', () => {
              selectedShopId = btn.dataset.id;
              UI.hideModal();
              renderContent();
            });
          });
        }
      });
    });

    async function openSetTargetModal(shopIdToEdit) {
      const monthMap = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
      };
      const monthNum = monthMap[selectedMonth] || (new Date().getMonth() + 1);
      const yearNum = parseInt(selectedYear, 10) || new Date().getFullYear();
      const targetShopId = shopIdToEdit || (selectedShopId === 'all' ? (shops[0]?.id || '') : selectedShopId);

      if (!targetShopId) {
        return UI.showToast('Please create a branch first', 'error');
      }

      const data = await Store.getMonthlyTargetData(targetShopId, yearNum, monthNum);
      const shopObj = shops.find(s => s.id === targetShopId);

      UI.showModal(`
        <h3 class="sheet-title">Set Monthly Target</h3>
        <p class="sheet-sub">Configure quota for ${shopObj?.name || 'Branch'} (${selectedMonth} ${selectedYear}).</p>

        <div class="form-group" style="margin: 0 0 12px;">
          <label class="form-label">Sales Value Target (₹) <span class="req">*</span></label>
          <input type="number" id="input-rev-target" class="form-input" value="${data.revenueTarget || 500000}" required>
        </div>

        <div class="form-group" style="margin: 0 0 12px;">
          <label class="form-label">Tyre Sales Target (Units) <span class="req">*</span></label>
          <input type="number" id="input-tyre-target" class="form-input" value="${data.tyreTarget || 100}" required>
        </div>

        <div style="margin: 12px 0 8px; font-size:13px; font-weight:700; color:var(--text-main);">
          Service Targets (Units)
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px;">
          <div>
            <label class="form-label" style="font-size:11.5px;">2W Tyre</label>
            <input type="number" id="input-srv-enq" class="form-input" value="${data.services?.find(s => s.name === '2W Tyre' || s.name === '4W Enquiry' || s.name === '2W Enquiry')?.target ?? 25}">
          </div>
          <div>
            <label class="form-label" style="font-size:11.5px;">2W Alignment</label>
            <input type="number" id="input-srv-align2" class="form-input" value="${data.services?.find(s => s.name === '2W Balancing' || s.name === '2W Alignment')?.target ?? 25}">
          </div>
          <div>
            <label class="form-label" style="font-size:11.5px;">Wheel Alignment</label>
            <input type="number" id="input-srv-alignw" class="form-input" value="${data.services?.find(s => s.name === 'Wheel Alignment')?.target ?? 25}">
          </div>
          <div>
            <label class="form-label" style="font-size:11.5px;">Commercial Tyre</label>
            <input type="number" id="input-srv-comm" class="form-input" value="${data.services?.find(s => s.name === 'Commercial Tyre')?.target ?? 15}">
          </div>
          <div>
            <label class="form-label" style="font-size:11.5px;">RO Water</label>
            <input type="number" id="input-srv-ro" class="form-input" value="${data.services?.find(s => s.name === 'RO Water')?.target ?? 40}">
          </div>
          <div>
            <label class="form-label" style="font-size:11.5px;">Above 17 Inch</label>
            <input type="number" id="input-srv-17" class="form-input" value="${data.services?.find(s => s.name === 'Above 17 Inch')?.target ?? 20}">
          </div>
        </div>

        <div class="sheet-actions">
          <button class="btn-outline util-btn" style="justify-content:center; padding:10px;" onclick="UI.hideModal()">Cancel</button>
          <button id="save-target-btn" class="btn-primary-cta" style="margin:0;">Save Targets</button>
        </div>
      `, {
        onMounted(sheet) {
          sheet.querySelector('#save-target-btn').addEventListener('click', async () => {
            const rev = parseFloat(sheet.querySelector('#input-rev-target').value) || 0;
            const tyres = parseInt(sheet.querySelector('#input-tyre-target').value, 10) || 0;
            const enq = parseInt(sheet.querySelector('#input-srv-enq').value, 10) || 0;
            const al2 = parseInt(sheet.querySelector('#input-srv-align2').value, 10) || 0;
            const alw = parseInt(sheet.querySelector('#input-srv-alignw').value, 10) || 0;
            const comm = parseInt(sheet.querySelector('#input-srv-comm').value, 10) || 0;
            const ro = parseInt(sheet.querySelector('#input-srv-ro').value, 10) || 0;
            const a17 = parseInt(sheet.querySelector('#input-srv-17').value, 10) || 0;

            const serviceTargets = {
              twoWheelerEnquiryTarget: enq,
              twoWheelerAlignmentTarget: al2,
              wheelAlignmentTarget: alw,
              commercialTyreTarget: comm,
              roWaterTarget: ro,
              above17InchTarget: a17
            };

            try {
              await Store.updateMonthlyTarget(targetShopId, rev, tyres, serviceTargets, yearNum, monthNum);
              UI.hideModal();
              UI.showToast('Monthly targets saved successfully', 'success');
              renderContent();
            } catch (err) {
              UI.showToast(err.message || 'Failed to update target', 'error');
            }
          });
        }
      });
    }

    // Set Target CTA click
    container.querySelector('#set-target-header-btn')?.addEventListener('click', () => {
      openSetTargetModal(selectedShopId === 'all' ? shops[0]?.id : selectedShopId);
    });

    // History item edit buttons
    container.querySelectorAll('.target-edit-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const shopId = btn.dataset.shopId;
        openSetTargetModal(shopId);
      });
    });

    // History selectors
    container.querySelector('#history-month-select')?.addEventListener('change', (e) => {
      selectedMonth = e.target.value;
      renderContent();
    });

    container.querySelector('#history-year-select')?.addEventListener('change', (e) => {
      selectedYear = e.target.value;
      renderContent();
    });
  }

  await renderContent();
  return container;
}
