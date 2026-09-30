import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { AppContext } from './contexts';
import * as seed from '../data/seed';
import { load, save, uid } from '../lib/storage';
import { DAILY_TASKS, FEED_XP, POINT_RULES, todayKey } from '../lib/gamification';
import { apiCall } from '../services/api';
import * as shopApi from '../services/shopApi';
import * as exchangeApi from '../services/exchangeApi';
import * as notificationApi from '../services/notificationApi';
import { useAuth } from '../hooks/useStore';

/**
 * Dữ liệu riêng của người đang đăng nhập, lấy từ backend. Được "đánh khoá" theo userId:
 * khi đăng xuất / đổi tài khoản, dữ liệu cũ tự bị bỏ qua cho tới khi tải xong dữ liệu mới.
 */
const EMPTY_ACCOUNT = {
  userId: undefined,
  loaded: false,
  cart: [],
  orders: [],
  sellerBooks: [],
  sellerOrders: [],
  adminBooks: [],
  adminOrders: [],
  exchanges: [],
  myExchanges: [],
  sentOffers: [],
  notifications: [],
};

/** Gộp các danh sách theo id; phần tử đứng sau ghi đè phần tử trước nhưng giữ nguyên vị trí. */
function mergeById(...lists) {
  const map = new Map();
  lists.flat().forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

const replaceById = (list, item) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

/** Tải dữ liệu cửa hàng (sách, shop, thể loại, voucher); trả về null nếu không gọi được backend. */
async function fetchCatalog() {
  try {
    const [books, shops, categories, vouchers] = await Promise.all([
      shopApi.fetchBooks(), shopApi.fetchShops(), shopApi.fetchCategories(), shopApi.fetchVouchers(),
    ]);
    return { status: 'ready', books, shops, categories, vouchers };
  } catch {
    return null;
  }
}

/** Lỗi mạng khi đã có dữ liệu thì giữ dữ liệu cũ; chưa có gì thì báo lỗi để trang hiện nút thử lại. */
const applyCatalog = (next) => (prev) => next || { ...prev, status: prev.books.length ? 'ready' : 'error' };

/**
 * Kho dữ liệu trung tâm.
 * - Shop, giỏ hàng, đơn hàng, Blind Book, trao đổi sách, thông báo: đọc/ghi qua API backend.
 * - Các phần chưa có backend (chat, tiến trình đọc, gamification, báo cáo...) vẫn lưu localStorage
 *   như bản demo, nên tải lại trang vẫn giữ nguyên trạng thái.
 */
const normalizeId = (value) => String(value ?? '');

const normalizeChatMessage = (message) => ({
  ...message,
  id: normalizeId(message?.id ?? `${Date.now()}-${Math.random()}`),
  senderId: normalizeId(message?.senderId),
  text: message?.text ?? message?.content ?? '',
  at: Number(message?.at ?? (message?.createdAt ? new Date(message.createdAt).getTime() : Date.now())),
});

const normalizeConversation = (conversation) => ({
  ...conversation,
  participants: Array.isArray(conversation?.participants)
   ? [...new Set(conversation.participants.map((id) => normalizeId(id)))]
   : Array.isArray(conversation?.participantIds)
     ? [...new Set(conversation.participantIds.map((id) => normalizeId(id)))]
     : [],
  messages: Array.isArray(conversation?.messages)
   ? conversation.messages.map((message) => normalizeChatMessage(message))
   : [],
  readBy: Object.fromEntries(
   Object.entries(conversation?.readBy || {}).map(([key, value]) => [normalizeId(key), Number(value) || 0])
  ),
});

const mergeConversationState = (prev, incoming) => {
  const next = new Map(prev.map((c) => [String(c.id), c]));
  const key = String(incoming.id);
  const current = next.get(key) || { id: key, participants: [], messages: [], readBy: {}, updatedAt: Date.now() };
  const merged = {
   ...current,
   ...incoming,
   id: key,
   participants: [...new Set([...(current.participants || []), ...(incoming.participants || [])])],
   messages: incoming.messages?.length ? incoming.messages : current.messages || [],
   updatedAt: Number(incoming.updatedAt || current.updatedAt || Date.now()),
   readBy: { ...(current.readBy || {}), ...(incoming.readBy || {}) },
  };
  next.set(key, merged);
  return Array.from(next.values()).sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
};

export function AppProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const role = user?.role ?? null;

  const [users, setUsers] = useState(() => load('users', seed.users));
  const [posts, setPosts] = useState(() => load('posts', seed.posts));
  const [reports, setReports] = useState(() => load('reports', seed.reports));
  const [conversations, setConversations] = useState(() =>
    (load('conversations', seed.conversations) || []).map(normalizeConversation)
  );
  const [social, setSocial] = useState(() => load('social', {
    friends: { u1: ['u2', 'u3'], u2: ['u1'], u3: ['u1'], u5: ['u2'] },
    followings: { u1: ['u3', 'u5'], u2: ['u3'], u3: ['u5'], u5: ['u1'] },
    friendRequestsSent: {},
    friendRequestsReceived: {},
  }));
  const [progressAll, setProgressAll] = useState(() => load('progress', seed.readingProgress));
  const [localNotifications, setLocalNotifications] = useState(() => load('notifications', seed.notifications));
  const [daily, setDaily] = useState(() => load('daily', {}));
  const [redemptions, setRedemptions] = useState(() => load('redemptions', seed.redemptions));
  const chatClientRef = useRef(null);
  const subscribedConversationIdsRef = useRef(new Set());
  const socketUserIdRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => save('users', users), [users]);
  useEffect(() => save('posts', posts), [posts]);

  // Feed là dữ liệu thật từ MySQL. Nếu backend chưa chạy, giữ seed/local data để UI vẫn mở được.
  useEffect(() => {
    let cancelled = false;
    apiCall('/posts')
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        setPosts(data.map((p) => ({
          id: p.id,
          authorId: p.userId,
          authorName: p.authorName,
          avatarUrl: p.avatarUrl,
          content: p.content,
          image: p.imageUrl || null,
          bookId: p.bookId ?? null,
          time: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
          likedBy: [],
          comments: [],
          hidden: false,
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => save('reports', reports), [reports]);
  useEffect(() => {
    setConversations((prev) => prev.map(normalizeConversation));
  }, []);
  useEffect(() => save('conversations', conversations), [conversations]);
  useEffect(() => save('social', social), [social]);
  useEffect(() => save('progress', progressAll), [progressAll]);
  useEffect(() => save('notifications', localNotifications), [localNotifications]);
  useEffect(() => save('daily', daily), [daily]);
  useEffect(() => save('redemptions', redemptions), [redemptions]);

  // ---------- Tra cứu ----------
  const userById = useCallback((id) => users.find((u) => u.id === id), [users]);
  const bookById = useCallback((id) => books.find((b) => b.id === id), [books]);
  const shopById = useCallback((id) => seed.shops.find((s) => s.id === id), []);

  // ---------- Giỏ hàng ----------
  const getCart = useCallback((userId) => carts[userId] || [], [carts]);

  const addToCart = useCallback((userId, bookId, qty = 1) => {
    setCarts((prev) => {
      const cart = prev[userId] || [];
      const found = cart.find((c) => c.bookId === bookId);
      const next = found
        ? cart.map((c) => (c.bookId === bookId ? { ...c, qty: c.qty + qty } : c))
        : [...cart, { bookId, qty }];
      return { ...prev, [userId]: next };
    });
  }, []);

  const refreshCatalog = useCallback(async () => {
    setCatalog(applyCatalog(await fetchCatalog()));
  }, []);

  // ---------- Dữ liệu của người đang đăng nhập (backend) ----------
  const [accountState, setAccountState] = useState(EMPTY_ACCOUNT);
  const account = accountState.userId === userId ? accountState : EMPTY_ACCOUNT;

  /** Cập nhật một phần dữ liệu của người dùng forUser; bỏ qua nếu người dùng đã đổi. */
  const patchAccount = useCallback((forUser, patch) => {
    setAccountState((prev) => (
      prev.userId === forUser
        ? { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }
        : prev
    ));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const settle = (result) => (result.status === 'fulfilled' ? result.value : []);
    (async () => {
      const results = await Promise.allSettled([
        exchangeApi.fetchListings(userId),
        userId ? shopApi.fetchCart(userId) : [],
        userId ? shopApi.fetchMyOrders(userId) : [],
        userId ? exchangeApi.fetchMyListings(userId) : [],
        userId ? exchangeApi.fetchSentOffers(userId) : [],
        userId ? notificationApi.fetchNotifications(userId) : [],
        role === 'shop' ? shopApi.fetchSellerBooks(userId) : [],
        role === 'shop' ? shopApi.fetchSellerOrders(userId) : [],
        role === 'admin' ? shopApi.fetchAdminBooks(userId) : [],
        role === 'admin' ? shopApi.fetchAdminOrders(userId) : [],
      ]);
      if (cancelled) return;
      const [
        exchanges, cart, orders, myExchanges, sentOffers, notifications,
        sellerBooks, sellerOrders, adminBooks, adminOrders,
      ] = results.map(settle);
      setAccountState({
        userId, loaded: true, exchanges, cart, orders, myExchanges, sentOffers, notifications,
        sellerBooks, sellerOrders, adminBooks, adminOrders,
      });
    })();
    return () => { cancelled = true; };
  }, [userId, role]);

  // Các hàm refresh dưới đây được trang gọi khi mở, để thấy thay đổi do người khác tạo ra
  // (shop xác nhận đơn, có người gửi đề nghị trao đổi...). Lỗi mạng thì giữ dữ liệu cũ.
  const refreshCart = useCallback(async () => {
    if (!userId) return;
    try { patchAccount(userId, { cart: await shopApi.fetchCart(userId) }); } catch { /* giữ dữ liệu cũ */ }
  }, [userId, patchAccount]);

  const refreshOrders = useCallback(async () => {
    if (!userId) return;
    try { patchAccount(userId, { orders: await shopApi.fetchMyOrders(userId) }); } catch { /* giữ dữ liệu cũ */ }
  }, [userId, patchAccount]);

  const refreshSellerData = useCallback(async () => {
    if (role !== 'shop') return;
    try {
      const [sellerBooks, sellerOrders] = await Promise.all([
        shopApi.fetchSellerBooks(userId), shopApi.fetchSellerOrders(userId),
      ]);
      patchAccount(userId, { sellerBooks, sellerOrders });
    } catch { /* giữ dữ liệu cũ */ }
  }, [userId, role, patchAccount]);

  const refreshAdminData = useCallback(async () => {
    if (role !== 'admin') return;
    try {
      const [adminBooks, adminOrders] = await Promise.all([
        shopApi.fetchAdminBooks(userId), shopApi.fetchAdminOrders(userId),
      ]);
      patchAccount(userId, { adminBooks, adminOrders });
    } catch { /* giữ dữ liệu cũ */ }
  }, [userId, role, patchAccount]);

  const refreshExchanges = useCallback(async () => {
    try {
      const [exchanges, myExchanges, sentOffers] = await Promise.all([
        exchangeApi.fetchListings(userId),
        userId ? exchangeApi.fetchMyListings(userId) : [],
        userId ? exchangeApi.fetchSentOffers(userId) : [],
      ]);
      patchAccount(userId, { exchanges, myExchanges, sentOffers });
    } catch { /* giữ dữ liệu cũ */ }
  }, [userId, patchAccount]);

  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    try { patchAccount(userId, { notifications: await notificationApi.fetchNotifications(userId) }); } catch { /* bỏ qua */ }
  }, [userId, patchAccount]);

  // Chưa có WebSocket: hỏi thông báo mới mỗi 30 giây khi đang đăng nhập.
  useEffect(() => {
    if (!userId) return undefined;
    const timer = setInterval(refreshNotifications, 30000);
    return () => clearInterval(timer);
  }, [userId, refreshNotifications]);

  // ---------- Tra cứu ----------
  const books = useMemo(
    () => mergeById(catalog.books, account.sellerBooks, account.adminBooks)
      .map((book) => (chaptersByBook[book.id] ? { ...book, chapters: chaptersByBook[book.id] } : book)),
    [catalog.books, account.sellerBooks, account.adminBooks, chaptersByBook]
  );
  const exchanges = useMemo(
    () => mergeById(account.exchanges, account.myExchanges),
    [account.exchanges, account.myExchanges]
  );

  /** Người dùng backend (chủ shop, người đăng tin...) để chat và các trang cũ hiển thị được tên, avatar. */
  const knownUsers = useMemo(() => {
    const map = new Map();
    const put = (entry) => {
      if (entry?.id === null || entry?.id === undefined || map.has(entry.id)) return;
      map.set(entry.id, { role: 'user', status: 'active', badge: 'Thành viên', points: 0, booksRead: 0, ...entry });
    };
    if (user) put({ id: user.id, name: user.name, avatar: user.avatar, role: user.role, email: user.email });
    catalog.shops.forEach((shop) => put({ id: shop.ownerId, name: shop.name, avatar: shop.avatar, role: 'shop', badge: 'Đối tác' }));
    exchanges.forEach((listing) => put(listing.owner));
    account.myExchanges.forEach((listing) => listing.offers.forEach((offer) => put(offer.sender)));
    account.sentOffers.forEach((offer) => put(offer.owner));
    return map;
  }, [user, catalog.shops, exchanges, account.myExchanges, account.sentOffers]);

  const userById = useCallback((id) => users.find((u) => u.id === id) || knownUsers.get(id), [users, knownUsers]);
  // id từ URL là chuỗi còn id từ backend là số, nên so sánh dạng chuỗi.
  const bookById = useCallback((id) => books.find((b) => String(b.id) === String(id)), [books]);
  const shopById = useCallback((id) => catalog.shops.find((s) => String(s.id) === String(id)), [catalog.shops]);

  /** Tải chi tiết một cuốn (kèm nội dung chương để đọc thử). */
  const loadBook = useCallback(async (id) => {
    const book = await shopApi.fetchBook(id, userId);
    setChaptersByBook((prev) => ({ ...prev, [book.id]: book.chapters || [] }));
    return book;
  }, [userId]);

  // ---------- Giỏ hàng ----------
  const getCart = useCallback((forUser) => (forUser === userId ? account.cart : []), [userId, account.cart]);

  const addToCart = useCallback(async (forUser, bookId, qty = 1) => {
    const cart = await shopApi.addCartItem(forUser, { bookId: Number(bookId), quantity: qty });
    patchAccount(forUser, { cart });
    return cart;
  }, [patchAccount]);

  const updateCartQty = useCallback(async (itemId, qty) => {
    patchAccount(userId, { cart: await shopApi.updateCartItem(userId, itemId, qty) });
  }, [userId, patchAccount]);

  const removeCartItem = useCallback(async (itemId) => {
    patchAccount(userId, { cart: await shopApi.removeCartItem(userId, itemId) });
  }, [userId, patchAccount]);

  // ---------- Đơn hàng (người mua) ----------
  const replaceOrder = useCallback((order) => {
    patchAccount(userId, (prev) => ({ orders: replaceById(prev.orders, order) }));
  }, [userId, patchAccount]);

  /** Thanh toán cả giỏ. Trả về danh sách đơn đã tạo (một đơn cho mỗi shop / mỗi hộp Blind Book). */
  const placeOrder = useCallback(async (checkout) => {
    const created = await shopApi.checkout(userId, checkout);
    patchAccount(userId, (prev) => ({ orders: [...created, ...prev.orders], cart: [] }));
    refreshCatalog(); // tồn kho và lượt bán đã đổi
    refreshNotifications();
    return created;
  }, [userId, patchAccount, refreshCatalog, refreshNotifications]);

  const cancelOrder = useCallback(async (orderId, reason) => {
    const order = await shopApi.cancelOrder(userId, orderId, reason);
    replaceOrder(order);
    refreshCatalog(); // hàng được hoàn lại kho
    return order;
  }, [userId, replaceOrder, refreshCatalog]);

  const completeOrder = useCallback(async (orderId) => {
    const order = await shopApi.completeOrder(userId, orderId);
    replaceOrder(order);
    return order;
  }, [userId, replaceOrder]);

  // ---------- Kênh người bán ----------
  /** Tạo mới (bookId rỗng) hoặc cập nhật sản phẩm của shop. Sản phẩm mới chờ admin duyệt. */
  const saveSellerBook = useCallback(async (bookId, form) => {
    const book = bookId
      ? await shopApi.updateSellerBook(userId, bookId, form)
      : await shopApi.createSellerBook(userId, form);
    patchAccount(userId, (prev) => ({ sellerBooks: replaceById(prev.sellerBooks, book) }));
    refreshCatalog();
    return book;
  }, [userId, patchAccount, refreshCatalog]);

  const deleteSellerBook = useCallback(async (bookId) => {
    const result = await shopApi.deleteSellerBook(userId, bookId);
    patchAccount(userId, (prev) => ({
      sellerBooks: result.deleted
        ? prev.sellerBooks.filter((b) => b.id !== bookId)
        : prev.sellerBooks.map((b) => (b.id === bookId ? { ...b, status: 'hidden' } : b)),
    }));
    refreshCatalog();
    return result;
  }, [userId, patchAccount, refreshCatalog]);

  const updateSellerOrderStatus = useCallback(async (orderId, status, note) => {
    const order = await shopApi.updateSellerOrderStatus(userId, orderId, status, note);
    patchAccount(userId, (prev) => ({ sellerOrders: replaceById(prev.sellerOrders, order) }));
    return order;
  }, [userId, patchAccount]);

  // ---------- Quản trị sản phẩm ----------
  const setBookStatus = useCallback(async (bookId, status) => {
    const book = await shopApi.updateBookStatus(userId, bookId, status);
    patchAccount(userId, (prev) => ({ adminBooks: replaceById(prev.adminBooks, book) }));
    refreshCatalog();
    return book;
  }, [userId, patchAccount, refreshCatalog]);

  const deleteBook = useCallback(async (bookId) => {
    const result = await shopApi.deleteBookAsAdmin(userId, bookId);
    patchAccount(userId, (prev) => ({
      adminBooks: result.deleted
        ? prev.adminBooks.filter((b) => b.id !== bookId)
        : prev.adminBooks.map((b) => (b.id === bookId ? { ...b, status: 'hidden' } : b)),
    }));
    refreshCatalog();
    return result;
  }, [userId, patchAccount, refreshCatalog]);

  // ---------- Bài đăng ----------
  const addPost = useCallback(async (post) => {
    const saved = await apiCall('/posts', 'POST', {
      userId: post.authorId,
      content: post.content,
      imageUrl: post.image || null,
      bookId: /^\d+$/.test(String(post.bookId || '')) ? Number(post.bookId) : null,
      visibility: 'PUBLIC',
    });

    const normalized = {
      id: saved.id,
      authorId: saved.userId,
      authorName: saved.authorName,
      avatarUrl: saved.avatarUrl,
      content: saved.content,
      image: saved.imageUrl || null,
      bookId: saved.bookId ?? null,
      time: saved.createdAt ? new Date(saved.createdAt).getTime() : Date.now(),
      likedBy: [],
      comments: [],
      hidden: false,
    };

    setPosts((prev) => [normalized, ...prev]);
    return normalized;
  }, []);

  const toggleLike = useCallback((postId, userId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = p.likedBy.includes(userId);
        return { ...p, likedBy: liked ? p.likedBy.filter((id) => id !== userId) : [...p.likedBy, userId] };
      })
    );
  }, []);

  const addComment = useCallback((postId, comment) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [...p.comments, { ...comment, id: uid('c'), time: Date.now() }] }
          : p
      )
    );
  }, []);

  const setPostHidden = useCallback((postId, hidden) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, hidden } : p)));
  }, []);

  const deletePost = useCallback((postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  // ---------- Báo cáo vi phạm ----------
  const addReport = useCallback((report) => {
    const full = { ...report, id: uid('r'), status: 'pending', createdAt: Date.now(), handledBy: null, handledNote: '' };
    setReports((prev) => [full, ...prev]);
    return full;
  }, []);

  const resolveReport = useCallback((reportId, status, handledBy, handledNote) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status, handledBy, handledNote, handledAt: Date.now() } : r))
    );
  }, []);

  // ---------- Người dùng (admin) ----------
  const setUserStatus = useCallback((userId, status) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
  }, []);

  const registerUser = useCallback((data) => {
    const user = {
      id: uid('u'), role: 'user', status: 'active', points: 0, badge: 'Thành viên mới',
      booksRead: 0, bio: '', avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(data.email)}`,
      joinedAt: new Date().toISOString().slice(0, 10), ...data,
    };
    setUsers((prev) => [...prev, user]);
    return user;
  }, []);

  // ---------- Trao đổi sách ----------
  // Sau mỗi thao tác tải lại cả ba danh sách (tin đang mở, tin của tôi, đề nghị đã gửi)
  // để số đề nghị và trạng thái luôn khớp giữa các tab.
  const addExchange = useCallback(async (form) => {
    const listing = await exchangeApi.createListing(userId, form);
    await refreshExchanges();
    return listing;
  }, [userId, refreshExchanges]);

  const sendExchangeOffer = useCallback(async (listingId, form) => {
    const offer = await exchangeApi.sendOffer(userId, listingId, form);
    await refreshExchanges();
    return offer;
  }, [userId, refreshExchanges]);

  /** action: 'accept' | 'reject' (chủ tin) hoặc 'cancel' (người gửi rút lại). */
  const respondExchangeOffer = useCallback(async (offerId, action) => {
    const offer = await exchangeApi.respondToOffer(userId, offerId, action);
    await refreshExchanges();
    return offer;
  }, [userId, refreshExchanges]);

  const setExchangeStatus = useCallback(async (listingId, status) => {
    const listing = await exchangeApi.updateListingStatus(userId, listingId, status);
    await refreshExchanges();
    return listing;
  }, [userId, refreshExchanges]);

  const deleteExchange = useCallback(async (listingId) => {
    await exchangeApi.deleteListing(userId, listingId);
    await refreshExchanges();
  }, [userId, refreshExchanges]);

  // ---------- Chat ----------
  const syncConversationsForUser = useCallback(async (userId) => {
    const numericUserId = Number(userId);
    if (!Number.isFinite(numericUserId)) return [];

    try {
      const data = await apiCall(`/chat/conversations?userId=${numericUserId}`);
      if (!Array.isArray(data)) return [];

      const normalized = data.map((conversation) => normalizeConversation({
        ...conversation,
        id: conversation.id,
        participantIds: conversation.participantIds || conversation.participants || [],
        messages: conversation.messages || [],
        updatedAt: conversation.updatedAt || Date.now(),
      }));

      setConversations((prev) => {
        let next = [...prev];
        normalized.forEach((item) => {
          next = mergeConversationState(next, item);
        });
        return next;
      });
      return normalized;
    } catch {
      return [];
    }
  }, []);

  const handleIncomingSocketMessage = useCallback((payload) => {
    if (!payload || !payload.conversationId) return;
    const normalized = normalizeChatMessage({
      ...payload,
      id: payload.id,
      senderId: payload.senderId ?? payload.sender_id,
      text: payload.text ?? payload.content ?? '',
      at: payload.at ?? payload.createdAt,
    });

    setConversations((prev) => {
      const matchId = String(payload.conversationId);
      const exists = prev.some((c) => String(c.id) === matchId);
      if (!exists) return prev;

      return prev.map((conversation) => {
        if (String(conversation.id) !== matchId) return conversation;
        const nextMessages = [...(conversation.messages || [])].filter((message) => String(message.id) !== String(normalized.id));
        return {
          ...conversation,
          messages: [...nextMessages, normalized],
          updatedAt: Date.now(),
        };
      });
    });
  }, []);

  const ensureSocketSubscriptions = useCallback((currentUserId) => {
    const userKey = normalizeId(currentUserId);
    if (!chatClientRef.current || !chatClientRef.current.connected) return;

    setConversations((prev) => {
      prev.filter((conversation) => conversation.participants.map((participant) => normalizeId(participant)).includes(userKey))
        .forEach((conversation) => {
          const conversationId = String(conversation.id);
          if (subscribedConversationIdsRef.current.has(conversationId)) return;

          chatClientRef.current.subscribe(`/topic/chat/${conversationId}`, (frame) => {
            try {
              const payload = JSON.parse(frame.body);
              handleIncomingSocketMessage(payload);
            } catch {
              // Ignore malformed real-time messages and rely on polling fallback.
            }
          });
          subscribedConversationIdsRef.current.add(conversationId);
        });
      return prev;
    });
  }, [handleIncomingSocketMessage]);

  const disconnectChatSocket = useCallback(() => {
    const client = chatClientRef.current;
    if (client) {
      try {
        client.deactivate();
      } catch {
        // Ignore deactivation errors when a browser tab is already tearing down.
      }
      chatClientRef.current = null;
    }
    subscribedConversationIdsRef.current = new Set();
    socketUserIdRef.current = null;
  }, []);

  const connectChatSocket = useCallback((userId) => {
    const nextUserId = normalizeId(userId);
    if (!nextUserId || typeof window === 'undefined' || typeof WebSocket === 'undefined') return;

    if (chatClientRef.current && socketUserIdRef.current === nextUserId && chatClientRef.current.connected) {
      ensureSocketSubscriptions(nextUserId);
      return;
    }

    disconnectChatSocket();

    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
    const baseUrl = apiBase.replace(/\/api$/, '');
    const wsUrl = new URL(baseUrl);
    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl.pathname = '/ws';
    wsUrl.searchParams.set('userId', String(nextUserId));

    const client = new Client({
      webSocketFactory: () => new WebSocket(wsUrl.toString()),
      connectHeaders: {
        userId: String(nextUserId),
        'X-User-Id': String(nextUserId),
      },
      reconnectDelay: 3000,
      heartbeatIncoming: 15000,
      heartbeatOutgoing: 15000,
      debug: () => {},
      onConnect: () => {
        socketUserIdRef.current = nextUserId;
        client.subscribe('/user/queue/messages', (frame) => {
          try {
            const payload = JSON.parse(frame.body);
            handleIncomingSocketMessage(payload);
          } catch {
            // Ignore malformed real-time messages and rely on polling fallback.
          }
        });
        ensureSocketSubscriptions(nextUserId);
      },
      onDisconnect: () => {
        if (socketUserIdRef.current === nextUserId) {
          socketUserIdRef.current = null;
        }
      },
      onStompError: () => {
        socketUserIdRef.current = null;
      },
    });

    chatClientRef.current = client;
    client.activate();
  }, [disconnectChatSocket, ensureSocketSubscriptions, handleIncomingSocketMessage]);

  const findOrCreateConversation = useCallback(async (userA, userB) => {
    const a = normalizeId(userA);
    const b = normalizeId(userB);
    const numericA = Number(a);
    const numericB = Number(b);
    const existing = conversations.find(
      (c) => c.participants.map(normalizeId).includes(a) && c.participants.map(normalizeId).includes(b)
    );
    if (existing) return String(existing.id);

    const localPlaceholder = {
      id: uid('cv'),
      participants: [a, b],
      messages: [],
      updatedAt: Date.now(),
      readBy: {},
    };
    setConversations((prev) => [normalizeConversation(localPlaceholder), ...prev.map(normalizeConversation)]);

    if (Number.isFinite(numericA) && Number.isFinite(numericB) && numericA > 0 && numericB > 0) {
      try {
        const created = await apiCall('/chat/conversations/direct', 'POST', {
          userId: numericA,
          otherUserId: numericB,
        });
        const realConversation = normalizeConversation({
          ...created,
          participantIds: created.participantIds || [numericA, numericB],
          messages: created.messages || [],
          updatedAt: created.updatedAt || Date.now(),
        });

        setConversations((prev) => {
          const filtered = prev.filter((c) => String(c.id) !== String(localPlaceholder.id));
          return mergeConversationState(filtered, realConversation);
        });
        return String(realConversation.id);
      } catch {
        return String(localPlaceholder.id);
      }
    }

    return String(localPlaceholder.id);
  }, [conversations]);

  const createGroupConversation = useCallback(async (creatorId, participantIds, name) => {
    const creator = normalizeId(creatorId);
    const safeParticipants = [...new Set(
      [creator, ...participantIds.map((id) => normalizeId(id))]
        .filter(Boolean)
    )];

    if (safeParticipants.length < 3) {
      throw new Error('Nhóm tối thiểu 3 người, bao gồm bạn.');
    }

    const numericCreator = Number(creator);
    const numericParticipants = safeParticipants
      .filter((id) => String(id) !== String(creator))
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!Number.isFinite(numericCreator) || numericCreator <= 0) {
      throw new Error('Không thể tạo nhóm khi chưa đăng nhập.');
    }

    const localPlaceholder = {
      id: uid('cv'),
      name: name || 'Nhóm chat',
      participants: safeParticipants,
      messages: [],
      updatedAt: Date.now(),
      readBy: {},
    };
    setConversations((prev) => [normalizeConversation(localPlaceholder), ...prev.map(normalizeConversation)]);

    try {
      const created = await apiCall('/chat/conversations/group', 'POST', {
        creatorId: numericCreator,
        participantIds: numericParticipants,
        name: name || `Nhóm của ${creator}`,
      });
      const realConversation = normalizeConversation({
        ...created,
        id: created.id,
        participantIds: created.participantIds || safeParticipants,
        messages: created.messages || [],
        updatedAt: created.updatedAt || Date.now(),
      });

      setConversations((prev) => {
        const filtered = prev.filter((c) => String(c.id) !== String(localPlaceholder.id));
        return mergeConversationState(filtered, realConversation);
      });
      return realConversation;
    } catch (error) {
      console.error('Failed to create group conversation', error);
      throw error;
    }
  }, []);

  const sendMessage = useCallback(async (convId, senderId, text) => {
    const senderKey = normalizeId(senderId);
    const content = String(text ?? '').trim();
    if (!content || !convId) return null;

    const localMessage = normalizeChatMessage({
      id: uid('m'),
      senderId: senderKey,
      text: content,
      at: Date.now(),
    });

    setConversations((prev) =>
      prev.map((c) =>
        String(c.id) === String(convId)
          ? {
              ...c,
              messages: [...(c.messages || []), localMessage],
              updatedAt: Date.now(),
              readBy: { ...(c.readBy || {}), [senderKey]: (c.messages || []).length + 1 },
            }
          : c
      )
    );

    const numericConvId = Number(convId);
    const numericSenderId = Number(senderKey);
    if (!Number.isFinite(numericConvId) || !Number.isFinite(numericSenderId)) {
      return localMessage;
    }

    try {
      const created = await apiCall(`/chat/conversations/${numericConvId}/messages`, 'POST', {
        senderId: numericSenderId,
        content,
      });
      const persisted = normalizeChatMessage({
        ...created,
        text: created.text ?? created.content ?? content,
        at: created.at ?? created.createdAt,
      });
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(convId)
            ? { ...c, messages: [...(c.messages || []).filter((m) => String(m.id) !== String(localMessage.id)), persisted], updatedAt: Date.now() }
            : c
        )
      );
      return persisted;
    } catch {
      return localMessage;
    }
  }, []);

  const markConversationRead = useCallback((convId, userId) => {
    const target = normalizeId(userId);
    setConversations((prev) => {
      const conv = prev.find((c) => c.id === convId);
      // Trả về đúng mảng cũ khi không có gì thay đổi, nếu không React sẽ render lại
      // vô hạn: effect đánh dấu đã đọc -> state mới -> effect chạy lại.
      const currentRead = Object.fromEntries(Object.entries(conv?.readBy || {}).map(([key, value]) => [normalizeId(key), Number(value) || 0]));
      if (!conv || (currentRead[target] ?? 0) >= conv.messages.length) return prev;
      return prev.map((c) =>
        c.id === convId ? { ...c, readBy: { ...Object.fromEntries(Object.entries(c.readBy || {}).map(([key, value]) => [normalizeId(key), Number(value) || 0])), [target]: c.messages.length } } : c
      );
    });
  }, []);

  const unreadCount = useCallback(
    (userId) => {
      const target = normalizeId(userId);
      return conversations
        .filter((c) => c.participants.map(normalizeId).includes(target))
        .reduce((sum, c) => {
          const readBy = Object.fromEntries(Object.entries(c.readBy || {}).map(([key, value]) => [normalizeId(key), Number(value) || 0]));
          return sum + Math.max(0, c.messages.length - (readBy[target] ?? 0));
        }, 0);
    },
    [conversations]
  );

  // ---------- Tiến trình đọc ----------
  const getProgress = useCallback((userId) => progressAll[userId] || {}, [progressAll]);

  const saveProgress = useCallback((userId, bookId, patch) => {
    setProgressAll((prev) => {
      const forUser = prev[userId] || {};
      const current = forUser[bookId] || {
        bookId, chapterIndex: 0, paragraphIndex: 0, percent: 0, secondsRead: 0, finished: false,
      };
      // Trình đọc gọi hàm này mỗi 1,5 giây. Nếu vị trí đọc không đổi thì giữ nguyên
      // state để không phải render lại toàn bộ cây component một cách vô ích.
      const unchanged = Object.keys(patch).every((k) => current[k] === patch[k]);
      if (unchanged) return prev;

      const next = { ...current, ...patch, lastReadAt: Date.now() };
      next.finished = next.percent >= 100;
      return { ...prev, [userId]: { ...forUser, [bookId]: next } };
    });
  }, []);

  // ---------- Gamification ----------

  /** Lấy tiến độ nhiệm vụ của hôm nay; sang ngày mới thì tự đặt lại về 0. */
  const getDaily = useCallback(
    (userId) => {
      const d = daily[userId];
      return d && d.date === todayKey() ? d : { date: todayKey(), counters: {}, claimed: [] };
    },
    [daily]
  );

  /** Cộng điểm Gigma cho người dùng. Mọi hành vi được thưởng đều đi qua đây. */
  const earnPoints = useCallback((userId, amount) => {
    if (!userId || !amount) return;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, points: (u.points || 0) + amount } : u)));
  }, []);

  /**
   * Tăng bộ đếm của một nhiệm vụ hằng ngày (ví dụ số phút đã đọc).
   * Tự động dừng ở mức mục tiêu để không ghi state thừa mỗi giây.
   */
  const trackDaily = useCallback((userId, metric, amount = 1) => {
    if (!userId) return;
    setDaily((prev) => {
      const today = todayKey();
      const cur = prev[userId]?.date === today ? prev[userId] : { date: today, counters: {}, claimed: [] };
      const goal = Math.max(...DAILY_TASKS.filter((t) => t.metric === metric).map((t) => t.goal), 0);
      const now = cur.counters[metric] || 0;
      if (goal && now >= goal) return prev;
      return { ...prev, [userId]: { ...cur, counters: { ...cur.counters, [metric]: now + amount } } };
    });
  }, []);

  /** Nhận thưởng của một nhiệm vụ đã hoàn thành. */
  const claimTask = useCallback((userId, taskId) => {
    const task = DAILY_TASKS.find((t) => t.id === taskId);
    if (!task) return 0;
    let granted = 0;
    setDaily((prev) => {
      const today = todayKey();
      const cur = prev[userId]?.date === today ? prev[userId] : { date: today, counters: {}, claimed: [] };
      if (cur.claimed.includes(taskId)) return prev;
      if ((cur.counters[task.metric] || 0) < task.goal) return prev;
      granted = task.reward;
      return { ...prev, [userId]: { ...cur, claimed: [...cur.claimed, taskId] } };
    });
    return granted;
  }, []);

  /** Cập nhật chuỗi ngày đọc liên tiếp. Bỏ lỡ một ngày là chuỗi về 1. */
  const touchStreak = useCallback((userId) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const today = todayKey();
        if (u.lastStreakDate === today) return u;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = u.lastStreakDate === yesterday ? (u.streak || 0) + 1 : 1;
        return { ...u, streak, lastStreakDate: today, points: (u.points || 0) + POINT_RULES.dailyStreak };
      })
    );
  }, []);

  /** Cho thú ảo ăn: trừ điểm, cộng kinh nghiệm cho thú. */
  const feedPet = useCallback((userId, cost) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId && (u.points || 0) >= cost
          ? { ...u, points: u.points - cost, petXp: (u.petXp || 0) + FEED_XP, petLastFed: Date.now() }
          : u
      )
    );
  }, []);

  /** Thời gian đọc nuôi lớn thú ảo — thú gắn với hành vi thật, không phải đồ trang trí. */
  const growPet = useCallback((userId, xp) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, petXp: (u.petXp || 0) + xp } : u)));
  }, []);

  const renamePet = useCallback((userId, name) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, petName: name } : u)));
  }, []);

  /** Đổi điểm lấy phần thưởng. Trả về false nếu không đủ điểm. */
  const redeemReward = useCallback((userId, reward) => {
    let ok = false;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if ((u.points || 0) < reward.cost) return u;
        ok = true;
        return {
          ...u,
          points: u.points - reward.cost,
          ...(reward.type === 'pet' ? { petXp: (u.petXp || 0) + FEED_XP, petLastFed: Date.now() } : {}),
        };
      })
    );
    if (ok) {
      setRedemptions((prev) => [
        { id: uid('rd'), userId, rewardId: reward.id, name: reward.name, cost: reward.cost, at: Date.now() },
        ...prev,
      ]);
    }
    return ok;
  }, []);

  // ---------- Blind Book ----------

  /** Ghép sách cho hộp (backend chọn và giữ bí mật cuốn sách). Gửi boxId để "Đổi cuốn khác". */
  const matchBlindBox = useCallback((payload) => shopApi.matchBlindBox(userId, payload), [userId]);

  /** Thêm hộp đã ghép vào giỏ. */
  const addBlindBox = useCallback(async (boxId) => {
    patchAccount(userId, { cart: await shopApi.addCartItem(userId, { blindBoxId: boxId }) });
  }, [userId, patchAccount]);

  /** Mở hộp trong đơn đã giao: backend trả về đơn hàng có tên sách thật. */
  const revealBlindBox = useCallback(async (orderId, itemId) => {
    const order = await shopApi.revealBlindBox(userId, orderId, itemId);
    replaceOrder(order);
    return order;
  }, [userId, replaceOrder]);

  // ---------- Thông báo ----------
  // Thông báo từ backend (đơn hàng, trao đổi, duyệt sản phẩm) gộp chung với thông báo cục bộ của bản demo.
  const notifications = useMemo(
    () => [...account.notifications, ...localNotifications].sort((a, b) => b.at - a.at),
    [account.notifications, localNotifications]
  );

  const pushNotification = useCallback((userId, text, link = '/') => {
    setLocalNotifications((prev) => [{ id: uid('n'), userId, text, at: Date.now(), read: false, link }, ...prev]);
  }, []);

  const markNotificationsRead = useCallback((userId) => {
    setNotifications((prev) => prev.map((n) => (n.userId === userId ? { ...n, read: true } : n)));
  }, []);

  const value = useMemo(
    () => ({
      users, books, posts, exchanges, orders, reports, conversations, notifications,
      shops: seed.shops, categories: seed.CATEGORIES, vouchers: seed.vouchers,
      userById, bookById, shopById,
      getCart, addToCart, setCartQty, removeFromCart, clearCart, carts,
      placeOrder, updateOrderStatus,
      addPost, toggleLike, addComment, setPostHidden, deletePost,
      addReport, resolveReport,
      setUserStatus, registerUser,
      upsertBook, setBookStatus, deleteBook,
      addExchange,
      findOrCreateConversation, sendMessage, markConversationRead, unreadCount,
      getProgress, saveProgress,
      pushNotification, markNotificationsRead,
      daily, getDaily, earnPoints, trackDaily, claimTask, touchStreak,
      feedPet, growPet, renamePet, redeemReward, redemptions,
      matchBlindBox, addBlindBox, revealBlindBox,
    }),
    [
      users, books, posts, exchanges, orders, reports, conversations, notifications, carts,
      userById, bookById, shopById, getCart, addToCart, setCartQty, removeFromCart, clearCart,
      placeOrder, updateOrderStatus, addPost, toggleLike, addComment, setPostHidden, deletePost,
      addReport, resolveReport, setUserStatus, registerUser, upsertBook, setBookStatus, deleteBook,
      addExchange, findOrCreateConversation, sendMessage, markConversationRead, unreadCount,
      getProgress, saveProgress, pushNotification, markNotificationsRead,
      daily, getDaily, earnPoints, trackDaily, claimTask, touchStreak,
      feedPet, growPet, renamePet, redeemReward, redemptions,
      matchBlindBox, addBlindBox, revealBlindBox,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
