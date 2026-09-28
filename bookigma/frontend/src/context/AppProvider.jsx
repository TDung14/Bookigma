import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppContext } from './contexts';
import * as seed from '../data/seed';
import { load, save, uid } from '../lib/storage';
import { DAILY_TASKS, FEED_XP, POINT_RULES, todayKey } from '../lib/gamification';

/**
 * Kho dữ liệu trung tâm của bản demo.
 * Mọi thay đổi đều được ghi xuống localStorage nên tải lại trang vẫn giữ nguyên trạng thái —
 * điều này quan trọng khi đi demo trước hội đồng.
 */
export function AppProvider({ children }) {
  const [users, setUsers] = useState(() => load('users', seed.users));
  const [books, setBooks] = useState(() => load('books', seed.books));
  const [posts, setPosts] = useState(() => load('posts', seed.posts));
  const [exchanges, setExchanges] = useState(() => load('exchanges', seed.exchanges));
  const [orders, setOrders] = useState(() => load('orders', seed.orders));
  const [reports, setReports] = useState(() => load('reports', seed.reports));
  const [conversations, setConversations] = useState(() => load('conversations', seed.conversations));
  const [progressAll, setProgressAll] = useState(() => load('progress', seed.readingProgress));
  const [carts, setCarts] = useState(() => load('carts', {}));
  const [notifications, setNotifications] = useState(() => load('notifications', seed.notifications));
  const [daily, setDaily] = useState(() => load('daily', {}));
  const [redemptions, setRedemptions] = useState(() => load('redemptions', seed.redemptions));

  useEffect(() => save('users', users), [users]);
  useEffect(() => save('books', books), [books]);
  useEffect(() => save('posts', posts), [posts]);
  useEffect(() => save('exchanges', exchanges), [exchanges]);
  useEffect(() => save('orders', orders), [orders]);
  useEffect(() => save('reports', reports), [reports]);
  useEffect(() => save('conversations', conversations), [conversations]);
  useEffect(() => save('progress', progressAll), [progressAll]);
  useEffect(() => save('carts', carts), [carts]);
  useEffect(() => save('notifications', notifications), [notifications]);
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

  const setCartQty = useCallback((userId, bookId, qty) => {
    setCarts((prev) => {
      const cart = (prev[userId] || [])
        .map((c) => (c.bookId === bookId ? { ...c, qty: Math.max(1, qty) } : c));
      return { ...prev, [userId]: cart };
    });
  }, []);

  const removeFromCart = useCallback((userId, bookId) => {
    setCarts((prev) => ({ ...prev, [userId]: (prev[userId] || []).filter((c) => c.bookId !== bookId) }));
  }, []);

  const clearCart = useCallback((userId) => {
    setCarts((prev) => ({ ...prev, [userId]: [] }));
  }, []);

  // ---------- Đơn hàng ----------
  const placeOrder = useCallback((order) => {
    const code = 'BKG' + Math.floor(100000 + Math.random() * 899999);
    const full = {
      ...order,
      id: uid('o'),
      code,
      createdAt: Date.now(),
      status: 'pending',
      timeline: [{ status: 'pending', at: Date.now(), note: 'Đơn hàng được tạo' }],
    };
    setOrders((prev) => [full, ...prev]);
    // Trừ tồn kho và tăng lượt bán để bảng điều khiển shop phản ánh đúng.
    setBooks((prev) =>
      prev.map((b) => {
        const item = order.items.find((i) => i.bookId === b.id);
        if (!item) return b;
        return { ...b, stock: Math.max(0, b.stock - item.qty), sold: b.sold + item.qty };
      })
    );
    return full;
  }, []);

  const updateOrderStatus = useCallback((orderId, status, note) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status, timeline: [...o.timeline, { status, at: Date.now(), note }] }
          : o
      )
    );
  }, []);

  // ---------- Bài đăng ----------
  const addPost = useCallback((post) => {
    setPosts((prev) => [{ ...post, id: uid('p'), time: Date.now(), likedBy: [], comments: [], hidden: false }, ...prev]);
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

  // ---------- Sản phẩm (shop) ----------
  const upsertBook = useCallback((book) => {
    setBooks((prev) => {
      const exists = prev.some((b) => b.id === book.id);
      if (exists) return prev.map((b) => (b.id === book.id ? { ...b, ...book } : b));
      return [
        {
          rating: 0, ratingCount: 0, sold: 0, status: 'pending', chapters: [], tags: [],
          ...book, id: book.id || uid('b'),
        },
        ...prev,
      ];
    });
  }, []);

  const setBookStatus = useCallback((bookId, status) => {
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, status } : b)));
  }, []);

  const deleteBook = useCallback((bookId) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
  }, []);

  // ---------- Trao đổi sách ----------
  const addExchange = useCallback((item) => {
    setExchanges((prev) => [{ ...item, id: uid('e'), status: 'open' }, ...prev]);
  }, []);

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

  /** Thêm một hộp Blind Book vào giỏ. Sách bên trong được giấu cho tới khi mở hộp. */
  const addBlindBox = useCallback((userId, bookId, blind) => {
    setCarts((prev) => ({ ...prev, [userId]: [...(prev[userId] || []), { bookId, qty: 1, blind }] }));
  }, []);

  /** Mở hộp: lộ tên sách thật trong đơn hàng đã giao. */
  const revealBlindBox = useCallback((orderId, itemIndex) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, items: o.items.map((it, i) => (i === itemIndex ? { ...it, revealed: true } : it)) }
          : o
      )
    );
  }, []);

  // ---------- Thông báo ----------
  const pushNotification = useCallback((userId, text, link = '/') => {
    setNotifications((prev) => [{ id: uid('n'), userId, text, at: Date.now(), read: false, link }, ...prev]);
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
      addBlindBox, revealBlindBox,
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
      addBlindBox, revealBlindBox,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
