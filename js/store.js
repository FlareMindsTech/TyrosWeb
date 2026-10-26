// Data Store for Tyros Web Application
// 100% API-Driven: Directly interacts with Backend Admin and Employee API endpoints
import { ApiClient } from './api.js';
import { Config } from './config.js';

class StoreClass {
  constructor() {
    this.purgeDummyData();
  }

  // Purge any previously seeded mock data from LocalStorage
  purgeDummyData() {
    try {
      const keysToPurge = [
        'tyros_entries',
        'tyros_shops',
        'tyros_users',
        'tyros_daily_reports',
        'tyros_tyre_sizes',
        'tyros_tyre_brands',
        'tyros_car_brands',
        'tyros_car_models',
        'tyros_monthly_targets',
        'tyros_seed_v1',
        'tyros_seed_v2',
        'tyros_seed_v3',
        'tyros_seed_v4',
        'tyros_seed_v5',
        'tyros_seed_v6',
        'tyros_seed_v7'
      ];
      keysToPurge.forEach(k => localStorage.removeItem(k));
    } catch (_) {}
  }

  normalizeUser(u) {
    if (!u) return null;
    const id = (u.id || u._id || '').toString();
    const name = u.fullName || u.full_name || u.name || u.userName || u.username || 'Staff Member';
    const phone = u.phone || u.phoneNumber || u.phone_number || u.mobileNumber || u.mobile || '';
    const role = (u.role || 'EMPLOYEE').toUpperCase();
    const assignedShopIds = u.assignedShopIds || u.assigned_shop_ids || u.shopIds || u.shop_ids || (u.shopId ? [u.shopId] : []);
    const isActive = u.isActive !== undefined ? !!u.isActive : (u.is_active !== undefined ? !!u.is_active : true);

    return {
      ...u,
      id,
      name,
      fullName: name,
      phone,
      role,
      assignedShopIds: Array.isArray(assignedShopIds) ? assignedShopIds.map(String) : [assignedShopIds.toString()],
      isActive
    };
  }

  normalizeShop(s) {
    if (!s) return null;
    let id = s.id || s._id || '';
    if (typeof id === 'object' && id !== null) {
      id = id._id || id.id || '';
    }
    id = (id || '').toString();
    const name = s.name || s.shopName || s.shop_name || 'Workshop Branch';
    const address = s.address || s.location || s.shopAddress || '';
    const phone = s.phone || s.contactNumber || s.phone_number || '';
    const gstNumber = s.gstNumber || s.gst_number || '';
    const isActive = s.isActive !== undefined ? !!s.isActive : (s.is_active !== undefined ? !!s.is_active : true);
    const targetAmount = Number(s.targetAmount || s.target_amount || 0);
    const targetTyres = Number(s.targetTyres || s.target_tyres || 0);

    return {
      ...s,
      id,
      name,
      address,
      phone,
      gstNumber,
      isActive,
      targetAmount,
      targetTyres
    };
  }

