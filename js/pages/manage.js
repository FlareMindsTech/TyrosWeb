// Tyros Admin - Workshop & Staff Management (js/pages/manage.js)
// STRICTLY Shops and Users subtabs per user requirement
import { Auth } from '../auth.js';
import { Store } from '../store.js';
import { UI } from '../ui.js';
import { Sheet } from '../sheet.js';
import { Toast } from '../toast.js';

export async function renderManagePage(router, params = {}) {
  const container = document.createElement('div');
  container.className = 'page-container';

  // SKELETON LOADER
  container.innerHTML = `
    <header class="app-header mobile-only-header">
      <div class="app-header-row">
        <div class="app-header-info">
          <h1 class="app-header-title">Manage</h1>
          <div class="app-header-subtitle">Loading branches & team...</div>
        </div>
      </div>
    </header>
    <div style="padding-top: var(--space-4);">
      <div class="skeleton" style="height: 44px; border-radius: var(--radius-md); margin-bottom: var(--space-4);"></div>
      <div style="display:flex; flex-direction:column; gap:var(--space-3);">
        <div class="skeleton" style="height: 120px; border-radius:var(--radius-lg);"></div>
        <div class="skeleton" style="height: 120px; border-radius:var(--radius-lg);"></div>
      </div>
    </div>
  `;

  try {
    let currentTab = (params?.tab === 'users') ? 'users' : 'shops';
    const currentAdmin = Auth.getUser();
    const currentAdminId = (currentAdmin?.id || currentAdmin?._id || '').toString();

    // Fetch live data
    const [shops, users, shopsWithEmployees] = await Promise.all([
      Store.getShops(),
      Store.getUsers(),
      Store.getShopsWithEmployees().catch(() => [])
    ]);

    const shopMap = Object.fromEntries(shops.map(s => [s.id, s.name]));
    const employeeCountMap = Object.fromEntries(
      shopsWithEmployees.map(s => [s.id || s.shopId, s.employeeCount || s.employees?.length || 0])
    );

    const activeShopCount = shops.filter(s => s.isActive !== false).length;
    const totalShopCount = shops.length;
    const activeUserCount = users.filter(u => u.isActive !== false).length;
    const totalUserCount = users.length;

    function renderShell() {
      container.innerHTML = `
        <header class="app-header mobile-only-header">
          <div class="app-header-row">
            <div class="app-header-info">
              <h1 class="app-header-title">Manage</h1>
              <div id="manage-header-sub" class="app-header-subtitle">
                ${currentTab === 'shops'
                  ? `${activeShopCount} active · ${totalShopCount} shops`
                  : `${activeUserCount} active · ${totalUserCount} users`}
              </div>
            </div>
            <div class="app-header-actions">
              <button id="manage-add-btn" class="btn-primary" style="padding: 7px 14px; font-size: 13px; font-weight: 600; min-height: 36px; border-radius: var(--radius-pill); box-shadow: var(--shadow-sm);">
                <span id="manage-add-btn-label">${currentTab === 'shops' ? '+ Add Shop' : '+ Add User'}</span>
              </button>
            </div>
          </div>
        </header>

        <!-- STRICTLY 2 SUBTABS: SHOPS & USERS -->
        <div class="manage-segmented-control" style="margin-top:var(--space-2);">
          <button id="subtab-shops-btn" class="manage-subtab-btn ${currentTab === 'shops' ? 'active' : ''}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Shops (${totalShopCount})</span>
          </button>
          <button id="subtab-users-btn" class="manage-subtab-btn ${currentTab === 'users' ? 'active' : ''}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Users (${totalUserCount})</span>
          </button>
        </div>

        <!-- Dynamic List Container -->
        <div id="manage-items-list" style="display:flex; flex-direction:column; gap:var(--space-3); padding-bottom:var(--space-6);"></div>
      `;

      const shopsBtn = container.querySelector('#subtab-shops-btn');
      const usersBtn = container.querySelector('#subtab-users-btn');
      const headerSub = container.querySelector('#manage-header-sub');
      const addBtnLabel = container.querySelector('#manage-add-btn-label');
      const listEl = container.querySelector('#manage-items-list');

      function switchTab(tab) {
        currentTab = tab;
        listEl.innerHTML = '';
        if (tab === 'shops') {
          shopsBtn.classList.add('active');
          usersBtn.classList.remove('active');
          headerSub.textContent = `${activeShopCount} active · ${totalShopCount} shops`;
          addBtnLabel.textContent = '+ Add Shop';
          renderShopsList(listEl);
        } else {
          usersBtn.classList.add('active');
          shopsBtn.classList.remove('active');
          headerSub.textContent = `${activeUserCount} active · ${totalUserCount} users`;
          addBtnLabel.textContent = '+ Add User';
          renderUsersList(listEl);
        }
      }

      shopsBtn?.addEventListener('click', () => switchTab('shops'));
      usersBtn?.addEventListener('click', () => switchTab('users'));

      // Add Button listener
      container.querySelector('#manage-add-btn')?.addEventListener('click', () => {
        if (currentTab === 'shops') {
          openAddShopSheet();
        } else {
          openAddUserSheet();
        }
      });

      switchTab(currentTab);
    }

    // =========================================================================
    // 1. SHOPS SUBTAB
    // =========================================================================
    function renderShopsList(listEl) {
      listEl.innerHTML = '';
      if (shops.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state-card">
            <div class="empty-state-title">No workshop branches</div>
            <div class="empty-state-desc">Click "+ Add Shop" above to register your first garage branch.</div>
          </div>
        `;
        return;
      }

      shops.forEach(s => {
        const empCount = employeeCountMap[s.id] || 0;
        const card = document.createElement('div');
        card.className = 'manage-card';

        card.innerHTML = `
          <!-- Shop Header -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; align-items:center; gap:var(--space-3);">
              <div style="width:42px; height:42px; border-radius:var(--radius-md); background:var(--accent-subtle); display:flex; align-items:center; justify-content:center; color:var(--accent); flex-shrink:0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div>
                <div style="font-family:var(--font-display); font-size:16.5px; font-weight:700; color:var(--text-primary); line-height:1.2;">
                  ${UI.escape(s.name)}
                </div>
                <div style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">
                  📍 ${UI.escape(s.address || 'Chennai Branch')}
                </div>
                ${s.phone ? `<div style="font-size:12px; color:var(--text-muted); margin-top:1px;">📞 ${UI.escape(s.phone)}</div>` : ''}
                ${s.gstNumber ? `<div style="font-size:11.5px; color:var(--text-muted); margin-top:1px;">GST: ${UI.escape(s.gstNumber)}</div>` : ''}
              </div>
            </div>
            <span class="status-pill status-${s.isActive !== false ? 'completed' : 'other'}">
              ${s.isActive !== false ? 'Active' : 'Inactive'}
            </span>
          </div>

          <!-- Shop Meta Info -->
          <div style="font-size:12px; color:var(--text-muted); padding:8px 0; border-top:1px dashed var(--border-subtle); display:flex; justify-content:space-between; margin-top:8px;">
            <span>Staff: <strong style="color:var(--text-primary);">${empCount} employees</strong></span>
            <span>Branch ID: <span style="font-family:monospace; font-size:11px;">${(s.id || '').slice(0, 8)}...</span></span>
          </div>

          <!-- Shop Actions -->
          <div class="manage-actions-row">
            <button class="btn-action-small toggle-shop-active-btn" data-id="${s.id}" data-active="${s.isActive !== false}" style="color:${s.isActive !== false ? 'var(--status-overdue)' : 'var(--status-completed)'};">
              ${s.isActive !== false ? 'Deactivate' : 'Activate'}
            </button>
            <button class="btn-action-small edit-shop-btn" data-id="${s.id}">
              ✏️ Edit
            </button>
            <button class="btn-action-small delete-shop-btn" data-id="${s.id}" data-name="${s.name}" style="color:var(--status-overdue);">
              🗑️ Delete
            </button>
          </div>
        `;

        // Bind Edit Branch
        card.querySelector('.edit-shop-btn')?.addEventListener('click', () => {
          openEditShopSheet(s);
        });

        // Bind Toggle Active
        card.querySelector('.toggle-shop-active-btn')?.addEventListener('click', () => {
          const isActive = s.isActive !== false;
          Sheet.confirm({
            title: `${isActive ? 'Deactivate' : 'Activate'} Branch`,
            message: `Are you sure you want to ${isActive ? 'deactivate' : 'activate'} "${s.name}"?`,
            confirmText: isActive ? 'Deactivate' : 'Activate',
            danger: isActive,
            onConfirm: async () => {
              try {
                if (isActive) {
                  await Store.deactivateShop(s.id);
                  s.isActive = false;
                  Toast.show(`"${s.name}" deactivated`, 'info');
                } else {
                  await Store.activateShop(s.id);
                  s.isActive = true;
                  Toast.show(`"${s.name}" activated`, 'success');
                }
                renderShell();
              } catch (err) {
                Toast.show(err.message || 'Operation failed', 'error');
              }
            }
          });
        });

        // Bind Delete Branch
        card.querySelector('.delete-shop-btn')?.addEventListener('click', () => {
          Sheet.confirm({
            title: 'Delete Workshop Branch',
            message: `Are you sure you want to permanently delete "${s.name}"? This action cannot be undone.`,
            confirmText: 'Delete Branch',
            danger: true,
            onConfirm: async () => {
              try {
                await Store.deleteShop(s.id);
                const idx = shops.findIndex(item => item.id === s.id);
                if (idx !== -1) shops.splice(idx, 1);
                Toast.show(`Branch "${s.name}" deleted`, 'info');
                renderShell();
              } catch (err) {
                Toast.show(err.message || 'Failed to delete branch', 'error');
              }
            }
          });
        });

        listEl.appendChild(card);
      });
    }

    // =========================================================================
    // 2. USERS SUBTAB
    // =========================================================================
    function renderUsersList(listEl) {
      listEl.innerHTML = '';
      if (users.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state-card">
            <div class="empty-state-title">No staff members</div>
            <div class="empty-state-desc">Click "+ Add User" above to invite or create employees.</div>
          </div>
        `;
        return;
      }

      users.forEach(u => {
        const userName = u.fullName || u.name || (u.phone ? `Staff (${u.phone.slice(-4)})` : 'Staff Member');
        const userPhone = u.phone || 'No phone number';
        const userRole = (u.role || 'EMPLOYEE').toUpperCase();
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
        const isSelf = u.id === currentAdminId;
        const assignedBranches = (u.assignedShopIds && u.assignedShopIds.length > 0)
          ? u.assignedShopIds.map(id => shopMap[id] || id).join(', ')
          : 'All Branches';

        const card = document.createElement('div');
        card.className = 'manage-card';

        card.innerHTML = `
          <!-- User Header -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; align-items:center; gap:var(--space-3);">
              <div style="width:42px; height:42px; border-radius:var(--radius-pill); background:var(--bg-subtle); color:var(--accent); font-family:var(--font-display); font-size:18px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${UI.escape(userName.charAt(0).toUpperCase())}
              </div>
              <div>
                <div style="font-family:var(--font-display); font-size:16px; font-weight:700; color:var(--text-primary); line-height:1.2; display:flex; align-items:center; gap:6px;">
                  <span>${UI.escape(userName)}</span>
                  ${isSelf ? '<span style="font-size:10px; background:var(--accent-subtle); color:var(--accent); padding:1px 6px; border-radius:var(--radius-pill); font-weight:700;">YOU</span>' : ''}
                </div>
                <div style="font-size:13px; color:var(--text-muted); margin-top:2px;">
                  📞 <a href="tel:${u.phone}" style="color:var(--text-primary); text-decoration:none; font-weight:600;">${UI.escape(userPhone)}</a>
                </div>
              </div>
            </div>
            <span class="status-pill status-${isAdmin ? 'completed' : 'other'}">
              ${UI.escape(userRole)}
            </span>
          </div>

          <!-- User Assigned Branch -->
          <div style="font-size:12px; color:var(--text-muted); padding:8px 0; border-top:1px dashed var(--border-subtle); display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span>Branch: <strong style="color:var(--text-primary);">${UI.escape(assignedBranches)}</strong></span>
            <span>Status: <strong style="color:${u.isActive !== false ? 'var(--status-completed)' : 'var(--text-muted)'};">${u.isActive !== false ? 'Active' : 'Inactive'}</strong></span>
          </div>

          <!-- User Actions -->
          <div class="manage-actions-row">
            <button class="btn-action-small reset-pwd-btn" data-id="${u.id}">
              🔑 Reset Password
            </button>
            <button class="btn-action-small edit-user-btn" data-id="${u.id}">
              ✏️ Edit
            </button>
            ${!isSelf ? `
              <button class="btn-action-small toggle-user-active-btn" data-id="${u.id}" data-active="${u.isActive !== false}" style="color:${u.isActive !== false ? 'var(--status-overdue)' : 'var(--status-completed)'};">
                ${u.isActive !== false ? 'Deactivate' : 'Activate'}
              </button>
              <button class="btn-action-small delete-user-btn" data-id="${u.id}" style="color:var(--status-overdue);">
                🗑️
              </button>
            ` : ''}
          </div>
        `;

        // Bind Reset Password
        card.querySelector('.reset-pwd-btn')?.addEventListener('click', () => {
          openResetPasswordSheet(u);
        });

        // Bind Edit User
        card.querySelector('.edit-user-btn')?.addEventListener('click', () => {
          openEditUserSheet(u);
        });

        // Bind Toggle Active
        card.querySelector('.toggle-user-active-btn')?.addEventListener('click', () => {
          const isActive = u.isActive !== false;
          Sheet.confirm({
            title: `${isActive ? 'Deactivate' : 'Activate'} Staff`,
            message: `Are you sure you want to ${isActive ? 'deactivate' : 'activate'} staff member "${userName}"?`,
            confirmText: isActive ? 'Deactivate' : 'Activate',
            danger: isActive,
            onConfirm: async () => {
              try {
                if (isActive) {
                  await Store.deactivateUser(u.id);
                  u.isActive = false;
                  Toast.show(`"${userName}" deactivated`, 'info');
                } else {
                  await Store.activateUser(u.id);
                  u.isActive = true;
                  Toast.show(`"${userName}" activated`, 'success');
                }
                renderShell();
              } catch (err) {
                Toast.show(err.message || 'Operation failed', 'error');
              }
            }
          });
        });

        // Bind Delete User
        card.querySelector('.delete-user-btn')?.addEventListener('click', () => {
          Sheet.confirm({
            title: 'Delete Staff Member',
            message: `Are you sure you want to permanently delete staff account "${userName}"?`,
            confirmText: 'Delete Account',
            danger: true,
            onConfirm: async () => {
              try {
                await Store.deleteUser(u.id);
                const idx = users.findIndex(item => item.id === u.id);
                if (idx !== -1) users.splice(idx, 1);
                Toast.show(`User "${userName}" deleted`, 'info');
                renderShell();
              } catch (err) {
                Toast.show(err.message || 'Failed to delete user', 'error');
              }
            }
          });
        });

        listEl.appendChild(card);
      });
    }

    // =========================================================================
    // MODALS: SHOPS
    // =========================================================================
    function openAddShopSheet() {
      Sheet.open({
        title: 'Add Workshop Branch',
        subtitle: 'Register a new garage location',
        content: `
          <div style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div class="form-group">
              <label class="form-label">Branch Name <span style="color:var(--accent); font-weight:700;">*</span></label>
              <input type="text" id="add-shop-name" class="form-input" placeholder="e.g. Tyros North Branch" required>
            </div>
            <div class="form-group">
              <label class="form-label">Address</label>
              <input type="text" id="add-shop-addr" class="form-input" placeholder="e.g. 142 Anna Salai, Chennai">
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" id="add-shop-phone" class="form-input" placeholder="10-digit mobile" maxlength="10">
            </div>
            <div class="form-group">
              <label class="form-label">GST Number</label>
              <input type="text" id="add-shop-gst" class="form-input" placeholder="Optional GSTIN">
            </div>
            <button id="save-new-shop-btn" class="btn-primary" style="width:100%; margin-top:var(--space-2);">
              Create Workshop Branch
            </button>
          </div>
        `,
        onMount: (sheetEl) => {
          sheetEl.querySelector('#save-new-shop-btn')?.addEventListener('click', async () => {
            const name = sheetEl.querySelector('#add-shop-name')?.value.trim();
            const address = sheetEl.querySelector('#add-shop-addr')?.value.trim();
            const phone = sheetEl.querySelector('#add-shop-phone')?.value.trim().replace(/\D/g, '');
            const gstNumber = sheetEl.querySelector('#add-shop-gst')?.value.trim();

            if (!name) {
              Toast.show('Please enter branch name', 'warning');
              return;
            }

            try {
              const newShop = await Store.createShop({ name, address, phone, gstNumber });
              shops.push(newShop);
              Toast.show(`Branch "${name}" created successfully`, 'success');
              Sheet.close();
              renderShell();
            } catch (err) {
              Toast.show(err.message || 'Failed to create shop', 'error');
            }
          });
        }
      });
    }

    function openEditShopSheet(shop) {
      Sheet.open({
        title: `Edit ${shop.name}`,
        subtitle: 'Update branch information',
        content: `
          <div style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div class="form-group">
              <label class="form-label">Branch Name <span style="color:var(--accent); font-weight:700;">*</span></label>
              <input type="text" id="edit-shop-name" class="form-input" value="${UI.escape(shop.name)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Address</label>
              <input type="text" id="edit-shop-addr" class="form-input" value="${UI.escape(shop.address || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" id="edit-shop-phone" class="form-input" value="${UI.escape(shop.phone || '')}" maxlength="10">
            </div>
            <div class="form-group">
              <label class="form-label">GST Number</label>
              <input type="text" id="edit-shop-gst" class="form-input" value="${UI.escape(shop.gstNumber || '')}">
            </div>
            <button id="save-edit-shop-btn" class="btn-primary" style="width:100%; margin-top:var(--space-2);">
              Save Changes
            </button>
          </div>
        `,
        onMount: (sheetEl) => {
          sheetEl.querySelector('#save-edit-shop-btn')?.addEventListener('click', async () => {
            const name = sheetEl.querySelector('#edit-shop-name')?.value.trim();
            const address = sheetEl.querySelector('#edit-shop-addr')?.value.trim();
            const phone = sheetEl.querySelector('#edit-shop-phone')?.value.trim().replace(/\D/g, '');
            const gstNumber = sheetEl.querySelector('#edit-shop-gst')?.value.trim();

            if (!name) {
              Toast.show('Branch name is required', 'warning');
              return;
            }

            try {
              await Store.updateShop(shop.id, { name, address, phone, gstNumber });
              shop.name = name;
              shop.address = address;
              shop.phone = phone;
              shop.gstNumber = gstNumber;
              Toast.show(`Updated "${name}" successfully`, 'success');
              Sheet.close();
              renderShell();
            } catch (err) {
              Toast.show(err.message || 'Failed to update branch', 'error');
            }
          });
        }
      });
    }

    // =========================================================================
    // MODALS: USERS
    // =========================================================================
    function openAddUserSheet() {
      Sheet.open({
        title: 'Add Staff Member',
        subtitle: 'Create employee login account',
        content: `
          <div style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div class="form-group">
              <label class="form-label">Full Name <span style="color:var(--accent); font-weight:700;">*</span></label>
              <input type="text" id="add-user-name" class="form-input" placeholder="e.g. Ramesh Kumar" required>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number (Login ID) <span style="color:var(--accent); font-weight:700;">*</span></label>
              <input type="tel" id="add-user-phone" class="form-input" placeholder="10-digit mobile number" maxlength="10" required>
            </div>
            <div class="form-group">
              <label class="form-label">Initial Password <span style="color:var(--accent); font-weight:700;">*</span></label>
              <input type="password" id="add-user-pwd" class="form-input" placeholder="Minimum 6 characters" required>
            </div>
            <div class="form-group">
              <label class="form-label">Assign Workshop Branch</label>
              <select id="add-user-shop" class="form-input" style="background:var(--bg-surface);">
                <option value="">All Branches</option>
                ${shops.map(s => `<option value="${s.id}">${UI.escape(s.name)}</option>`).join('')}
              </select>
            </div>
            <button id="save-new-user-btn" class="btn-primary" style="width:100%; margin-top:var(--space-2);">
              Create Staff Account
            </button>
          </div>
        `,
        onMount: (sheetEl) => {
          sheetEl.querySelector('#save-new-user-btn')?.addEventListener('click', async () => {
            const fullName = sheetEl.querySelector('#add-user-name')?.value.trim();
            const phone = sheetEl.querySelector('#add-user-phone')?.value.trim().replace(/\D/g, '');
            const password = sheetEl.querySelector('#add-user-pwd')?.value.trim();
            const shopId = sheetEl.querySelector('#add-user-shop')?.value;

            if (!fullName) return Toast.show('Please enter staff name', 'warning');
            if (phone.length < 10) return Toast.show('Please enter valid 10-digit phone', 'warning');
            if (!password || password.length < 6) return Toast.show('Password must be at least 6 characters', 'warning');

            try {
              const newUser = await Store.createUser({
                fullName,
                phone,
                password,
                shopIds: shopId ? [shopId] : []
              });
              users.push(newUser);
              Toast.show(`Account created for ${fullName}`, 'success');
              Sheet.close();
              renderShell();
            } catch (err) {
              Toast.show(err.message || 'Failed to create user', 'error');
            }
          });
        }
      });
    }

    function openEditUserSheet(user) {
      const curName = user.fullName || user.name || '';
      const curPhone = user.phone || '';
      const curShopId = user.assignedShopIds?.[0] || '';

      Sheet.open({
        title: `Edit Staff: ${curName}`,
        subtitle: 'Update staff profile details',
        content: `
          <div style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div class="form-group">
              <label class="form-label">Full Name <span style="color:var(--accent); font-weight:700;">*</span></label>
              <input type="text" id="edit-user-name" class="form-input" value="${UI.escape(curName)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" id="edit-user-phone" class="form-input" value="${UI.escape(curPhone)}" maxlength="10">
            </div>
            <div class="form-group">
              <label class="form-label">Assigned Branch</label>
              <select id="edit-user-shop" class="form-input" style="background:var(--bg-surface);">
                <option value="">All Branches</option>
                ${shops.map(s => `<option value="${s.id}" ${s.id === curShopId ? 'selected' : ''}>${UI.escape(s.name)}</option>`).join('')}
              </select>
            </div>
            <button id="save-edit-user-btn" class="btn-primary" style="width:100%; margin-top:var(--space-2);">
              Save Staff Details
            </button>
          </div>
        `,
        onMount: (sheetEl) => {
          sheetEl.querySelector('#save-edit-user-btn')?.addEventListener('click', async () => {
            const fullName = sheetEl.querySelector('#edit-user-name')?.value.trim();
            const phone = sheetEl.querySelector('#edit-user-phone')?.value.trim().replace(/\D/g, '');
            const shopId = sheetEl.querySelector('#edit-user-shop')?.value;

            if (!fullName) return Toast.show('Staff name is required', 'warning');

            try {
              await Store.updateUser(user.id, {
                fullName,
                phone,
                assignedShopIds: shopId ? [shopId] : []
              });
              user.fullName = fullName;
              user.name = fullName;
              user.phone = phone;
              user.assignedShopIds = shopId ? [shopId] : [];
              Toast.show(`Updated profile for ${fullName}`, 'success');
              Sheet.close();
              renderShell();
            } catch (err) {
              Toast.show(err.message || 'Failed to update user', 'error');
            }
          });
        }
      });
    }

    function openResetPasswordSheet(user) {
      const uName = user.fullName || user.name || 'Staff Member';

      Sheet.open({
        title: `Reset Password`,
        subtitle: `Set new credentials for ${uName}`,
        content: `
          <div style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div class="form-group">
              <label class="form-label">New Password (min 6 characters)</label>
              <input type="password" id="reset-pwd-input" class="form-input" placeholder="Enter new password" required>
            </div>
            <button id="save-reset-pwd-btn" class="btn-primary" style="width:100%; margin-top:var(--space-2);">
              Update Password
            </button>
          </div>
        `,
        onMount: (sheetEl) => {
          sheetEl.querySelector('#save-reset-pwd-btn')?.addEventListener('click', async () => {
            const pwd = sheetEl.querySelector('#reset-pwd-input')?.value.trim();
            if (!pwd || pwd.length < 6) {
              Toast.show('Password must be at least 6 characters', 'warning');
              return;
            }
            try {
              await Store.resetUserPassword(user.id, pwd);
              Toast.show(`Password updated for ${uName}`, 'success');
              Sheet.close();
            } catch (err) {
              Toast.show(err.message || 'Failed to reset password', 'error');
            }
          });
        }
      });
    }

    // Initial render
    renderShell();

  } catch (err) {
    console.error('[ManagePage] Error:', err);
    container.innerHTML = `
      <div class="empty-state-card" style="padding:48px var(--space-4);">
        <div style="font-size:36px; margin-bottom:12px;">⚠️</div>
        <div class="empty-state-title">Failed to load workshop data</div>
        <div class="empty-state-desc">${UI.escape(err.message || 'Check network connection')}</div>
        <button class="btn-primary" style="margin:var(--space-4) auto 0;" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }

  return container;
}
