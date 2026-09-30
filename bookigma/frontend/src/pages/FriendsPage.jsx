import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, UserCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';

export default function FriendsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const {
    users,
    isFriend,
    isFollowing,
    hasSentFriendRequest,
    hasReceivedFriendRequest,
    getFollowers,
    getFollowing,
    toggleFriend,
    acceptFriendRequest,
    toggleFollow,
    findOrCreateConversation,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const isDemoSeedUser = (person) =>
    ['u1', 'u2', 'u3', 'u4', 'u5'].includes(String(person.id)) &&
    typeof person.email === 'string' && person.email.endsWith('@bookigma.vn');

  const people = useMemo(
    () => users.filter((u) => String(u.id) !== String(user.id) && u.role === 'user' && !isDemoSeedUser(u)),
    [user.id, users]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const haystack = [
        person.name,
        person.fullName,
        person.username,
        person.email,
        person.bio || '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      if (!matchesSearch) return false;

      const friendStatus = isFriend(user.id, person.id);
      const sentRequest = hasSentFriendRequest(user.id, person.id);
      const receivedRequest = hasReceivedFriendRequest(user.id, person.id);
      const followStatus = isFollowing(user.id, person.id);

      if (filter === 'friends') return friendStatus;
      if (filter === 'following') return followStatus && !friendStatus;
      if (filter === 'waiting') return receivedRequest || sentRequest;
      if (filter === 'new') return !friendStatus && !followStatus && !sentRequest && !receivedRequest;
      return true;
    });
  }, [people, user.id, normalizedSearch, filter, isFriend, isFollowing, hasSentFriendRequest, hasReceivedFriendRequest]);

  const friends = people.filter((person) => isFriend(user.id, person.id));
  const pendingSent = people.filter((person) => hasSentFriendRequest(user.id, person.id));
  const pendingReceived = people.filter((person) => hasReceivedFriendRequest(user.id, person.id));
  const following = people.filter((person) => isFollowing(user.id, person.id));
  const followers = getFollowers(user.id).map((id) => users.find((u) => u.id === id)).filter(Boolean);

  const messageUser = async (otherId) => {
    const convId = await findOrCreateConversation(user.id, otherId);
    navigate(`/chat/${convId}`);
    toast('Đã mở cuộc trò chuyện.', 'info');
  };

  return (
    <div className="main-layout" style={{ maxWidth: 1400 }}>
      <div className="page-head row-between" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1>Bạn bè & Theo dõi</h1>
          <p>Quản lý kết bạn, theo dõi và nhắn tin ngay cả khi chưa là bạn bè.</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 2fr)', gap: 20, alignItems: 'start' }}>
        <aside className="stack" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="row-between" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Bạn bè & Theo dõi</h3>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <div className="card" style={{ padding: 12, background: 'var(--bg-soft)' }}>
                <div className="tiny muted">Bạn bè</div>
                <div className="strong" style={{ fontSize: 22 }}>{friends.length}</div>
              </div>
              <div className="card" style={{ padding: 12, background: 'var(--bg-soft)' }}>
                <div className="tiny muted">Đang theo dõi</div>
                <div className="strong" style={{ fontSize: 22 }}>{following.length}</div>
              </div>
              <div className="card" style={{ padding: 12, background: 'var(--bg-soft)' }}>
                <div className="tiny muted">Người theo dõi</div>
                <div className="strong" style={{ fontSize: 22 }}>{followers.length}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Bạn bè</h3>
              <span className="badge badge-green">{friends.length}</span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {friends.length === 0 ? (
                <div className="small muted">Bạn chưa kết bạn với ai.</div>
              ) : (
                friends.map((person) => (
                  <div key={person.id} className="row" style={{ justifyContent: 'space-between', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="row" style={{ gap: 10 }}>
                      <img src={person.avatar} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                      <div>
                        <div className="strong small">{person.name}</div>
                        <div className="tiny muted">@{person.username || person.email}</div>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-ghost" onClick={() => messageUser(person.id)}>
                      <MessageSquare size={14} /> Nhắn tin
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Yêu cầu kết bạn</h3>
              <span className="badge badge-amber">{pendingReceived.length}</span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {pendingReceived.length === 0 ? (
                <div className="small muted">Không có yêu cầu mới.</div>
              ) : (
                pendingReceived.map((person) => (
                  <div key={person.id} className="row" style={{ justifyContent: 'space-between', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="row" style={{ gap: 10 }}>
                      <img src={person.avatar} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                      <div>
                        <div className="strong small">{person.name}</div>
                        <div className="tiny muted">@{person.username || person.email}</div>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        const accepted = acceptFriendRequest(user.id, person.id);
                        toast(accepted ? 'Đã xác nhận kết bạn.' : 'Không thể xác nhận kết bạn.', accepted ? 'success' : 'info');
                      }}
                    >
                      Xác nhận
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="card" style={{ padding: 20 }}>
          <div className="row-between" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0 }}>Tìm kiếm & đề xuất</h3>
              <div className="small muted">Khám phá mọi người để kết bạn, theo dõi hoặc nhắn tin.</div>
            </div>
            <div style={{ flex: 1, minWidth: 220, maxWidth: 420, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-sub)' }} />
              <input
                className="input"
                style={{ paddingLeft: 36, height: 40 }}
                placeholder="Tìm kiếm theo tên, username, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="row" style={{ gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {['all', 'friends', 'following', 'waiting', 'new'].map((option) => (
              <button
                key={option}
                className={`btn btn-sm ${filter === option ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(option)}
              >
                {option === 'all' && 'Tất cả'}
                {option === 'friends' && 'Bạn bè'}
                {option === 'following' && 'Đang theo dõi'}
                {option === 'waiting' && 'Chờ xác nhận'}
                {option === 'new' && 'Gợi ý mới'}
              </button>
            ))}
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {filteredPeople.length === 0 && (
              <div className="small muted" style={{ gridColumn: '1 / -1', padding: '12px 6px' }}>
                Không tìm thấy người dùng phù hợp với từ khóa "{searchQuery || 'hiện tại'}".
              </div>
            )}

            {filteredPeople.map((person) => {
              const friendStatus = isFriend(user.id, person.id);
              const sentRequest = hasSentFriendRequest(user.id, person.id);
              const receivedRequest = hasReceivedFriendRequest(user.id, person.id);
              const followStatus = isFollowing(user.id, person.id);

              return (
                <div key={person.id} className="card" style={{ padding: 16 }}>
                  <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                    <img src={person.avatar} alt="" className="avatar" style={{ width: 52, height: 52 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="strong small" style={{ marginBottom: 4 }}>{person.name}</div>
                      <div className="tiny muted" style={{ marginBottom: 8 }}>@{person.username || person.email}</div>
                    </div>
                  </div>

                  <div className="tiny muted" style={{ marginBottom: 12, minHeight: 32 }}>
                    {person.bio || 'Chưa cập nhật giới thiệu.'}
                  </div>

                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {receivedRequest ? (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          const accepted = acceptFriendRequest(user.id, person.id);
                          toast(accepted ? 'Đã xác nhận kết bạn.' : 'Không thể xác nhận kết bạn.', accepted ? 'success' : 'info');
                        }}
                      >
                        <UserCheck size={14} /> Xác nhận
                      </button>
                    ) : (
                      <button
                        className={`btn btn-sm ${friendStatus ? 'btn-ghost' : 'btn-primary'}`}
                        onClick={() => {
                          const added = toggleFriend(user.id, person.id);
                          toast(added ? 'Đã gửi lời mời kết bạn.' : 'Đã hủy lời mời kết bạn.', added ? 'success' : 'info');
                        }}
                      >
                        {friendStatus ? <UserMinus size={14} /> : <UserPlus size={14} />}
                        {friendStatus ? 'Huỷ kết bạn' : sentRequest ? 'Hủy lời mời' : 'Kết bạn'}
                      </button>
                    )}

                    <button
                      className={`btn btn-sm ${followStatus ? 'btn-ghost' : 'btn-soft'}`}
                      onClick={() => {
                        const active = toggleFollow(user.id, person.id);
                        toast(active ? 'Đã theo dõi người này.' : 'Đã hủy theo dõi.', active ? 'success' : 'info');
                      }}
                    >
                      <UserCheck size={14} />
                      {followStatus ? 'Huỷ theo dõi' : 'Theo dõi'}
                    </button>

                    <button className="btn btn-sm btn-ghost" onClick={() => messageUser(person.id)}>
                      <MessageSquare size={14} /> Nhắn tin
                    </button>
                  </div>

                  <div className="row tiny muted" style={{ gap: 10, marginTop: 12 }}>
                    <span><Users size={13} /> {getFollowing(person.id).length} đang theo dõi</span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
