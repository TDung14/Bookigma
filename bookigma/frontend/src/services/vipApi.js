import { apiCall } from './api';

export const getVipMe = (userId) =>
  apiCall('/vip/me', 'GET', null, { userId });

export const getVipPlans = () =>
  apiCall('/vip/plans', 'GET');

export const createVipPurchase = (userId, planId) =>
  apiCall('/vip/purchases', 'POST', { planId }, { userId });

export const getVipPurchase = (userId, purchaseId) =>
  apiCall(`/vip/purchases/${purchaseId}`, 'GET', null, { userId });
