import { apiCall } from './api';
import { toBlindBox, toBook, toCartLine, toOrder, toShop, toVoucher } from './mappers';

/** API Shop + Blind Book. Mọi hàm trả về dữ liệu đã chuyển sang dạng giao diện dùng (xem mappers.js). */

const as = (userId) => ({ userId });

// ---------- Cửa hàng ----------
export const fetchBooks = async () => (await apiCall('/books')).map(toBook);
export const fetchBook = async (id, userId) => toBook(await apiCall(`/books/${id}`, 'GET', null, as(userId)));
export const fetchShops = async () => (await apiCall('/shops')).map(toShop);
export const fetchCategories = async () => (await apiCall('/categories')).map((category) => category.name);
export const fetchVouchers = async () => (await apiCall('/vouchers')).map(toVoucher);

// ---------- Giỏ hàng (mọi thao tác trả về cả giỏ sau khi cập nhật) ----------
export const fetchCart = async (userId) => (await apiCall('/cart', 'GET', null, as(userId))).map(toCartLine);
export const addCartItem = async (userId, payload) =>
  (await apiCall('/cart/items', 'POST', payload, as(userId))).map(toCartLine);
export const updateCartItem = async (userId, itemId, quantity) =>
  (await apiCall(`/cart/items/${itemId}`, 'PATCH', { quantity }, as(userId))).map(toCartLine);
export const removeCartItem = async (userId, itemId) =>
  (await apiCall(`/cart/items/${itemId}`, 'DELETE', null, as(userId))).map(toCartLine);

// ---------- Đơn hàng của người mua ----------
/** Thanh toán cả giỏ; trả về danh sách đơn (giỏ được tách theo shop, mỗi hộp Blind Book một đơn). */
export const checkout = async (userId, payload) =>
  (await apiCall('/orders', 'POST', payload, as(userId))).map(toOrder);
export const fetchMyOrders = async (userId) => (await apiCall('/orders', 'GET', null, as(userId))).map(toOrder);
export const cancelOrder = async (userId, orderId, note) =>
  toOrder(await apiCall(`/orders/${orderId}/cancel`, 'PATCH', { note: note || null }, as(userId)));
export const completeOrder = async (userId, orderId) =>
  toOrder(await apiCall(`/orders/${orderId}/complete`, 'PATCH', null, as(userId)));
export const revealBlindBox = async (userId, orderId, itemId) =>
  toOrder(await apiCall(`/orders/${orderId}/items/${itemId}/reveal`, 'PATCH', null, as(userId)));

// ---------- Blind Book ----------
export const matchBlindBox = async (userId, payload) =>
  toBlindBox(await apiCall('/blind-boxes/match', 'POST', payload, as(userId)));

// ---------- Kênh người bán ----------
export const fetchSellerBooks = async (userId) => (await apiCall('/seller/books', 'GET', null, as(userId))).map(toBook);
export const createSellerBook = async (userId, form) => toBook(await apiCall('/seller/books', 'POST', form, as(userId)));
export const updateSellerBook = async (userId, bookId, form) =>
  toBook(await apiCall(`/seller/books/${bookId}`, 'PUT', form, as(userId)));
/** Trả về { deleted, message }: sách đã có đơn hàng thì chỉ bị ẩn chứ không xoá. */
export const deleteSellerBook = (userId, bookId) => apiCall(`/seller/books/${bookId}`, 'DELETE', null, as(userId));
export const fetchSellerOrders = async (userId) => (await apiCall('/seller/orders', 'GET', null, as(userId))).map(toOrder);
export const updateSellerOrderStatus = async (userId, orderId, status, note) =>
  toOrder(await apiCall(`/seller/orders/${orderId}/status`, 'PATCH', { status, note: note || null }, as(userId)));

// ---------- Quản trị ----------
export const fetchAdminBooks = async (userId) => (await apiCall('/admin/books', 'GET', null, as(userId))).map(toBook);
export const updateBookStatus = async (userId, bookId, status) =>
  toBook(await apiCall(`/admin/books/${bookId}/status`, 'PATCH', { status }, as(userId)));
export const deleteBookAsAdmin = (userId, bookId) => apiCall(`/admin/books/${bookId}`, 'DELETE', null, as(userId));
export const fetchAdminOrders = async (userId) => (await apiCall('/admin/orders', 'GET', null, as(userId))).map(toOrder);
