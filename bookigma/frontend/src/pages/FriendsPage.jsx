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
    getFollowers,
    getFollowing,
    toggleFriend,
    toggleFollow,
    findOrCreateConversation,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const isDemoSeedUser = (person) =>
    ['u1', 'u2', 'u3', 'u4', 'u5'].includes(String(person.id)) &&
    typeof person.email === 'string' && person.email.endsWith('@bookigma.vn');

  const people = useMemo(
    () => users.filter((u) => String(u.id) !== String(user.id) && u.role === 'user' && !isDemoSeedUser(u)),
    [user.id, users]
  );

  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return people;
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
      return haystack.includes(q);
    });
  }, [people, searchQuery]);

  const friends = people.filter((person) => isFriend(user.id, person.id));
  const following = people.filter((person) => isFollowing(user.id, person.id));
  const followers = getFollowers(user.id).map((id) => users.find((u) => u.id === id)).filter(Boolean);

  const messageUser = (otherId) => {
    const convId = findOrCreateConversation(user.id, otherId);
    navigate(`/chat/${convId}`);
    toast('Đã mở cuộc trò chuyện.', 'info');
  };

  return (
    <div className="main-layout" style={{ maxWidth: 1100 }}>
      <div className="page-head row-between" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1>Bạn bè & Theo dõi</h1>
          <p>Quản lý kết bạn, theo dõi và nhắn tin ngay cả khi chưa là bạn bè.</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-green">{friends.length} bạn bè</span>
          <span className="badge badge-blue">{following.length} đang theo dõi</span>
          <span className="badge badge-purple">{followers.length} người theo dõi</span>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.5px' }}>Bạn bè</div>
          <div className="strong" style={{ fontSize: 28, marginTop: 8 }}>{friends.length}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.5px' }}>Đang theo dõi</div>
          <div className="strong" style={{ fontSize: 28, marginTop: 8 }}>{following.length}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.5px' }}>Người theo dõi</div>
          <div className="strong" style={{ fontSize: 28, marginTop: 8 }}>{followers.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="row-between" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Mọi người</h3>
          <div style={{ flex: 1, minWidth: 220, maxWidth: 420, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-sub)' }} />
            <input
              className="input"
              style={{ paddingLeft: 36, height: 40 }}
              placeholder="Tìm kiếm bạn bè..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="small muted">Bạn có thể nhắn tin dù chưa kết bạn.</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {filteredPeople.length === 0 && (
            <div className="small muted" style={{ gridColumn: '1 / -1', padding: '12px 6px' }}>
              Không tìm thấy người dùng phù hợp với từ khóa "{searchQuery}".
            </div>
          )}

          {filteredPeople.map((person) => {
            const friendStatus = isFriend(user.id, person.id);
            const followStatus = isFollowing(user.id, person.id);

            return (
              <div key={person.id} className="card" style={{ padding: 16 }}>
                <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <img src={person.avatar} alt="" className="avatar" style={{ width: 52, height: 52 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="strong small" style={{ marginBottom: 4 }}>{person.name}</div>
                    <div className="tiny muted" style={{ marginBottom: 8 }}>{person.bio || 'Chưa cập nhật giới thiệu.'}</div>
                  </div>
                </div>

                <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    className={`btn btn-sm ${friendStatus ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={() => {
                      const added = toggleFriend(user.id, person.id);
                      toast(added ? 'Đã gửi lời mời kết bạn.' : 'Đã hủy kết bạn.', added ? 'success' : 'info');
                    }}
                  >
                    {friendStatus ? <UserMinus size={15} /> : <UserPlus size={15} />}
                    {friendStatus ? 'Huỷ kết bạn' : 'Kết bạn'}
                  </button>

                  <button
                    className={`btn btn-sm ${followStatus ? 'btn-ghost' : 'btn-soft'}`}
                    onClick={() => {
                      const active = toggleFollow(user.id, person.id);
                      toast(active ? 'Đã theo dõi người này.' : 'Đã hủy theo dõi.', active ? 'success' : 'info');
                    }}
                  >
                    <UserCheck size={15} />
                    {followStatus ? 'Huỷ theo dõi' : 'Theo dõi'}
                  </button>

                  <button className="btn btn-sm btn-ghost" onClick={() => messageUser(person.id)}>
                    <MessageSquare size={15} /> Nhắn tin
                  </button>
                </div>

                <div className="row tiny muted" style={{ gap: 10, marginTop: 12 }}>
                  <span><Users size={13} /> {getFollowing(person.id).length} đang theo dõi</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
