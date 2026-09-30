import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { AppContext } from './contexts';
import * as seed from '../data/seed';
import { load, save, uid } from '../lib/storage';
import { DAILY_TASKS, FEED_XP, POINT_RULES, todayKey } from '../lib/gamification';
import { apiCall } from '../services/api';

/**
 * Kho dữ liệu trung tâm của bản demo.
 * Mọi thay đổi đều được ghi xuống localStorage nên tải lại trang vẫn giữ nguyên trạng thái —
 * điều này quan trọng khi đi demo trước hội đồng.
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
  const [users, setUsers] = useState(() => load('users', seed.users));
  const [books, setBooks] = useState(() => load('books', seed.books));
  const [posts, setPosts] = useState(() => load('posts', seed.posts));
  const [exchanges, setExchanges] = useState(() => load('exchanges', seed.exchanges));
  const [orders, setOrders] = useState(() => load('orders', seed.orders));
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
  const [carts, setCarts] = useState(() => load('carts', {}));
  const [notifications, setNotifications] = useState(() => load('notifications', seed.notifications));
  const [daily, setDaily] = useState(() => load('daily', {}));
  const [redemptions, setRedemptions] = useState(() => load('redemptions', seed.redemptions));
  const chatClientRef = useRef(null);
  const subscribedConversationIdsRef = useRef(new Set());
  const socketUserIdRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => save('users', users), [users]);
  useEffect(() => save('books', books), [books]);
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
  useEffect(() => save('exchanges', exchanges), [exchanges]);
  useEffect(() => save('orders', orders), [orders]);
  useEffect(() => save('reports', reports), [reports]);
  useEffect(() => {
    setConversations((prev) => prev.map(normalizeConversation));
  }, []);
  useEffect(() => save('conversations', conversations), [conversations]);
  useEffect(() => save('social', social), [social]);
  useEffect(() => save('progress', progressAll), [progressAll]);
  useEffect(() => save('carts', carts), [carts]);
  useEffect(() => save('notifications', notifications), [notifications]);
  useEffect(() => save('daily', daily), [daily]);
  useEffect(() => save('redemptions', redemptions), [redemptions]);

  // ---------- Tra cứu ----------
  const userById = useCallback((id) => users.find((u) => normalizeId(u.id) === normalizeId(id)), [users]);
  const bookById = useCallback((id) => books.find((b) => b.id === id), [books]);
  const shopById = useCallback((id) => seed.shops.find((s) => s.id === id), []);
  const upsertUser = useCallback((userData) => {
    if (!userData || !userData.id) return null;
    const nextUser = {
      ...userData,
      id: String(userData.id),
      name: userData.name || userData.fullName || userData.username || 'Người dùng',
      avatar: userData.avatar || userData.avatarUrl || 'https://i.pravatar.cc/150?img=12',
      role: userData.role || 'user',
      status: userData.status || 'active',
      badge: userData.badge || 'Thành viên',
      points: userData.points || 0,
      booksRead: userData.booksRead || 0,
      joinedAt: userData.joinedAt || new Date().toISOString().slice(0, 10),
    };
    setUsers((prev) => {
      const exists = prev.some((u) => String(u.id) === String(nextUser.id));
      if (exists) {
        return prev.map((u) => (String(u.id) === String(nextUser.id) ? { ...u, ...nextUser } : u));
      }
      return [nextUser, ...prev];
    });
    return nextUser;
  }, []);

  const syncUsers = useCallback(async () => {
    try {
      const data = await apiCall('/users');
      if (!Array.isArray(data)) return [];
      const normalized = data
        .filter((u) => u && Number.isFinite(Number(u.id)))
        .map((u) => ({
          ...u,
          id: String(u.id),
          name: u.fullName || u.username || 'Người dùng',
          avatar: u.avatarUrl || `https://i.pravatar.cc/150?u=${encodeURIComponent(u.email || u.username || u.id)}`,
          role: (u.role || 'user').toLowerCase(),
          status: u.active === false ? 'suspended' : 'active',
          badge: 'Thành viên',
          points: 0,
          booksRead: 0,
          joinedAt: u.createdAt || new Date().toISOString(),
        }));

      setUsers((prev) => {
        const existing = new Map(prev.map((u) => [String(u.id), u]));
        normalized.forEach((u) => existing.set(String(u.id), { ...existing.get(String(u.id)), ...u }));
        return Array.from(existing.values());
      });
      return normalized;
    } catch {
      return [];
    }
  }, []);
  const getFriends = useCallback((userId) => social.friends?.[userId] || [], [social]);
  const getFollowing = useCallback((userId) => social.followings?.[userId] || [], [social]);
  const getFriendRequestsSent = useCallback((userId) => social.friendRequestsSent?.[userId] || [], [social]);
  const getFriendRequestsReceived = useCallback((userId) => social.friendRequestsReceived?.[userId] || [], [social]);
  const getFollowers = useCallback(
    (userId) => Object.entries(social.followings || {}).filter(([, ids]) => ids.includes(userId)).map(([id]) => id),
    [social]
  );
  const isFriend = useCallback((userId, otherId) => !!userId && !!otherId && userId !== otherId && getFriends(userId).includes(otherId), [getFriends]);
  const isFollowing = useCallback((userId, otherId) => !!userId && !!otherId && userId !== otherId && getFollowing(userId).includes(otherId), [getFollowing]);
  const hasSentFriendRequest = useCallback((userId, otherId) => !!userId && !!otherId && userId !== otherId && getFriendRequestsSent(userId).includes(otherId), [getFriendRequestsSent]);
  const hasReceivedFriendRequest = useCallback((userId, otherId) => !!userId && !!otherId && userId !== otherId && getFriendRequestsReceived(userId).includes(otherId), [getFriendRequestsReceived]);

  const acceptFriendRequest = useCallback((userId, otherId) => {
    if (!userId || !otherId || userId === otherId) return false;
    let accepted = false;
    setSocial((prev) => {
      const nextFriends = { ...(prev.friends || {}) };
      const nextSent = { ...(prev.friendRequestsSent || {}) };
      const nextReceived = { ...(prev.friendRequestsReceived || {}) };

      const mineFriends = new Set(nextFriends[userId] || []);
      const theirsFriends = new Set(nextFriends[otherId] || []);
      mineFriends.add(otherId);
      theirsFriends.add(userId);
      nextFriends[userId] = Array.from(mineFriends);
      nextFriends[otherId] = Array.from(theirsFriends);

      nextSent[userId] = (nextSent[userId] || []).filter((id) => id !== otherId);
      nextReceived[otherId] = (nextReceived[otherId] || []).filter((id) => id !== userId);
      nextReceived[userId] = (nextReceived[userId] || []).filter((id) => id !== otherId);
      nextSent[otherId] = (nextSent[otherId] || []).filter((id) => id !== userId);

      if (!nextSent[userId]?.length) delete nextSent[userId];
      if (!nextReceived[otherId]?.length) delete nextReceived[otherId];
      if (!nextReceived[userId]?.length) delete nextReceived[userId];
      if (!nextSent[otherId]?.length) delete nextSent[otherId];

      accepted = true;
      return { ...prev, friends: nextFriends, friendRequestsSent: nextSent, friendRequestsReceived: nextReceived };
    });
    return accepted;
  }, []);

  const toggleFriend = useCallback((userId, otherId) => {
    if (!userId || !otherId || userId === otherId) return false;
    let nextValue = false;
    setSocial((prev) => {
      const nextFriends = { ...(prev.friends || {}) };
      const nextSent = { ...(prev.friendRequestsSent || {}) };
      const nextReceived = { ...(prev.friendRequestsReceived || {}) };
      const mine = new Set(nextFriends[userId] || []);
      const theirs = new Set(nextFriends[otherId] || []);

      if (mine.has(otherId)) {
        mine.delete(otherId);
        theirs.delete(userId);
        nextFriends[userId] = Array.from(mine);
        nextFriends[otherId] = Array.from(theirs);
        nextValue = false;
      } else {
        const sent = new Set(nextSent[userId] || []);
        const received = new Set(nextReceived[userId] || []);
        if (sent.has(otherId)) {
          sent.delete(otherId);
          nextSent[userId] = Array.from(sent);
          nextReceived[otherId] = (nextReceived[otherId] || []).filter((id) => id !== userId);
          if (!nextSent[userId].length) delete nextSent[userId];
          if (!nextReceived[otherId].length) delete nextReceived[otherId];
          nextValue = false;
        } else {
          sent.add(otherId);
          nextSent[userId] = Array.from(sent);
          const receivedList = new Set(nextReceived[otherId] || []);
          receivedList.add(userId);
          nextReceived[otherId] = Array.from(receivedList);
          nextValue = true;
        }
      }

      if (!nextFriends[userId]?.length) delete nextFriends[userId];
      if (!nextFriends[otherId]?.length) delete nextFriends[otherId];

      return { ...prev, friends: nextFriends, friendRequestsSent: nextSent, friendRequestsReceived: nextReceived };
    });
    return nextValue;
  }, []);

  const toggleFollow = useCallback((userId, otherId) => {
    if (!userId || !otherId || userId === otherId) return false;
    let nextValue = false;
    setSocial((prev) => {
      const nextFollowing = { ...(prev.followings || {}) };
      const mine = new Set(nextFollowing[userId] || []);
      if (mine.has(otherId)) {
        mine.delete(otherId);
        nextValue = false;
      } else {
        mine.add(otherId);
        nextValue = true;
      }
      nextFollowing[userId] = Array.from(mine);
      return { ...prev, followings: nextFollowing };
    });
    return nextValue;
  }, []);

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
  const addPost = useCallback(async (post) => {
    const saved = await apiCall('/posts', 'POST', {
      userId: post.authorId,
      content: post.content,
      imageUrl: post.image || null,
      // books trong seed dùng id dạng b1/b2, không tương thích BIGINT của DB nên chỉ gửi id số.
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

  useEffect(() => {
    syncUsers();
  }, [syncUsers]);

  useEffect(() => {
    const onAuthChange = () => {
      const authUser = load('authUser', null);

      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      if (authUser?.id) {
        syncConversationsForUser(authUser.id);
        connectChatSocket(authUser.id);
        pollTimerRef.current = window.setInterval(() => {
          syncConversationsForUser(authUser.id);
        }, 3000);
        return;
      }

      disconnectChatSocket();
    };

    onAuthChange();
    window.addEventListener('bookigma-auth-user-updated', onAuthChange);
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      disconnectChatSocket();
      window.removeEventListener('bookigma-auth-user-updated', onAuthChange);
    };
  }, [connectChatSocket, disconnectChatSocket, syncConversationsForUser]);

  useEffect(() => {
    const authUser = load('authUser', null);
    if (!authUser?.id || !chatClientRef.current || !chatClientRef.current.connected) return;
    ensureSocketSubscriptions(authUser.id);
  }, [conversations, ensureSocketSubscriptions]);

  const value = useMemo(
    () => ({
      users, books, posts, exchanges, orders, reports, conversations, notifications,
      shops: seed.shops, categories: seed.CATEGORIES, vouchers: seed.vouchers,
      userById, bookById, shopById, upsertUser, syncUsers,
      getFriends, getFollowing, getFriendRequestsSent, getFriendRequestsReceived, getFollowers,
      isFriend, isFollowing, hasSentFriendRequest, hasReceivedFriendRequest, toggleFriend, acceptFriendRequest, toggleFollow,
      getCart, addToCart, setCartQty, removeFromCart, clearCart, carts,
      placeOrder, updateOrderStatus,
      addPost, toggleLike, addComment, setPostHidden, deletePost,
      addReport, resolveReport,
      setUserStatus, registerUser,
      upsertBook, setBookStatus, deleteBook,
      addExchange,
      findOrCreateConversation, createGroupConversation, sendMessage, markConversationRead, unreadCount,
      getProgress, saveProgress,
      pushNotification, markNotificationsRead,
      daily, getDaily, earnPoints, trackDaily, claimTask, touchStreak,
      feedPet, growPet, renamePet, redeemReward, redemptions,
      addBlindBox, revealBlindBox,
    }),
    [
      users, books, posts, exchanges, orders, reports, conversations, notifications, carts, social,
      userById, bookById, shopById, upsertUser, syncUsers,
      getFriends, getFollowing, getFriendRequestsSent, getFriendRequestsReceived, getFollowers,
      isFriend, isFollowing, hasSentFriendRequest, hasReceivedFriendRequest, toggleFriend, acceptFriendRequest, toggleFollow,
      getCart, addToCart, setCartQty, removeFromCart, clearCart,
      placeOrder, updateOrderStatus, addPost, toggleLike, addComment, setPostHidden, deletePost,
      addReport, resolveReport, setUserStatus, registerUser, upsertBook, setBookStatus, deleteBook,
      addExchange, findOrCreateConversation, createGroupConversation, sendMessage, markConversationRead, unreadCount,
      getProgress, saveProgress, pushNotification, markNotificationsRead,
      daily, getDaily, earnPoints, trackDaily, claimTask, touchStreak,
      feedPet, growPet, renamePet, redeemReward, redemptions,
      addBlindBox, revealBlindBox,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
