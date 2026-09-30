import { useCallback, useEffect, useMemo, useState } from 'react';
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
export function AppProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const role = user?.role ?? null;

  const [users, setUsers] = useState(() => load('users', seed.users));
  const [posts, setPosts] = useState(() => load('posts', seed.posts));
  const [reports, setReports] = useState(() => load('reports', seed.reports));
  const [conversations, setConversations] = useState(() => load('conversations', seed.conversations));
  const [progressAll, setProgressAll] = useState(() => load('progress', seed.readingProgress));
  const [localNotifications, setLocalNotifications] = useState(() => load('notifications', seed.notifications));
  const [daily, setDaily] = useState(() => load('daily', {}));
  const [redemptions, setRedemptions] = useState(() => load('redemptions', seed.redemptions));

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
  useEffect(() => save('conversations', conversations), [conversations]);
  useEffect(() => save('progress', progressAll), [progressAll]);
  useEffect(() => save('notifications', localNotifications), [localNotifications]);
  useEffect(() => save('daily', daily), [daily]);
  useEffect(() => save('redemptions', redemptions), [redemptions]);

  // ---------- Cửa hàng (backend) ----------
  const [catalog, setCatalog] = useState({ status: 'loading', books: [], shops: [], categories: [], vouchers: [] });
  const [chaptersByBook, setChaptersByBook] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetchCatalog().then((next) => {
      if (!cancelled) setCatalog(applyCatalog(next));
    });
    return () => { cancelled = true; };
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
  const findOrCreateConversation = useCallback((userA, userB) => {
    let found = conversations.find(
      (c) => c.participants.includes(userA) && c.participants.includes(userB)
    );
    if (found) return found.id;
    const conv = {
      id: uid('cv'), participants: [userA, userB], messages: [], updatedAt: Date.now(), readBy: {},
    };
    setConversations((prev) => [conv, ...prev]);
    return conv.id;
  }, [conversations]);

  const sendMessage = useCallback((convId, senderId, text) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, { id: uid('m'), senderId, text, at: Date.now() }],
              updatedAt: Date.now(),
              readBy: { ...c.readBy, [senderId]: c.messages.length + 1 },
            }
          : c
      )
    );
  }, []);

  const markConversationRead = useCallback((convId, userId) => {
    setConversations((prev) => {
      const conv = prev.find((c) => c.id === convId);
      // Trả về đúng mảng cũ khi không có gì thay đổi, nếu không React sẽ render lại
      // vô hạn: effect đánh dấu đã đọc -> state mới -> effect chạy lại.
      if (!conv || (conv.readBy?.[userId] ?? 0) >= conv.messages.length) return prev;
      return prev.map((c) =>
        c.id === convId ? { ...c, readBy: { ...c.readBy, [userId]: c.messages.length } } : c
      );
    });
  }, []);

  const unreadCount = useCallback(
    (userId) =>
      conversations
        .filter((c) => c.participants.includes(userId))
        .reduce((sum, c) => sum + Math.max(0, c.messages.length - (c.readBy?.[userId] ?? 0)), 0),
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

  const markNotificationsRead = useCallback((forUser) => {
    setLocalNotifications((prev) => prev.map((n) => (n.userId === forUser ? { ...n, read: true } : n)));
    if (forUser && forUser === userId && account.notifications.some((n) => !n.read)) {
      patchAccount(forUser, (prev) => ({ notifications: prev.notifications.map((n) => ({ ...n, read: true })) }));
      notificationApi.markAllNotificationsRead(forUser).catch(() => {});
    }
  }, [userId, account.notifications, patchAccount]);

  const value = useMemo(
    () => ({
      users, books, posts, exchanges, orders: account.orders, reports, conversations, notifications,
      shops: catalog.shops, categories: catalog.categories, vouchers: catalog.vouchers,
      catalogStatus: catalog.status, accountReady: account.loaded,
      sellerBooks: account.sellerBooks, sellerOrders: account.sellerOrders, adminOrders: account.adminOrders,
      myExchanges: account.myExchanges, sentOffers: account.sentOffers,
      userById, bookById, shopById, loadBook,
      refreshCatalog, refreshCart, refreshOrders, refreshSellerData, refreshAdminData, refreshExchanges,
      getCart, addToCart, updateCartQty, removeCartItem,
      placeOrder, cancelOrder, completeOrder,
      addPost, toggleLike, addComment, setPostHidden, deletePost,
      addReport, resolveReport,
      setUserStatus, registerUser,
      saveSellerBook, deleteSellerBook, updateSellerOrderStatus, setBookStatus, deleteBook,
      addExchange, sendExchangeOffer, respondExchangeOffer, setExchangeStatus, deleteExchange,
      findOrCreateConversation, sendMessage, markConversationRead, unreadCount,
      getProgress, saveProgress,
      pushNotification, markNotificationsRead,
      daily, getDaily, earnPoints, trackDaily, claimTask, touchStreak,
      feedPet, growPet, renamePet, redeemReward, redemptions,
      matchBlindBox, addBlindBox, revealBlindBox,
    }),
    [
      users, books, posts, exchanges, account.orders, reports, conversations, notifications,
      catalog.shops, catalog.categories, catalog.vouchers, catalog.status, account.loaded,
      account.sellerBooks, account.sellerOrders, account.adminOrders, account.myExchanges, account.sentOffers,
      userById, bookById, shopById, loadBook,
      refreshCatalog, refreshCart, refreshOrders, refreshSellerData, refreshAdminData, refreshExchanges,
      getCart, addToCart, updateCartQty, removeCartItem, placeOrder, cancelOrder, completeOrder,
      addPost, toggleLike, addComment, setPostHidden, deletePost,
      addReport, resolveReport, setUserStatus, registerUser,
      saveSellerBook, deleteSellerBook, updateSellerOrderStatus, setBookStatus, deleteBook,
      addExchange, sendExchangeOffer, respondExchangeOffer, setExchangeStatus, deleteExchange,
      findOrCreateConversation, sendMessage, markConversationRead, unreadCount,
      getProgress, saveProgress, pushNotification, markNotificationsRead,
      daily, getDaily, earnPoints, trackDaily, claimTask, touchStreak,
      feedPet, growPet, renamePet, redeemReward, redemptions,
      matchBlindBox, addBlindBox, revealBlindBox,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
