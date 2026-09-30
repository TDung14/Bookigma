import { apiCall } from './api';
import { toListing, toOffer } from './mappers';

/** API sàn trao đổi sách cũ. */

const as = (userId) => ({ userId });

/** Tin đang mở; nếu đã đăng nhập, mỗi tin kèm trạng thái đề nghị của chính mình (myOfferStatus). */
export const fetchListings = async (userId) => (await apiCall('/exchanges', 'GET', null, as(userId))).map(toListing);
/** Tin của tôi ở mọi trạng thái, kèm các đề nghị đã nhận. */
export const fetchMyListings = async (userId) => (await apiCall('/exchanges/mine', 'GET', null, as(userId))).map(toListing);
export const fetchSentOffers = async (userId) =>
  (await apiCall('/exchanges/offers/sent', 'GET', null, as(userId))).map(toOffer);

export const createListing = async (userId, form) => toListing(await apiCall('/exchanges', 'POST', form, as(userId)));
/** status: 'closed' để đóng tin, 'open' để mở lại. */
export const updateListingStatus = async (userId, listingId, status) =>
  toListing(await apiCall(`/exchanges/${listingId}/status`, 'PATCH', { status }, as(userId)));
export const deleteListing = (userId, listingId) => apiCall(`/exchanges/${listingId}`, 'DELETE', null, as(userId));

export const sendOffer = async (userId, listingId, form) =>
  toOffer(await apiCall(`/exchanges/${listingId}/offers`, 'POST', form, as(userId)));
/** action: 'accept' | 'reject' (chủ tin) hoặc 'cancel' (người gửi). */
export const respondToOffer = async (userId, offerId, action) =>
  toOffer(await apiCall(`/exchanges/offers/${offerId}/${action}`, 'PATCH', null, as(userId)));
