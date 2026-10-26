import { apiCall } from './api';

export async function fetchRewardCatalog() {
  return apiCall('/rewards/catalog', 'GET');
}

export async function fetchRedemptions() {
  return apiCall('/rewards/mine', 'GET');
}

export async function fetchMyVouchers() {
  return apiCall('/rewards/vouchers', 'GET');
}

export async function redeemRewardApi(rewardId) {
  return apiCall(`/rewards/${rewardId}/redeem`, 'POST');
}
