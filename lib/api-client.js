'use client';

// Single source of truth for all API calls. Auth header is injected if a token is present.
const BASE = '/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('procurio_token');
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const message = json?.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status; err.details = json?.error?.details;
    throw err;
  }
  return json;
}

const qs = (params = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

export const api = {
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login:    (data) => request('/auth/login',    { method: 'POST', body: data }),
  me:       ()     => request('/auth/me'),

  listVendors:  (params = {}) => request(`/vendors${qs(params)}`),
  getVendor:    (id) => request(`/vendors/${id}`),
  createVendor: (data) => request('/vendors', { method: 'POST', body: data }),
  updateVendor: (id, data) => request(`/vendors/${id}`, { method: 'PATCH', body: data }),
  deleteVendor: (id) => request(`/vendors/${id}`, { method: 'DELETE' }),
  topVendors:   (limit = 6) => request(`/vendors/top?limit=${limit}`),

  listPRs:    (params = {}) => request(`/purchase-requests${qs(params)}`),
  prBoard:    () => request('/purchase-requests/board'),
  getPR:      (id) => request(`/purchase-requests/${id}`),
  createPR:   (data) => request('/purchase-requests', { method: 'POST', body: data }),
  updatePR:   (id, data) => request(`/purchase-requests/${id}`, { method: 'PATCH', body: data }),
  submitPR:   (id) => request(`/purchase-requests/${id}/submit`, { method: 'POST', body: {} }),
  reviewPR:   (id) => request(`/purchase-requests/${id}/review`, { method: 'POST', body: {} }),
  approvePR:  (id, comment) => request(`/purchase-requests/${id}/approve`, { method: 'POST', body: { comment } }),
  rejectPR:   (id, comment) => request(`/purchase-requests/${id}/reject`,  { method: 'POST', body: { comment } }),
  addQuote:   (id, data) => request(`/purchase-requests/${id}/quotes`, { method: 'POST', body: data }),
  selectVendor: (id, vendorId, amount) => request(`/purchase-requests/${id}/select-vendor`, { method: 'POST', body: { vendorId, amount } }),
  commentPR:  (id, text, internal) => request(`/purchase-requests/${id}/comments`, { method: 'POST', body: { text, internal } }),
  convertToPO: (id, data = {}) => request(`/purchase-requests/${id}/convert-to-po`, { method: 'POST', body: data }),

  listPOs:    (params = {}) => request(`/purchase-orders${qs(params)}`),
  getPO:      (id) => request(`/purchase-orders/${id}`),
  createPO:   (data) => request('/purchase-orders', { method: 'POST', body: data }),
  updatePOStatus: (id, status) => request(`/purchase-orders/${id}/status`, { method: 'PATCH', body: { status } }),
  commentPO:  (id, text) => request(`/purchase-orders/${id}/comments`, { method: 'POST', body: { text } }),
  recentPOs:  (limit = 6) => request(`/purchase-orders/recent?limit=${limit}`),

  listGRNs:   (params = {}) => request(`/grn${qs(params)}`),
  createGRN:  (data) => request('/grn', { method: 'POST', body: data }),

  // AI Assistant
  listAiConversations: () => request('/ai/conversations'),
  getAiConversation:   (id) => request(`/ai/conversations/${id}`),
  deleteAiConversation:(id) => request(`/ai/conversations/${id}`, { method: 'DELETE' }),
  aiChat:              (data) => request('/ai/chat', { method: 'POST', body: data }),

  // Inventory
  inventoryDashboard: () => request('/inventory/dashboard'),
  lowStock:           () => request('/inventory/low-stock'),
  listProducts:       (params = {}) => request(`/inventory/products${qs(params)}`),
  getProduct:         (id) => request(`/inventory/products/${id}`),
  createProduct:      (data) => request('/inventory/products', { method: 'POST', body: data }),
  updateProduct:      (id, data) => request(`/inventory/products/${id}`, { method: 'PATCH', body: data }),
  deleteProduct:      (id) => request(`/inventory/products/${id}`, { method: 'DELETE' }),
  listWarehouses:     () => request('/inventory/warehouses'),
  listMovements:      (params = {}) => request(`/inventory/movements${qs(params)}`),
  adjustStock:        (data) => request('/inventory/adjust',   { method: 'POST', body: data }),
  transferStock:      (data) => request('/inventory/transfer', { method: 'POST', body: data }),

  dashboard:  () => request('/dashboard/overview'),

  // Analytics
  analyticsOverview:        () => request('/analytics/overview'),
  analyticsSpendTrend:      () => request('/analytics/spend-trend'),
  analyticsSpendByCategory: () => request('/analytics/spend-by-category'),
  analyticsSpendByDept:     () => request('/analytics/spend-by-department'),
  analyticsApprovalFunnel:  () => request('/analytics/approval-funnel'),
  analyticsTopVendors:      () => request('/analytics/top-vendors'),
  analyticsCycleTimes:      () => request('/analytics/cycle-times'),

  // Notifications
  listNotifications:   (params = {}) => request(`/notifications${qs(params)}`),
  unreadCount:         () => request('/notifications/unread-count'),
  markNotificationRead:(id) => request(`/notifications/${id}/read`, { method: 'POST', body: {} }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST', body: {} }),

  // Team / Settings
  listTeam:        () => request('/team/members'),
  inviteTeamMember:(data) => request('/team/members', { method: 'POST', body: data }),
  updateMemberRole:(id, role) => request(`/team/members/${id}/role`, { method: 'PATCH', body: { role } }),
  updateMemberStatus:(id, status) => request(`/team/members/${id}/status`, { method: 'PATCH', body: { status } }),
  removeTeamMember:(id) => request(`/team/members/${id}`, { method: 'DELETE' }),
  auditLog:        (params = {}) => request(`/team/audit-log${qs(params)}`),
};

export function saveToken(t) { if (typeof window !== 'undefined') localStorage.setItem('procurio_token', t); }
export function clearToken() { if (typeof window !== 'undefined') localStorage.removeItem('procurio_token'); }