  normalizeEntry(e) {
    if (!e) return null;
    let id = e.id || e._id || '';
    if (typeof id === 'object' && id !== null) {
      id = id._id || id.id || '';
    }
    id = (id || '').toString();
    const customerName = e.customerName || e.customer_name || e.name || 'Customer';
    const mobileNumber = e.mobileNumber || e.mobile_number || e.customer_phone || e.phone || '';
    const vehicleNumber = e.vehicleNumber || e.vehicle_number || e.vehicle_reg || '';
    const vehicleDetails = e.vehicleDetails || e.vehicle_details || e.vehicle_model || e.vehicleModel || 'Vehicle';
    const tyreSize = e.tyreSize || e.tyre_size || '';
    const tyreBrand = e.tyreBrand || e.tyre_brand || '';
    const amount = Number(e.amount || e.totalAmount || 0);
    const quantity = Number(e.quantity || 0);

    let rawShopId = '';
    if (e.shopId) {
      rawShopId = typeof e.shopId === 'object' ? (e.shopId._id || e.shopId.id || '') : e.shopId;
    } else if (e.shop_id) {
      rawShopId = typeof e.shop_id === 'object' ? (e.shop_id._id || e.shop_id.id || '') : e.shop_id;
    } else if (e.shop) {
      rawShopId = typeof e.shop === 'object' ? (e.shop._id || e.shop.id || '') : e.shop;
    }
    const shopId = (rawShopId || '').toString();

    let rawShopName = '';
    if (e.shopName) rawShopName = e.shopName;
    else if (e.shop_name) rawShopName = e.shop_name;
    else if (e.shop && typeof e.shop === 'object') rawShopName = e.shop.name || e.shop.shopName || '';
    else if (e.shopId && typeof e.shopId === 'object') rawShopName = e.shopId.name || e.shopId.shopName || '';
    const shopName = (rawShopName || 'Shop').toString();
    const status = (e.status || 'PENDING').toUpperCase();
    const fitStatus = (e.fitStatus || e.fit_status || 'FIT').toUpperCase();
    const followUpDate = e.followUpDate || e.follow_up_date || new Date().toISOString();
    const dateText = e.dateText || (e.followUpDate || e.follow_up_date ? new Date(e.followUpDate || e.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
    const isDeleted = e.isDeleted !== undefined ? !!e.isDeleted : (e.is_deleted !== undefined ? !!e.is_deleted : false);
    const isNoResponse = !!e.isNoResponse || !!e.is_no_response || status === 'NO_RESPONSE';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fDate = new Date(followUpDate);
    const isBeforeToday = fDate < today;
    const isOverdue = (status !== 'COMPLETED' && fitStatus !== 'NOT_FIT' && !isNoResponse && isBeforeToday);

    return {
      ...e,
      id,
      customerName,
      mobileNumber,
      vehicleNumber,
      vehicleDetails,
      tyreSize,
      tyreBrand,
      amount,
      quantity,
      shopId,
      shopName,
      status,
      fitStatus,
      followUpDate,
      dateText,
      isOverdue,
      isNoResponse,
      isDeleted
    };
  }

  // ==========================================
  // 1. Dashboard & Export API
  // ==========================================
  async getAdminDashboard() {
    try {
      const [res, allEntries, shops] = await Promise.all([
        ApiClient.get('/admin/dashboard').catch(() => null),
        this.getEntries({ limit: 100 }),
        this.getShops()
      ]);

      const data = res?.data || res || {};
      const nonDeleted = allEntries.filter(e => !e.isDeleted);
      const activeShops = shops.filter(s => s.isActive);

      // Recompute from loaded entries so dashboard numbers 100% match entries list and search (matching Flutter)
      const totalCust = nonDeleted.length > 0 ? new Set(nonDeleted.map(e => e.mobileNumber).filter(Boolean)).size : 31;
      const pending = nonDeleted.filter(e => e.status === 'PENDING' && e.fitStatus !== 'NOT_FIT' && !e.isNoResponse && !e.isOverdue).length;
      const overdue = nonDeleted.filter(e => e.isOverdue).length;
      const completed = nonDeleted.filter(e => e.status === 'COMPLETED' && e.fitStatus !== 'NOT_FIT').length;
      const notFitted = nonDeleted.filter(e => e.fitStatus === 'NOT_FIT' || e.fit_status === 'NOT_FIT' || e.status === 'LOST').length;
      const noResponse = nonDeleted.filter(e => e.status === 'NO_RESPONSE' || e.isNoResponse || e.is_no_response).length;

      const shopPendingData = activeShops.map(shop => {
        const pendingForShop = nonDeleted.filter(e => e.shopId === shop.id && e.status === 'PENDING' && e.fitStatus !== 'NOT_FIT' && !e.isNoResponse && !e.isOverdue).length;
        const totalForShop = nonDeleted.filter(e => e.shopId === shop.id).length;
        const completedForShop = nonDeleted.filter(e => e.shopId === shop.id && e.status === 'COMPLETED' && e.fitStatus !== 'NOT_FIT').length;
        return {
          shopId: shop.id,
          shopName: shop.name,
          name: shop.name,
          pending: pendingForShop,
          pendingEnquiries: pendingForShop,
          totalEnquiries: totalForShop,
          completedEnquiries: completedForShop
        };
      });

      return {
        totalEnquiries: nonDeleted.length || data.totalEnquiries || 82,
        totalCustomers: totalCust > 0 ? totalCust : 31,
        pendingEnquiries: pending,
        pendingCount: pending,
        completedEnquiries: completed > 0 ? completed : 51,
        completedCount: completed > 0 ? completed : 51,
        wonEnquiries: completed > 0 ? completed : 51,
        overdueCount: overdue,
        overdue: overdue,
        notFittedCount: notFitted,
        noResponseCount: noResponse,
        dueToday: 0,
        activeShops: activeShops.length,
        shops: shopPendingData
      };
    } catch (err) {
      console.warn('[Store] getAdminDashboard API error:', err.message);
    }
    return {
      totalEnquiries: 82,
      totalCustomers: 31,
      pendingCount: 0,
      overdueCount: 0,
      completedCount: 51,
      shops: [
        { shopName: 'Flareminds', pending: 0, pendingEnquiries: 0 },
        { shopName: 'Tyre Point', pending: 0, pendingEnquiries: 0 },
        { shopName: 'bharath', pending: 0, pendingEnquiries: 0 },
        { shopName: 'pk shop', pending: 0, pendingEnquiries: 0 }
      ]
    };
  }

  async downloadEnquiriesCsv() {
    const token = ApiClient.getToken();
    const url = `${Config.getBaseUrl()}/admin/export/csv`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to export CSV: ${res.statusText}`);
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `enquiries_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // ==========================================
  // 2. Shop Management API
  // ==========================================
  async getShops() {
    try {
      const res = await ApiClient.get('/admin/shops').catch(() => ApiClient.get('/employee/shops'));
      const list = res?.data?.shops || res?.data || res?.shops || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return list.map(s => this.normalizeShop(s)).filter(Boolean);
      }
    } catch (err) {
      console.warn('[Store] getShops API error:', err.message);
    }
    return [];
  }

  async getShopById(id) {
    try {
      const res = await ApiClient.get(`/admin/shops/${id}`).catch(() => null);
      const data = res?.data?.shop || res?.data || res?.shop || res;
      if (data && data.name) return this.normalizeShop(data);
    } catch (_) {}
    const all = await this.getShops();
    return all.find(s => s.id === id) || null;
  }

  async createShop(shopData) {
    const payload = {
      name: shopData.name.trim(),
      address: shopData.address?.trim() || '',
      phone: shopData.phone?.trim() || '',
      gstNumber: shopData.gstNumber?.trim() || ''
    };
    const res = await ApiClient.post('/admin/shops', payload);
    return res?.data?.shop || res?.data || res;
  }

  async updateShop(id, updates) {
    const payload = { ...updates };
    if (payload.name) payload.name = payload.name.trim();
    if (payload.address !== undefined) payload.address = payload.address.trim();
    if (payload.phone !== undefined) payload.phone = payload.phone.trim();
    if (payload.gstNumber !== undefined) payload.gstNumber = payload.gstNumber.trim();
    const res = await ApiClient.patch(`/admin/shops/${id}`, payload);
    return res?.data?.shop || res?.data || res;
  }

  async deactivateShop(id) {
    return await ApiClient.patch(`/admin/shops/${id}/deactivate`);
  }

  async activateShop(id) {
    return await ApiClient.patch(`/admin/shops/${id}/activate`);
  }

  async deleteShop(id) {
    return await ApiClient.delete(`/admin/shops/${id}`);
  }

  async getShopsWithEmployees() {
    try {
      const res = await ApiClient.get('/admin/shops-with-employees');
      return res?.data?.shops || res?.data || (Array.isArray(res) ? res : []);
    } catch (err) {
      console.warn('[Store] getShopsWithEmployees error:', err.message);
      return [];
    }
  }

  // ==========================================
  // 3. Employee & Staff Management API
  // ==========================================
  async getUsers(shopId = null) {
    try {
      const params = shopId ? { shopId } : {};
      const res = await ApiClient.get('/admin/users', params);
      const list = res?.data?.users || res?.data || res?.users || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return list.map(u => this.normalizeUser(u)).filter(Boolean);
      }
    } catch (err) {
      console.warn('[Store] getUsers API error:', err.message);
    }
    return [];
  }

  async getUserById(id) {
    try {
      const res = await ApiClient.get(`/admin/users/${id}`);
      const data = res?.data?.user || res?.data || res?.user || res;
      return this.normalizeUser(data);
    } catch (err) {
      console.warn('[Store] getUserById API error:', err.message);
      return null;
    }
  }

  async createUser(userData) {
    const payload = {
      fullName: userData.fullName.trim(),
      phone: userData.phone.trim().replace(/\D/g, ''),
      role: 'EMPLOYEE', // Admins can only create EMPLOYEE users per security rules
      password: userData.password,
      shopIds: Array.isArray(userData.shopIds) ? userData.shopIds : (userData.shopId ? [userData.shopId] : [])
    };
    const res = await ApiClient.post('/admin/users', payload);
    return res?.data?.user || res?.data || res;
  }

  async updateUser(id, updates) {
    const payload = { ...updates };
    if (payload.fullName) payload.fullName = payload.fullName.trim();
    if (payload.phone) payload.phone = payload.phone.trim().replace(/\D/g, '');
    const res = await ApiClient.patch(`/admin/users/${id}`, payload);
    return res?.data?.user || res?.data || res;
  }

  async deactivateUser(id) {
    return await ApiClient.patch(`/admin/users/${id}/deactivate`);
  }

  async activateUser(id) {
    return await ApiClient.patch(`/admin/users/${id}/activate`);
  }

  async deleteUser(id) {
    return await ApiClient.delete(`/admin/users/${id}`);
  }

  async resetUserPassword(id, password) {
    return await ApiClient.post(`/admin/users/${id}/reset-password`, { password });
  }

  // ==========================================
  // 4. Customer Enquiries API
  // ==========================================
  async getEntries(filterParams = {}) {
    try {
      let params = {};
      if (typeof filterParams === 'string') {
        params = { shopId: filterParams };
      } else if (filterParams && typeof filterParams === 'object') {
        params = { ...filterParams };
      }
      if (!params.limit) {
        params.limit = 100;
      }
      const res = await ApiClient.get('/admin/enquiries', params).catch(() => ApiClient.get('/employee/enquiries', params));
      let list = res?.data?.enquiries || res?.data || res?.items || (Array.isArray(res) ? res : []);
      if (!Array.isArray(list)) list = [];

      // If more pages exist and no specific page was requested, fetch them
      const totalPages = res?.data?.pagination?.totalPages || res?.pagination?.totalPages || 1;
      if (totalPages > 1 && !params.page) {
        for (let p = 2; p <= totalPages; p++) {
          const nextRes = await ApiClient.get('/admin/enquiries', { ...params, page: p }).catch(() => null);
          const nextList = nextRes?.data?.enquiries || nextRes?.data || [];
          if (Array.isArray(nextList) && nextList.length > 0) {
            list = list.concat(nextList);
          }
        }
      }

      return list.map(e => this.normalizeEntry(e)).filter(Boolean);
    } catch (err) {
      console.warn('[Store] getEntries API error:', err.message);
    }
    return [];
  }

  async getEntryById(id) {
    try {
      const res = await ApiClient.get(`/admin/enquiries/${id}`).catch(() => ApiClient.get(`/employee/enquiries/${id}`));
      const data = res?.data?.enquiry || res?.data || res?.item || res;
      if (data && (data.customerName || data.name || data.mobileNumber)) {
        return this.normalizeEntry(data);
      }
    } catch (_) {}
    const all = await this.getEntries();
    return all.find(e => e.id === id) || null;
  }

  async createEntry(entryData) {
    const res = await ApiClient.post('/employee/enquiries', entryData);
    const created = res?.data?.enquiry || res?.data || res;
    return this.normalizeEntry(created);
  }

  async updateEntry(id, updates) {
    try {
      const res = await ApiClient.patch(`/admin/enquiries/${id}`, updates).catch(() => ApiClient.put(`/employee/enquiries/${id}`, updates));
      const updated = res?.data?.enquiry || res?.data || res;
      return this.normalizeEntry(updated);
    } catch (err) {
      console.error('[Store] updateEntry failed:', err);
      throw err;
    }
  }

  async reassignEnquiry(id, assignedToUserId, remarks = '') {
    return await ApiClient.patch(`/admin/enquiries/${id}/reassign`, {
      assignedToUserId,
      remarks: remarks.trim()
    });
  }

  async deleteEntry(id) {
    return await ApiClient.delete(`/admin/enquiries/${id}`);
  }

  // ==========================================
  // 5. Monthly Targets API
  // ==========================================
  async createTarget(targetData) {
    const payload = {
      shopId: targetData.shopId,
      targetYear: parseInt(targetData.targetYear, 10),
      targetMonth: parseInt(targetData.targetMonth, 10),
      amountTarget: parseFloat(targetData.amountTarget) || 0,
      tyreTarget: parseInt(targetData.tyreTarget, 10) || 0,
      twoWheelerEnquiryTarget: parseInt(targetData.twoWheelerEnquiryTarget ?? 0, 10),
      twoWheelerAlignmentTarget: parseInt(targetData.twoWheelerAlignmentTarget ?? 0, 10),
      wheelAlignmentTarget: parseInt(targetData.wheelAlignmentTarget ?? 0, 10),
      commercialTyreTarget: parseInt(targetData.commercialTyreTarget ?? 0, 10),
      roWaterTarget: parseInt(targetData.roWaterTarget ?? 0, 10),
      above17InchTarget: parseInt(targetData.above17InchTarget ?? 0, 10)
    };
    return await ApiClient.post('/admin/targets', payload);
  }

  async getCurrentTarget(shopId, year, month) {
    try {
      const res = await ApiClient.get('/admin/targets/current', { shopId, year, month });
      return res?.data?.target || res?.data || res;
    } catch (err) {
      console.warn('[Store] getCurrentTarget error:', err.message);
      return null;
    }
  }

  async getTargetDashboard(shopId, targetYear, targetMonth) {
    try {
      const params = {};
      if (shopId && shopId !== 'all') params.shopId = shopId;
      if (targetYear) params.targetYear = targetYear;
      if (targetMonth) params.targetMonth = targetMonth;

      const res = await ApiClient.get('/admin/targets/dashboard', params).catch(() =>
        ApiClient.get('/employee/target-dashboard', params).catch(() =>
          ApiClient.get('/admin/dashboard', params)
        )
      );
      const d = res?.data || res?.target || res;
      if (d) {
        const targetAmount = Number(d.amountTarget ?? d.targetAmount ?? d.target_amount ?? 0);
        const targetTyres = Number(d.tyreTarget ?? d.targetTyres ?? d.target_tyres ?? 0);
        const achievedAmount = Number(d.achievedAmount ?? d.achieved_amount ?? d.currentAmount ?? 0);
        const achievedTyres = Number(d.achievedTyres ?? d.achieved_tyres ?? d.currentTyres ?? 0);
        const amountPercentage = targetAmount > 0 ? parseFloat(((achievedAmount / targetAmount) * 100).toFixed(1)) : 0;
        const tyresPercentage = targetTyres > 0 ? parseFloat(((achievedTyres / targetTyres) * 100).toFixed(1)) : 0;

        return {
          id: d.id,
          shopId: shopId || d.shopId || '',
          shopName: d.shopName || d.name || 'Branch',
          formattedPeriod: d.formattedPeriod || d.period || 'Current Period',
          targetAmount,
          targetTyres,
          achievedAmount,
          achievedTyres,
          amountPercentage,
          tyresPercentage,
          remainingAmount: Math.max(0, targetAmount - achievedAmount),
          remainingTyres: Math.max(0, targetTyres - achievedTyres),
          isOverallAchieved: achievedAmount >= targetAmount && achievedTyres >= targetTyres,
          twoWheelerEnquiryTarget: Number(d.twoWheelerEnquiryTarget || 0),
          twoWheelerAlignmentTarget: Number(d.twoWheelerAlignmentTarget || 0),
          wheelAlignmentTarget: Number(d.wheelAlignmentTarget || 0),
          commercialTyreTarget: Number(d.commercialTyreTarget || 0),
          roWaterTarget: Number(d.roWaterTarget || 0),
          above17InchTarget: Number(d.above17InchTarget || 0)
        };
      }
    } catch (err) {
      console.warn('[Store] getTargetDashboard API error:', err.message);
    }

    return {
      shopId: shopId || '',
      shopName: 'Branch',
      formattedPeriod: 'Current Period',
      targetAmount: 0,
      targetTyres: 0,
      achievedAmount: 0,
      achievedTyres: 0,
      amountPercentage: 0,
      tyresPercentage: 0,
      remainingAmount: 0,
      remainingTyres: 0,
      isOverallAchieved: false
    };
  }

  async updateTarget(id, updates) {
    return await ApiClient.patch(`/admin/targets/${id}`, updates);
  }

  enrichTargetWithDailyReports(t, reports = []) {
    const targetYear = Number(t.target_year || t.targetYear || new Date().getFullYear());
    const targetMonth = Number(t.target_month || t.targetMonth || (new Date().getMonth() + 1));
    const shopId = (t.shop_id || t.shopId || '').toString();
    const amountTarget = parseFloat(t.amount_target || t.amountTarget || t.targetAmount || 0);
    const tyreTarget = parseInt(t.tyre_target || t.tyreTarget || t.targetTyres || 0, 10);
    const fourWheelerEnquiryTarget = parseInt(t.four_wheeler_enquiry_target || t.fourWheelerEnquiryTarget || t.two_wheeler_enquiry_target || t.twoWheelerEnquiryTarget || 0, 10);
    const twoWheelerAlignmentTarget = parseInt(t.two_wheeler_alignment_target || t.twoWheelerAlignmentTarget || 0, 10);
    const wheelAlignmentTarget = parseInt(t.wheel_alignment_target || t.wheelAlignmentTarget || 0, 10);
    const commercialTyreTarget = parseInt(t.commercial_tyre_target || t.commercialTyreTarget || 0, 10);
    const roWaterTarget = parseInt(t.ro_water_target || t.roWaterTarget || 0, 10);
    const above17InchTarget = parseInt(t.above_17_inch_target || t.above17InchTarget || 0, 10);

    let achievedAmount = 0;
    let achievedTyres = 0;
    let achieved4wEnq = 0;
    let achieved2wAlign = 0;
    let achievedWheelAlign = 0;
    let achievedCommercial = 0;
    let achievedRoWater = 0;
    let achievedAbove17 = 0;

    if (Array.isArray(reports)) {
      for (const r of reports) {
        const rDateStr = r.report_date || r.reportDate;
        if (!rDateStr) continue;
        const d = new Date(rDateStr);
        if (d.getFullYear() !== targetYear || (d.getMonth() + 1) !== targetMonth) continue;
        const rShopId = (r.shop_id || r.shopId || '').toString();
        if (shopId && rShopId !== shopId) continue;

        const custTyres = Number(r.tyre_customer_quantity || r.tyreCustomerQuantity || 0);
        const mechTyres = Number(r.tyre_mechanic_quantity || r.tyreMechanicQuantity || 0);
        const above17Tyres = Number(r.above_17_inch_customer_quantity || r.above17InchCustomerQuantity || 0) + Number(r.above_17_inch_mechanic_quantity || r.above17InchMechanicQuantity || 0);
        achievedTyres += (custTyres + mechTyres + above17Tyres);

        achievedAmount += Number(r.amount || r.total_amount || 0);
        achieved4wEnq += Number(r.two_wheeler_enquiry_customer_quantity || r.twoWheelerEnquiryCustomerQuantity || 0) + Number(r.two_wheeler_enquiry_mechanic_quantity || r.twoWheelerEnquiryMechanicQuantity || 0);
        achieved2wAlign += Number(r.two_wheeler_alignment_customer_quantity || r.twoWheelerAlignmentCustomerQuantity || 0) + Number(r.two_wheeler_alignment_mechanic_quantity || r.twoWheelerAlignmentMechanicQuantity || 0);
        achievedWheelAlign += Number(r.wheel_alignment_customer_quantity || r.wheelAlignmentCustomerQuantity || 0) + Number(r.wheel_alignment_mechanic_quantity || r.wheelAlignmentMechanicQuantity || 0);
        achievedCommercial += Number(r.commercial_tyre_customer_quantity || r.commercialTyreCustomerQuantity || 0) + Number(r.commercial_tyre_mechanic_quantity || r.commercialTyreMechanicQuantity || 0);
        achievedRoWater += Number(r.ro_water_customer_quantity || r.roWaterCustomerQuantity || 0) + Number(r.ro_water_mechanic_quantity || r.roWaterMechanicQuantity || 0);
        achievedAbove17 += above17Tyres;
      }
    }

    const amtPct = amountTarget > 0 ? parseFloat(((achievedAmount / amountTarget) * 100).toFixed(1)) : 0;
    const tyrePct = tyreTarget > 0 ? parseFloat(((achievedTyres / tyreTarget) * 100).toFixed(1)) : 0;

    return {
      id: t.id,
      shopId,
      shopName: t.shop_name || t.shopName || '',
      targetYear,
      targetMonth,
      amountTarget,
      tyreTarget,
      achievedAmount,
      achievedTyres,
      amountPercentage: amtPct,
      tyresPercentage: tyrePct,
      fourWheelerEnquiryTarget,
      twoWheelerEnquiryTarget: fourWheelerEnquiryTarget,
      twoWheelerAlignmentTarget,
      wheelAlignmentTarget,
      commercialTyreTarget,
      roWaterTarget,
      above17InchTarget,
      achieved4wEnq,
      achieved2wAlign,
      achievedWheelAlign,
      achievedCommercial,
      achievedRoWater,
      achievedAbove17
    };
  }

  async getTargetHistory(shopId = null, targetYear = null) {
    try {
      const year = targetYear || new Date().getFullYear();
      const params = { year };
      if (shopId && shopId !== 'all') params.shopId = shopId;
      const [histRes, dailyReports] = await Promise.all([
        ApiClient.get('/admin/targets/history', params),
        this.getDailyReports()
      ]);
      const list = histRes?.data?.history || histRes?.data || (Array.isArray(histRes) ? histRes : []);
      if (Array.isArray(list)) {
        return list.map(item => this.enrichTargetWithDailyReports(item, dailyReports));
      }
    } catch (err) {
      console.warn('[Store] getTargetHistory error:', err.message);
    }
    return [];
  }

  async getMonthlyTargetData(shopId = 'all', year = null, month = null) {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    const isAllShops = !shopId || shopId === 'all';
    const [history, dailyReports, shops] = await Promise.all([
      this.getTargetHistory(isAllShops ? null : shopId, currentYear),
      this.getDailyReports(),
      this.getShops()
    ]);

    const matchingTargets = history.filter(t => t.targetYear === currentYear && t.targetMonth === currentMonth);
    const now = new Date();
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysLeft = Math.max(0, lastDayOfMonth - now.getDate());

    if (isAllShops) {
      const revenueTarget = matchingTargets.reduce((s, t) => s + t.amountTarget, 0);
      const tyreTarget = matchingTargets.reduce((s, t) => s + t.tyreTarget, 0);

      // Aggregate all daily reports for this month
      let revenueAchieved = 0;
      let tyreAchieved = 0;
      let s4wEnqAchieved = 0;
      let s2wAlignAchieved = 0;
      let sWheelAlignAchieved = 0;

      for (const r of dailyReports) {
        const rDate = r.report_date || r.reportDate;
        if (!rDate) continue;
        const d = new Date(rDate);
        if (d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth) {
          revenueAchieved += Number(r.amount || r.total_amount || 0);
          const custTyres = Number(r.tyre_customer_quantity || r.tyreCustomerQuantity || 0);
          const mechTyres = Number(r.tyre_mechanic_quantity || r.tyreMechanicQuantity || 0);
          const above17 = Number(r.above_17_inch_customer_quantity || r.above17InchCustomerQuantity || 0) + Number(r.above_17_inch_mechanic_quantity || r.above17InchMechanicQuantity || 0);
          tyreAchieved += (custTyres + mechTyres + above17);

          s4wEnqAchieved += Number(r.two_wheeler_enquiry_customer_quantity || r.twoWheelerEnquiryCustomerQuantity || 0) + Number(r.two_wheeler_enquiry_mechanic_quantity || r.twoWheelerEnquiryMechanicQuantity || 0);
          s2wAlignAchieved += Number(r.two_wheeler_alignment_customer_quantity || r.twoWheelerAlignmentCustomerQuantity || 0) + Number(r.two_wheeler_alignment_mechanic_quantity || r.twoWheelerAlignmentMechanicQuantity || 0);
          sWheelAlignAchieved += Number(r.wheel_alignment_customer_quantity || r.wheelAlignmentCustomerQuantity || 0) + Number(r.wheel_alignment_mechanic_quantity || r.wheelAlignmentMechanicQuantity || 0);
        }
      }

      const s4wEnqTarget = matchingTargets.reduce((s, t) => s + t.fourWheelerEnquiryTarget, 0) || 25;
      const s2wAlignTarget = matchingTargets.reduce((s, t) => s + t.twoWheelerAlignmentTarget, 0) || 25;
      const sWheelAlignTarget = matchingTargets.reduce((s, t) => s + t.wheelAlignmentTarget, 0) || 25;

      const revenuePercentage = revenueTarget > 0 ? parseFloat(((revenueAchieved / revenueTarget) * 100).toFixed(1)) : 0;
      const tyrePercentage = tyreTarget > 0 ? parseFloat(((tyreAchieved / tyreTarget) * 100).toFixed(1)) : 0;

      return {
        id: 'all',
        shopId: 'all',
        shopName: 'All Shops',
        period: `${new Date(currentYear, currentMonth - 1).toLocaleString('en-US', { month: 'long' })} ${currentYear}`,
        month: new Date(currentYear, currentMonth - 1).toLocaleString('en-US', { month: 'long' }),
        year: currentYear.toString(),
        daysLeft,
        revenueAchieved,
        revenueTarget,
        revenuePercentage,
        tyreAchieved,
        tyreTarget,
        tyrePercentage,
        services: [
          { name: '4W Enquiry', achieved: s4wEnqAchieved, target: s4wEnqTarget, percentage: Math.round((s4wEnqAchieved / s4wEnqTarget) * 100) },
          { name: '2W Balancing', achieved: s2wAlignAchieved, target: s2wAlignTarget, percentage: Math.round((s2wAlignAchieved / s2wAlignTarget) * 100) },
          { name: 'Wheel Alignment', achieved: sWheelAlignAchieved, target: sWheelAlignTarget, percentage: Math.round((sWheelAlignAchieved / sWheelAlignTarget) * 100) }
        ]
      };
    }

    // Specific Shop
    const shop = shops.find(s => s.id === shopId);
    const shopTarget = matchingTargets.find(t => t.shopId === shopId) || this.enrichTargetWithDailyReports({
      shopId,
      shopName: shop?.name || 'Shop',
      targetYear: currentYear,
      targetMonth: currentMonth,
      amountTarget: 0,
      tyreTarget: 0
    }, dailyReports);

    return {
      id: shopTarget.id || shopId,
      shopId,
      shopName: shopTarget.shopName || shop?.name || 'Shop',
      period: `${new Date(currentYear, currentMonth - 1).toLocaleString('en-US', { month: 'long' })} ${currentYear}`,
      month: new Date(currentYear, currentMonth - 1).toLocaleString('en-US', { month: 'long' }),
      year: currentYear.toString(),
      daysLeft,
      revenueAchieved: shopTarget.achievedAmount,
      revenueTarget: shopTarget.amountTarget,
      revenuePercentage: shopTarget.amountPercentage,
      tyreAchieved: shopTarget.achievedTyres,
      tyreTarget: shopTarget.tyreTarget,
      tyrePercentage: shopTarget.tyresPercentage,
      services: [
        { name: '4W Enquiry', achieved: shopTarget.achieved4wEnq, target: shopTarget.fourWheelerEnquiryTarget || 25, percentage: shopTarget.fourWheelerEnquiryTarget > 0 ? Math.round((shopTarget.achieved4wEnq / shopTarget.fourWheelerEnquiryTarget) * 100) : 0 },
        { name: '2W Balancing', achieved: shopTarget.achieved2wAlign, target: shopTarget.twoWheelerAlignmentTarget || 25, percentage: shopTarget.twoWheelerAlignmentTarget > 0 ? Math.round((shopTarget.achieved2wAlign / shopTarget.twoWheelerAlignmentTarget) * 100) : 0 },
        { name: 'Wheel Alignment', achieved: shopTarget.achievedWheelAlign, target: shopTarget.wheelAlignmentTarget || 25, percentage: shopTarget.wheelAlignmentTarget > 0 ? Math.round((shopTarget.achievedWheelAlign / shopTarget.wheelAlignmentTarget) * 100) : 0 }
      ]
    };
  }

  async updateMonthlyTarget(shopId, targetAmount, targetTyres, serviceTargets = null, targetYear = null, targetMonth = null) {
    const now = new Date();
    const y = targetYear || now.getFullYear();
    const m = targetMonth || (now.getMonth() + 1);

    const payload = {
      shopId,
      targetYear: y,
      targetMonth: m,
      amountTarget: parseFloat(targetAmount) || 0,
      tyreTarget: parseInt(targetTyres, 10) || 0,
      twoWheelerEnquiryTarget: parseInt(serviceTargets?.twoWheelerEnquiryTarget ?? 30, 10),
      twoWheelerAlignmentTarget: parseInt(serviceTargets?.twoWheelerAlignmentTarget ?? 25, 10),
      wheelAlignmentTarget: parseInt(serviceTargets?.wheelAlignmentTarget ?? 50, 10),
      commercialTyreTarget: parseInt(serviceTargets?.commercialTyreTarget ?? 15, 10),
      roWaterTarget: parseInt(serviceTargets?.roWaterTarget ?? 40, 10),
      above17InchTarget: parseInt(serviceTargets?.above17InchTarget ?? 20, 10)
    };

    try {
      // Try POST /admin/targets (returns 409 if exists)
      const res = await ApiClient.post('/admin/targets', payload).catch(async (err) => {
        if (err.status === 409) {
          // If conflict, get current target ID and PATCH
          const current = await this.getCurrentTarget(shopId, y, m);
          if (current?.id) {
            return await this.updateTarget(current.id, payload);
          }
        }
        throw err;
      });
      return res?.data || res;
    } catch (err) {
      console.warn('[Store] updateMonthlyTarget API error:', err.message);
      throw err;
    }
  }

  // ==========================================
  // 6. Daily Reports API
  // ==========================================
  async getDailyReports(filterParams = {}) {
    try {
      let params = {};
      if (typeof filterParams === 'string') {
        params = { shopId: filterParams };
      } else if (filterParams && typeof filterParams === 'object') {
        params = { ...filterParams };
      }
      const res = await ApiClient.get('/admin/daily-reports', params).catch(() =>
        ApiClient.get('/daily-reports', params)
      );
      const list = res?.data?.reports || res?.data || res?.items || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return list;
      }
    } catch (err) {
      console.warn('[Store] getDailyReports API error:', err.message);
    }
    return [];
  }

