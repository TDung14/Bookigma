import { apiCall } from './api';

export const getVipMe = (userId) =>
  apiCall('/vip/me', 'GET', null, { userId });

export const getVipPlans = () =>
  apiCall('/vip/plans', 'GET');

/** couponCode: mã gia hạn VIP (giảm %), có thể bỏ trống. */
export const createVipPurchase = (userId, planId, couponCode = null) =>
  apiCall('/vip/purchases', 'POST', { planId, couponCode }, { userId });

export const getVipPurchase = (userId, purchaseId) =>
  apiCall(`/vip/purchases/${purchaseId}`, 'GET', null, { userId });
