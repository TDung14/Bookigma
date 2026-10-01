import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, UserCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?img=12';

export default function FriendsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const app = useApp() || {};
  const userId = user?.id ?? null;

  const users = app.users || [];
  const isFriend = app.isFriend || (() => false);
  const isFollowing = app.isFollowing || (() => false);
  const hasSentFriendRequest = app.hasSentFriendRequest || (() => false);
  const hasReceivedFriendRequest = app.hasReceivedFriendRequest || (() => false);
  const getFollowers = app.getFollowers || (() => []);
  const getFollowing = app.getFollowing || (() => []);
  const toggleFriend = app.toggleFriend || (async () => false);
  const acceptFriendRequest = app.acceptFriendRequest || (async () => false);
  const rejectFriendRequest = app.rejectFriendRequest || (async () => false);
  const toggleFollow = app.toggleFollow || (() => false);
  const findOrCreateConversation = app.findOrCreateConversation;

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const people = useMemo(() => {
    if (!userId) return [];
    return users.filter((u) => u && String(u.id) !== String(userId) && String(u.role || 'user').toLowerCase() === 'user');
  }, [users, userId]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const personDisplayName = (person) => person?.fullName || person?.name || person?.username || 'Người dùng';
  const personUsername = (person) => person?.username || person?.email || '';
  const personAvatar = (person) => person?.avatarUrl || person?.avatar || DEFAULT_AVATAR;

  const friends = useMemo(() => people.filter((p) => isFriend(userId, p.id)), [people, userId, isFriend]);
  const pendingReceived = useMemo(() => people.filter((p) => hasReceivedFriendRequest(userId, p.id)), [people, userId, hasReceivedFriendRequest]);
  const following = useMemo(() => people.filter((p) => isFollowing(userId, p.id)), [people, userId, isFollowing]);
  const followers = useMemo(() => {
    const ids = getFollowers(userId) || [];
    return ids.map((id) => users.find((u) => String(u.id) === String(id))).filter(Boolean);
  }, [userId, getFollowers, users]);

  const filteredPeople = useMemo(() => people.filter((person) => {
    const haystack = [personDisplayName(person), personUsername(person), person.bio || ''].join(' ').toLowerCase();
    if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;
    const friend = isFriend(userId, person.id);
    const sent = hasSentFriendRequest(userId, person.id);
    const received = hasReceivedFriendRequest(userId, person.id);
    const follow = isFollowing(userId, person.id);
    if (filter === 'friends') return friend;
    if (filter === 'following') return follow && !friend;
    if (filter === 'waiting') return sent || received;
    if (filter === 'new') return !friend && !follow && !sent && !received;
    return true;
  }), [people, normalizedSearch, filter, userId, isFriend, isFollowing, hasSentFriendRequest, hasReceivedFriendRequest]);

  const messageUser = async (otherId) => {
    if (!findOrCreateConversation || !userId) return;
    try {
      const convId = await findOrCreateConversation(userId, otherId);
      if (convId) navigate(`/chat/${convId}`);
    } catch (e) {
      toast(e?.message || 'Không thể mở cuộc trò chuyện.', 'info');
    }
  };

  const handleFriendAction = async (person) => {
    const name = personUsername(person) || personDisplayName(person);
    const friend = isFriend(userId, person.id);
    const sent = hasSentFriendRequest(userId, person.id);

    if (friend) {
      const confirmed = window.confirm(`Bạn có chắc chắn muốn hủy kết bạn với "${name}" không?`);
      if (!confirmed) return;
    } else if (sent) {
      const confirmed = window.confirm(`Bạn có chắc chắn muốn hủy lời mời kết bạn với "${name}" không?`);
      if (!confirmed) return;
    }

    const ok = await toggleFriend(userId, person.id);
    toast(
      ok ? (friend ? 'Đã hủy kết bạn.' : sent ? 'Đã hủy lời mời kết bạn.' : 'Đã gửi lời mời kết bạn.') : 'Không thể thực hiện thao tác.',
      ok ? 'success' : 'info'
    );
  };

  const handleAccept = async (person) => {
    const ok = await acceptFriendRequest(userId, person.id);
    toast(ok ? 'Đã xác nhận kết bạn.' : 'Không thể xác nhận kết bạn.', ok ? 'success' : 'info');
  };

  const handleReject = async (person) => {
    const ok = await rejectFriendRequest(userId, person.id);
    toast(ok ? 'Đã từ chối lời mời kết bạn.' : 'Không thể từ chối lời mời.', ok ? 'success' : 'info');
  };

  if (!user) return <div className="main-layout" style={{ padding: 20 }}><div className="card">Đang tải thông tin người dùng...</div></div>;

  const PersonRow = ({ person, action }) => (
    <div className="row" style={{ justifyContent: 'space-between', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border-color)' }}>
      <div className="row" style={{ gap: 10, minWidth: 0 }}>
        <img src={personAvatar(person)} alt={personDisplayName(person)} className="avatar" style={{ width: 40, height: 40, objectFit: 'cover' }} />
        <div style={{ minWidth: 0 }}>
          <div className="strong small">{personDisplayName(person)}</div>
          <div className="tiny muted">@{personUsername(person)}</div>
        </div>
      </div>
      {action}
    </div>
  );

  return (
    <div className="main-layout" style={{ maxWidth: 1400 }}>
      <div className="page-head">
        <h1>Bạn bè & Theo dõi</h1>
        <p className="muted small">Danh sách được lấy từ tài khoản thật trong database.</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 2fr)', gap: 20, alignItems: 'start' }}>
        <aside className="stack" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3>Thống kê</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div className="card" style={{ padding: 12 }}><div className="tiny muted">Bạn bè</div><div className="strong" style={{ fontSize: 22 }}>{friends.length}</div></div>
              <div className="card" style={{ padding: 12 }}><div className="tiny muted">Đang theo dõi</div><div className="strong" style={{ fontSize: 22 }}>{following.length}</div></div>
              <div className="card" style={{ padding: 12 }}><div className="tiny muted">Người theo dõi</div><div className="strong" style={{ fontSize: 22 }}>{followers.length}</div></div>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="row-between"><h3>Bạn bè</h3><span className="badge badge-green">{friends.length}</span></div>
            <div className="stack" style={{ gap: 4 }}>
              {friends.length === 0 ? <div className="small muted">Bạn chưa kết bạn với ai.</div> : friends.map((person) => (
                <PersonRow key={person.id} person={person} action={
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => messageUser(person.id)}><MessageSquare size={14} /> Nhắn tin</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleFriendAction(person)}><UserMinus size={14} /> Hủy bạn</button>
                  </div>
                } />
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="row-between"><h3>Yêu cầu kết bạn</h3><span className="badge badge-amber">{pendingReceived.length}</span></div>
            <div className="stack" style={{ gap: 4 }}>
              {pendingReceived.length === 0 ? <div className="small muted">Không có yêu cầu mới.</div> : pendingReceived.map((person) => (
                <PersonRow key={person.id} person={person} action={
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn-sm btn-primary" onClick={() => handleAccept(person)}><UserCheck size={14} /> Xác nhận</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleReject(person)}>Từ chối</button>
                  </div>
                } />
              ))}
            </div>
          </div>
        </aside>

        <main className="card" style={{ padding: 20 }}>
          <div className="row-between" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <div><h3>Tìm kiếm người dùng</h3><div className="small muted">Tên, username và ảnh được lấy từ database.</div></div>
            <div style={{ flex: 1, minWidth: 220, maxWidth: 420, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 11 }} />
              <input className="input" style={{ paddingLeft: 36, height: 40 }} placeholder="Tìm kiếm theo tên, username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="row" style={{ gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {['all', 'friends', 'waiting', 'new'].map((option) => (
              <button key={option} className={`btn btn-sm ${filter === option ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(option)}>
                {option === 'all' ? 'Tất cả' : option === 'friends' ? 'Bạn bè' : option === 'waiting' ? 'Chờ xác nhận' : 'Gợi ý mới'}
              </button>
            ))}
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {filteredPeople.map((person) => {
              const friend = isFriend(userId, person.id);
              const sent = hasSentFriendRequest(userId, person.id);
              const received = hasReceivedFriendRequest(userId, person.id);
              const follow = isFollowing(userId, person.id);
              return (
                <div key={person.id} className="card" style={{ padding: 16 }}>
                  <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                    <img src={personAvatar(person)} alt={personDisplayName(person)} className="avatar" style={{ width: 52, height: 52, objectFit: 'cover' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="strong small">{personDisplayName(person)}</div>
                      <div className="tiny muted">@{personUsername(person)}</div>
                    </div>
                  </div>
                  <div className="tiny muted" style={{ margin: '12px 0', minHeight: 32 }}>{person.bio || 'Chưa cập nhật giới thiệu.'}</div>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {received ? <button className="btn btn-sm btn-primary" onClick={() => handleAccept(person)}><UserCheck size={14} /> Xác nhận</button> :
                      <button className={`btn btn-sm ${friend ? 'btn-ghost' : 'btn-primary'}`} onClick={() => handleFriendAction(person)}>
                        {friend ? <UserMinus size={14} /> : <UserPlus size={14} />}
                        {friend ? 'Hủy kết bạn' : sent ? 'Hủy lời mời' : 'Kết bạn'}
                      </button>}
                    <button className={`btn btn-sm ${follow ? 'btn-ghost' : 'btn-soft'}`} onClick={() => toggleFollow(userId, person.id)}>
                      <UserCheck size={14} /> {follow ? 'Hủy theo dõi' : 'Theo dõi'}
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => messageUser(person.id)}><MessageSquare size={14} /> Nhắn tin</button>
                  </div>
                  <div className="row tiny muted" style={{ gap: 10, marginTop: 12 }}><span><Users size={13} /> {(getFollowing(person.id) || []).length} đang theo dõi</span></div>
                </div>
              );
            })}
            {filteredPeople.length === 0 && <div className="small muted" style={{ gridColumn: '1 / -1' }}>Không tìm thấy người dùng phù hợp.</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