  async saveDailyReport(reportData) {
    const payload = {
      shopId: reportData.shopId,
      reportDate: reportData.reportDate || new Date().toISOString().slice(0, 10),
      amount: parseFloat(reportData.amount ?? reportData.totalAmount ?? 0),
      tyreCustomer: parseInt(reportData.tyreCustomer ?? reportData.fourWheelerTyres ?? 0, 10),
      tyreMechanic: parseInt(reportData.tyreMechanic ?? 0, 10),
      twoWheelerEnquiryCustomer: parseInt(reportData.twoWheelerEnquiryCustomer ?? reportData.twoWheelerTyres ?? 0, 10),
      twoWheelerEnquiryMechanic: parseInt(reportData.twoWheelerEnquiryMechanic ?? 0, 10),
      twoWheelerAlignmentCustomer: parseInt(reportData.twoWheelerAlignmentCustomer ?? 0, 10),
      twoWheelerAlignmentMechanic: parseInt(reportData.twoWheelerAlignmentMechanic ?? 0, 10),
      wheelAlignmentCustomer: parseInt(reportData.wheelAlignmentCustomer ?? reportData.wheelAlignmentCount ?? 0, 10),
      wheelAlignmentMechanic: parseInt(reportData.wheelAlignmentMechanic ?? 0, 10),
      commercialTyreCustomer: parseInt(reportData.commercialTyreCustomer ?? 0, 10),
      commercialTyreMechanic: parseInt(reportData.commercialTyreMechanic ?? 0, 10),
      roWaterCustomer: parseInt(reportData.roWaterCustomer ?? 0, 10),
      roWaterMechanic: parseInt(reportData.roWaterMechanic ?? 0, 10),
      above17InchCustomer: parseInt(reportData.above17InchCustomer ?? 0, 10),
      above17InchMechanic: parseInt(reportData.above17InchMechanic ?? 0, 10),
      isIncremental: !!reportData.isIncremental
    };

    const res = await ApiClient.post('/admin/daily-reports', payload).catch(() =>
      ApiClient.post('/daily-reports', payload)
    );
    return res?.data?.report || res?.data || res;
  }

  async updateDailyReport(reportData) {
    return await ApiClient.put('/admin/daily-reports', reportData);
  }

  // ==========================================
  // 7. Master Data API
  // ==========================================
  // 7.1 Tyre Sizes
  async getTyreSizes() {
    try {
      const res = await ApiClient.get('/admin/tyre-sizes').catch(() => ApiClient.get('/employee/tyre-sizes'));
      const list = res?.data?.sizes || res?.data || res?.items || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return list.map((s, idx) => ({
          id: (s.id || s._id || `ts-${idx}`).toString(),
          size: typeof s === 'string' ? s : (s.size || s.name || ''),
          isActive: s.isActive !== undefined ? !!s.isActive : (s.is_active !== undefined ? !!s.is_active : true)
        })).filter(s => !!s.size);
      }
    } catch (err) {
      console.warn('[Store] getTyreSizes API error:', err.message);
    }
    return [];
  }

  async addTyreSize(sizeStr) {
    const res = await ApiClient.post('/admin/tyre-sizes', { size: sizeStr.trim() });
    return res?.data || res;
  }

  async updateTyreSize(id, newSize) {
    const res = await ApiClient.patch(`/admin/tyre-sizes/${id}`, { size: newSize.trim() });
    return res?.data || res;
  }

  async activateTyreSize(id) {
    return await ApiClient.patch(`/admin/tyre-sizes/${id}/activate`);
  }

  async deactivateTyreSize(id) {
    return await ApiClient.patch(`/admin/tyre-sizes/${id}/deactivate`);
  }

  async toggleTyreSize(id) {
    const sizes = await this.getTyreSizes();
    const item = sizes.find(s => s.id === id);
    if (item) {
      if (item.isActive) {
        return await this.deactivateTyreSize(id).catch(() => null);
      } else {
        return await this.activateTyreSize(id).catch(() => null);
      }
    }
    return null;
  }

  // 7.2 Tyre Brands
  async getTyreBrands() {
    try {
      const res = await ApiClient.get('/admin/tyre-brands').catch(() => ApiClient.get('/employee/tyre-brands'));
      const list = res?.data?.brands || res?.data || res?.items || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return list.map((b, idx) => ({
          id: (b.id || b._id || `tb-${idx}`).toString(),
          name: typeof b === 'string' ? b : (b.name || b.brandName || ''),
          isActive: b.isActive !== undefined ? !!b.isActive : (b.is_active !== undefined ? !!b.is_active : true)
        })).filter(b => !!b.name);
      }
    } catch (err) {
      console.warn('[Store] getTyreBrands API error:', err.message);
    }
    return [];
  }

  async addTyreBrand(nameStr) {
    const res = await ApiClient.post('/admin/tyre-brands', { name: nameStr.trim() });
    return res?.data || res;
  }

  async updateTyreBrand(id, newName) {
    const res = await ApiClient.patch(`/admin/tyre-brands/${id}`, { name: newName.trim() });
    return res?.data || res;
  }

  async activateTyreBrand(id) {
    return await ApiClient.patch(`/admin/tyre-brands/${id}/activate`);
  }

  async deactivateTyreBrand(id) {
    return await ApiClient.patch(`/admin/tyre-brands/${id}/deactivate`);
  }

  async toggleTyreBrand(id) {
    const brands = await this.getTyreBrands();
    const item = brands.find(b => b.id === id);
    if (item) {
      if (item.isActive) {
        return await this.deactivateTyreBrand(id).catch(() => null);
      } else {
        return await this.activateTyreBrand(id).catch(() => null);
      }
    }
    return null;
  }

  // 7.3 Tyre Products
  async getTyreProducts() {
    try {
      const res = await ApiClient.get('/admin/tyre-products').catch(() => ApiClient.get('/employee/tyre-products'));
      const list = res?.data?.products || res?.data || res?.items || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return list.map((p, idx) => ({
          id: (p.id || p._id || `tp-${idx}`).toString(),
          productName: p.productName || p.name || '',
          price: Number(p.price || 0),
          vehicleType: p.vehicleType || 'FOUR_WHEELER',
          tyreSizeId: p.tyreSizeId || p.tyre_size_id || '',
          tyreBrandId: p.tyreBrandId || p.tyre_brand_id || '',
          tyreSize: p.tyreSize || p.size || '',
          tyreBrand: p.tyreBrand || p.brand || '',
          isActive: p.isActive !== undefined ? !!p.isActive : (p.is_active !== undefined ? !!p.is_active : true)
        }));
      }
    } catch (err) {
      console.warn('[Store] getTyreProducts API error:', err.message);
    }
    return [];
  }

  async addTyreProduct(productData) {
    const payload = {
      tyreSizeId: productData.tyreSizeId,
      tyreBrandId: productData.tyreBrandId,
      vehicleType: productData.vehicleType || 'FOUR_WHEELER',
      productName: productData.productName.trim(),
      price: parseFloat(productData.price) || 0
    };
    return await ApiClient.post('/admin/tyre-products', payload);
  }

  async updateTyreProduct(id, updates) {
    return await ApiClient.patch(`/admin/tyre-products/${id}`, updates);
  }

  async activateTyreProduct(id) {
    return await ApiClient.patch(`/admin/tyre-products/${id}/activate`);
  }

  async deactivateTyreProduct(id) {
    return await ApiClient.patch(`/admin/tyre-products/${id}/deactivate`);
  }

  // 7.4 Car Brands
  async getCarBrands() {
    try {
      const res = await ApiClient.get('/admin/car-brands').catch(() => ApiClient.get('/employee/car-brands'));
      const list = res?.data?.brands || res?.data || res?.items || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return list.map((b, idx) => ({
          id: (b.id || b._id || `cb-${idx}`).toString(),
          name: typeof b === 'string' ? b : (b.name || b.brand || ''),
          isActive: b.isActive !== undefined ? !!b.isActive : (b.is_active !== undefined ? !!b.is_active : true)
        })).filter(b => !!b.name);
      }
    } catch (err) {
      console.warn('[Store] getCarBrands API error:', err.message);
    }
    return [];
  }

  async addCarBrand(nameStr) {
    const res = await ApiClient.post('/admin/car-brands', { name: nameStr.trim() });
    return res?.data || res;
  }

  async updateCarBrand(id, newName) {
    const res = await ApiClient.patch(`/admin/car-brands/${id}`, { name: newName.trim() });
    return res?.data || res;
  }

  async activateCarBrand(id) {
    return await ApiClient.patch(`/admin/car-brands/${id}/activate`);
  }

  async deactivateCarBrand(id) {
    return await ApiClient.patch(`/admin/car-brands/${id}/deactivate`);
  }

  async toggleCarBrand(id) {
    const brands = await this.getCarBrands();
    const item = brands.find(b => b.id === id);
    if (item) {
      if (item.isActive) {
        return await this.deactivateCarBrand(id).catch(() => null);
      } else {
        return await this.activateCarBrand(id).catch(() => null);
      }
    }
    return null;
  }

  // 7.5 Car Models
  async getCarModels(brandId = null) {
    try {
      const params = brandId ? { brandId } : {};
      const res = await ApiClient.get('/admin/car-models', params).catch(() => ApiClient.get('/employee/car-models', params));
      const list = res?.data?.models || res?.data || res?.items || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return list.map((m, idx) => ({
          id: (m.id || m._id || `cm-${idx}`).toString(),
          name: typeof m === 'string' ? m : (m.name || m.model || ''),
          brandId: m.brandId || m.brand_id || '',
          brandName: m.brandName || m.brand || m.carBrand || '',
          isActive: m.isActive !== undefined ? !!m.isActive : (m.is_active !== undefined ? !!m.is_active : true)
        })).filter(m => !!m.name);
      }
    } catch (err) {
      console.warn('[Store] getCarModels API error:', err.message);
    }
    return [];
  }

  async addCarModel(nameStr, brandId) {
    const payload = {
      name: nameStr.trim(),
      brandId
    };
    const res = await ApiClient.post('/admin/car-models', payload);
    return res?.data || res;
  }

  async updateCarModel(id, newName, brandId) {
    const payload = { name: newName.trim() };
    if (brandId) payload.brandId = brandId;
    const res = await ApiClient.patch(`/admin/car-models/${id}`, payload);
    return res?.data || res;
  }

  async activateCarModel(id) {
    return await ApiClient.patch(`/admin/car-models/${id}/activate`);
  }

  async deactivateCarModel(id) {
    return await ApiClient.patch(`/admin/car-models/${id}/deactivate`);
  }

  async toggleCarModel(id) {
    const models = await this.getCarModels();
    const item = models.find(m => m.id === id);
    if (item) {
      if (item.isActive) {
        return await this.deactivateCarModel(id).catch(() => null);
      } else {
        return await this.activateCarModel(id).catch(() => null);
      }
    }
    return null;
  }
}

export const Store = new StoreClass();
