import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AtSign, BookOpen, Calendar, ChevronRight, Clock, Flame, Image as ImageIcon,
  KeyRound, Mail, MessageSquare, Package, Pencil, Play, Save, Send, ShieldCheck,
  ShoppingBag, ThumbsUp, UserRound, Users, X,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { currency, dateOnly, duration, timeAgo } from '../lib/format';
import { EmptyState, ProgressBar, SectionTitle } from '../components/common/ui';
import { apiCall, uploadAvatar } from '../services/api';
import { getFriendsOf } from '../services/friendApi';
import { avatarSrc, mediaSrc } from '../lib/avatar';

const VIDEO_MEDIA_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(?:[?#].*)?$/i;
const ROLE_LABELS = {
  user: 'Thành viên',
  shop: 'Đối tác',
  moderator: 'Kiểm duyệt viên',
  admin: 'Quản trị viên',
};

const isVideoMedia = (url) => /^data:video\//i.test(url || '') || VIDEO_MEDIA_RE.test(url || '');

function ProfileInfoRow({ icon: Icon, label, value }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-icon"><Icon size={15} /></span>
      <div style={{ minWidth: 0 }}>
        <div className="tiny muted">{label}</div>
        <div className="small strong" style={{ overflowWrap: 'anywhere' }}>{value}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, updateProfile, loading } = useAuth();
  const {
    users, orders, posts, getProgress, getFriends, books,
    findOrCreateConversation, openFloatingChat, toggleLike, addComment,
  } = useApp();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '', bio: '', avatarUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [friendSnapshot, setFriendSnapshot] = useState({ profileId: null, list: [] });
  const [openComments, setOpenComments] = useState({});
  const [commentDraft, setCommentDraft] = useState({});
  const [mediaViewer, setMediaViewer] = useState(null);

  const isOwnProfile = !userId || String(userId) === String(authUser?.id ?? '');
  const profileUser = useMemo(() => {
    if (isOwnProfile) return authUser;
    return users.find((u) => String(u.id) === String(userId)) || null;
  }, [isOwnProfile, authUser, userId, users]);

  useEffect(() => {
    const currentUserId = profileUser?.id;
    if (!currentUserId || editing) return;
    const fallback = {
      email: profileUser.email || '',
      fullName: profileUser.name || '',
      bio: profileUser.bio || '',
      avatarUrl: profileUser.avatar || '',
    };
    apiCall(`/users/${currentUserId}/profile`)
      .then((profile) => setForm({
        email: profile.email || '',
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
      }))
      .catch(() => setForm(fallback));
  }, [profileUser, editing]);

  useEffect(() => {
    if (!profileUser?.id) return undefined;
    const requestedId = String(profileUser.id);
    let cancelled = false;
    getFriendsOf(profileUser.id, authUser?.id)
      .then((list) => {
        if (!cancelled) setFriendSnapshot({ profileId: requestedId, list: Array.isArray(list) ? list : [] });
      })
      .catch(() => {
        if (!cancelled) setFriendSnapshot({ profileId: requestedId, list: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [profileUser?.id, authUser?.id]);

  if (!profileUser) {
    return (
      <div className="main-layout" style={{ maxWidth: 720 }}>
        <div className="card empty">
          <h3>Không tìm thấy hồ sơ người dùng</h3>
          <p className="small muted">Trang cá nhân này không tồn tại hoặc đã bị xóa.</p>
        </div>
      </div>
    );
  }

  const myOrders = orders.filter((o) => String(o.userId) === String(profileUser.id));
  const myPosts = posts.filter((p) => String(p.authorId) === String(profileUser.id) && !p.hidden);
  const mediaPosts = myPosts.filter((p) => p.image);
  const progress = getProgress(profileUser.id);

  const entries = Object.values(progress || {})
    .map((p) => ({ ...p, book: books.find((b) => String(b.id) === String(p.bookId)) }))
    .filter((p) => p.book)
    .sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0));

  const spent = myOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total || 0), 0);
  const readSeconds = entries.reduce((s, e) => s + (e.secondsRead || 0), 0);
  const finishedBooks = entries.filter((e) => e.finished || (e.percent || 0) >= 100).length;
  const joinedAtMs = profileUser.joinedAt ? new Date(profileUser.joinedAt).getTime() : null;
  const joinedDate = Number.isFinite(joinedAtMs) ? dateOnly(joinedAtMs) : 'Chưa cập nhật';
  const roleLabel = ROLE_LABELS[String(profileUser.role || 'user').toLowerCase()] || 'Thành viên';

  const profileFriends = friendSnapshot.profileId === String(profileUser.id) ? friendSnapshot.list : [];
  const friendsPending = friendSnapshot.profileId !== String(profileUser.id);
  const ownFriendIds = getFriends(authUser?.id).map(String);
  const mutualFriends = profileFriends.filter((f) => ownFriendIds.includes(String(f.id)));
  const friendsToShow = isOwnProfile ? profileFriends : mutualFriends;

  const stats = [
    { icon: BookOpen, label: 'Sách trong tủ', value: entries.length, sub: `${finishedBooks} đã đọc xong`, color: 'var(--accent-green)', bg: 'var(--accent-soft)' },
    { icon: Clock, label: 'Thời gian đọc', value: duration(readSeconds), color: 'var(--purple)', bg: 'var(--purple-soft)' },
    { icon: ShoppingBag, label: 'Đã chi tiêu', value: currency(spent), color: 'var(--info)', bg: 'var(--info-soft)' },
    { icon: Flame, label: 'Bài viết', value: myPosts.length, sub: `${myPosts.reduce((s, p) => s + (p.likeCount ?? p.likedBy?.length ?? 0), 0)} lượt thích`, color: 'var(--warning)', bg: 'var(--warning-soft)' },
  ];

  const submitPassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      toast('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast('Mật khẩu xác nhận không khớp.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await apiCall(`/users/${authUser.id}/password`, 'PUT', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }, { userId: authUser.id });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast('Đổi mật khẩu thành công.', 'success');
    } catch (error) {
      toast(error.message || 'Không thể đổi mật khẩu.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    let avatarUrl = form.avatarUrl;
    if (avatarFile) {
      setUploadingAvatar(true);
      try {
        const uploaded = await uploadAvatar(avatarFile, authUser.id);
        avatarUrl = uploaded.avatarUrl;
      } catch (error) {
        setUploadingAvatar(false);
        return toast(error.message || 'Không thể tải ảnh đại diện lên.', 'error');
      }
      setUploadingAvatar(false);
    }
    const result = await updateProfile({ ...form, avatarUrl });
    if (!result.ok) return toast(result.error, 'error');
    setAvatarFile(null);
    setAvatarPreview('');
    setEditing(false);
    toast('Đã cập nhật thông tin cá nhân.');
  };

  const handleAvatarFile = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      event.target.value = '';
      toast('Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      toast('Ảnh đại diện không được vượt quá 5 MB.', 'error');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const submitComment = async (postId) => {
    const text = (commentDraft[postId] || '').trim();
    if (!text) return;
    try {
      await addComment(postId, { text });
      setCommentDraft((d) => ({ ...d, [postId]: '' }));
    } catch (error) {
      toast(error.message || 'Không thể gửi bình luận.', 'error');
    }
  };

  const handleLike = async (postId) => {
    try {
      await toggleLike(postId);
    } catch (error) {
      toast(error.message || 'Không thể cập nhật lượt thích.', 'error');
    }
  };

  return (
    <div className="main-layout profile-page" style={{ maxWidth: 1180 }}>
      <div className="card profile-hero">
        <div className="profile-cover">
          <div className="profile-cover-brand"><BookOpen size={17} /> Bookigma</div>
          <span className="profile-cover-quote hide-sm">“Mỗi cuốn sách là một chuyến đi.”</span>
        </div>
        <div className="profile-hero-body">
          <div className="profile-hero-main">
            <img
              src={avatarPreview || avatarSrc(profileUser.avatar)}
              alt="Ảnh đại diện"
              className="avatar profile-avatar"
            />
            <div className="profile-identity">
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 25 }}>{profileUser.name}</h1>
                <span className="badge badge-green">{profileUser.badge || 'Thành viên'}</span>
              </div>
              <p className="small muted" style={{ margin: '3px 0 8px' }}>
                {[profileUser.username ? `@${profileUser.username}` : null, profileUser.email].filter(Boolean).join(' · ') || 'Thành viên Bookigma'}
              </p>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <span className="badge row" style={{ gap: 5 }}><Flame size={13} /> {(profileUser.points || 0).toLocaleString('vi-VN')} điểm</span>
                <span className="badge row" style={{ gap: 5 }}><Calendar size={13} /> Tham gia {joinedDate}</span>
              </div>
            </div>
            <div className="profile-actions">
              {isOwnProfile ? (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>
                    {editing ? <X size={15} /> : <Pencil size={15} />} {editing ? 'Đóng' : 'Chỉnh sửa'}
                  </button>
                  <Link to="/orders" className="btn btn-ghost btn-sm"><Package size={15} /> Đơn hàng</Link>
                  <Link to="/library" className="btn btn-primary btn-sm"><BookOpen size={15} /> Tủ sách</Link>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    if (!authUser) return navigate('/login');
                    if (!profileUser?.id) return;
                    const convId = await findOrCreateConversation(authUser.id, profileUser.id);
                    openFloatingChat(convId);
                  }}
                >
                  <MessageSquare size={15} /> Nhắn tin
                </button>
              )}
            </div>
          </div>
          {profileUser.bio && <p className="profile-hero-bio">{profileUser.bio}</p>}
        </div>
      </div>

      {editing && (
        <div className="stack" style={{ marginTop: 18 }}>
          <form onSubmit={submitProfile} className="card">
            <h3 style={{ marginTop: 0 }}>Chỉnh sửa thông tin cá nhân</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              <div className="field">
                <label className="label">Họ và tên</label>
                <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="field">
                <label className="label">Ảnh đại diện</label>
                <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarFile} />
                <p className="tiny muted" style={{ margin: '5px 0 0' }}>Chọn ảnh từ máy tính (JPG, PNG, WEBP hoặc GIF; tối đa 5 MB). Không nhập link ảnh.</p>
                {avatarFile && <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => { setAvatarFile(null); setAvatarPreview(''); }}>Hủy chọn ảnh</button>}
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="label">Giới thiệu</label>
              <textarea className="textarea" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading || uploadingAvatar} style={{ marginTop: 12 }}>
              <Save size={15} /> {loading || uploadingAvatar ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>

          <form onSubmit={submitPassword} className="card">
            <h3 style={{ marginTop: 0 }}><KeyRound size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} />Đổi mật khẩu</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="field"><label className="label">Mật khẩu hiện tại</label><input className="input" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required /></div>
              <div className="field"><label className="label">Mật khẩu mới</label><input className="input" type="password" minLength={6} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required /></div>
              <div className="field"><label className="label">Xác nhận mật khẩu mới</label><input className="input" type="password" minLength={6} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required /></div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={changingPassword} style={{ marginTop: 12 }}><KeyRound size={15} /> {changingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
          </form>
        </div>
      )}

      <div className="profile-stats card">
        {stats.map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="profile-stat">
            <span className="profile-stat-icon" style={{ background: bg, color }}><Icon size={17} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="profile-stat-value" style={{ color }}>{value}</div>
              <div className="profile-stat-label">{label}</div>
              {sub && <div className="tiny muted" style={{ marginTop: 1 }}>{sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="profile-layout">
        <div className="stack">
          <section className="card">
            <SectionTitle
              icon={BookOpen}
              right={isOwnProfile ? <Link to="/library" className="link small">Tủ sách</Link> : null}
            >
              Đang đọc gần đây
            </SectionTitle>
            {entries.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>
                {isOwnProfile ? 'Bạn chưa đọc cuốn sách nào gần đây.' : 'Chưa có hoạt động đọc gần đây.'}
              </p>
            ) : (
              <div className="profile-reading-grid">
                {entries.slice(0, 4).map((entry) => (
                  <Link key={entry.bookId} to={`/read/${entry.bookId}`} className="profile-reading-item">
                    <img src={entry.book.cover} alt="" className="book-cover" style={{ width: 46, height: 64 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="small strong truncate">{entry.book.title}</div>
                      <div className="tiny muted truncate" style={{ margin: '2px 0 7px' }}>{entry.book.author}</div>
                      <ProgressBar percent={entry.percent || 0} height={4} />
                      <div className="tiny muted" style={{ marginTop: 5 }}>
                        {entry.percent || 0}% · {entry.lastReadAt ? timeAgo(entry.lastReadAt) : 'Vừa đọc'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <h3 className="row" style={{ margin: 0, fontSize: 17, gap: 8 }}>
                <MessageSquare size={19} color="var(--accent-green)" /> {isOwnProfile ? 'Bài viết của tôi' : 'Bài viết'}
              </h3>
              <span className="badge">{myPosts.length} bài viết</span>
            </div>

            {myPosts.length === 0 && (
              <div className="card">
                <EmptyState
                  icon={BookOpen}
                  title="Chưa có bài viết nào"
                  hint={isOwnProfile ? 'Chia sẻ cảm nhận về cuốn sách bạn đang đọc với cộng đồng Bookigma.' : 'Người dùng này chưa đăng bài viết nào.'}
                  action={isOwnProfile ? <Link to="/" className="btn btn-primary btn-sm">Đăng bài viết</Link> : null}
                />
              </div>
            )}

            <div className="stack" style={{ gap: 14 }}>
              {myPosts.map((post) => {
                const attachedBook = post.bookId ? books.find((book) => String(book.id) === String(post.bookId)) : null;
                const showComments = Boolean(openComments[post.id]);
                const comments = post.comments || [];
                const likeCount = post.likeCount ?? post.likedBy?.length ?? 0;

                return (
                  <article key={post.id} className="card profile-post">
                    <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                      <img src={avatarSrc(profileUser.avatar || post.avatarUrl)} alt="" className="avatar" style={{ width: 40, height: 40 }} />
                      <div style={{ minWidth: 0 }}>
                        <div className="small strong truncate">{post.authorName || profileUser.name}</div>
                        <div className="tiny muted">{timeAgo(post.time)}</div>
                      </div>
                    </div>

                    <p className="profile-post-content">{post.content}</p>

                    {post.image && (
                      isVideoMedia(post.image) ? (
                        <video src={mediaSrc(post.image)} className="profile-post-media" controls preload="metadata" playsInline />
                      ) : (
                        <img src={mediaSrc(post.image)} alt="" className="profile-post-media" loading="lazy" onClick={() => setMediaViewer(post)} />
                      )
                    )}

                    {attachedBook && (
                      <Link
                        to={attachedBook.forSale === false ? `/read/${attachedBook.id}` : `/book/${attachedBook.id}`}
                        className="profile-post-book"
                      >
                        <img src={attachedBook.cover} alt="" className="book-cover" style={{ width: 44, height: 60 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="small strong truncate">{attachedBook.title}</div>
                          <div className="tiny muted">{attachedBook.author}</div>
                          <div className="price small" style={{ marginTop: 3 }}>{currency(attachedBook.price)}</div>
                        </div>
                        <span className="btn btn-soft btn-sm">Xem sách</span>
                      </Link>
                    )}

                    <div className="profile-post-stats">
                      <span><ThumbsUp size={14} /> {likeCount} lượt thích</span>
                      <span><MessageSquare size={14} /> {comments.length} bình luận</span>
                    </div>

                    <div className="profile-post-actions">
                      <button
                        type="button"
                        className={`profile-post-action ${post.likedByMe ? 'active' : ''}`}
                        onClick={() => handleLike(post.id)}
                      >
                        <ThumbsUp size={16} fill={post.likedByMe ? 'currentColor' : 'none'} /> Thích
                      </button>
                      <button
                        type="button"
                        className="profile-post-action"
                        onClick={() => setOpenComments((o) => ({ ...o, [post.id]: !o[post.id] }))}
                      >
                        <MessageSquare size={16} /> Bình luận
                      </button>
                    </div>

                    {showComments && (
                      <div className="profile-post-comments">
                        {comments.length === 0 && <p className="tiny muted" style={{ margin: 0 }}>Chưa có bình luận nào.</p>}
                        {comments.map((comment) => (
                          <div key={comment.id} className="profile-comment">
                            <img src={avatarSrc(comment.avatarUrl)} alt="" className="avatar" style={{ width: 30, height: 30 }} />
                            <div className="profile-comment-bubble">
                              <div className="tiny strong">{comment.authorName || comment.username || 'Người dùng'}</div>
                              <div className="small" style={{ overflowWrap: 'anywhere' }}>{comment.text}</div>
                              <div className="tiny muted" style={{ marginTop: 2 }}>{timeAgo(comment.time)}</div>
                            </div>
                          </div>
                        ))}
                        <div className="row" style={{ gap: 8 }}>
                          <img src={avatarSrc(authUser?.avatar)} alt="" className="avatar" style={{ width: 30, height: 30 }} />
                          <input
                            className="input"
                            style={{ borderRadius: 18, height: 36 }}
                            placeholder="Viết bình luận..."
                            value={commentDraft[post.id] || ''}
                            onChange={(e) => setCommentDraft((d) => ({ ...d, [post.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                          />
                          <button type="button" className="btn-icon" onClick={() => submitComment(post.id)} aria-label="Gửi bình luận">
                            <Send size={17} color="var(--accent-green)" />
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="stack">
          <div className="card">
            <SectionTitle icon={UserRound}>Thông tin cá nhân</SectionTitle>
            <div className="stack" style={{ gap: 12 }}>
              <ProfileInfoRow icon={Mail} label="Email" value={profileUser.email || 'Chưa cập nhật'} />
              <ProfileInfoRow icon={AtSign} label="Tên đăng nhập" value={profileUser.username ? `@${profileUser.username}` : 'Chưa cập nhật'} />
              <ProfileInfoRow icon={Calendar} label="Ngày tham gia" value={joinedDate} />
              <ProfileInfoRow icon={Flame} label="Điểm Bookigma" value={(profileUser.points || 0).toLocaleString('vi-VN')} />
              <ProfileInfoRow icon={ShieldCheck} label="Vai trò" value={roleLabel} />
            </div>
          </div>

          <div className="card">
            <SectionTitle icon={Users} right={<span className="badge">{friendsToShow.length}</span>}>
              {isOwnProfile ? 'Bạn bè' : 'Bạn chung'}
            </SectionTitle>
            {friendsPending && friendsToShow.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>Đang tải danh sách bạn bè...</p>
            ) : friendsToShow.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>
                {isOwnProfile
                  ? 'Chưa có người bạn nào.'
                  : profileFriends.length > 0
                    ? `Chưa có bạn chung. Họ có ${profileFriends.length} người bạn.`
                    : 'Chưa có bạn chung.'}
              </p>
            ) : (
              <div className="profile-friend-list">
                {friendsToShow.slice(0, 6).map((friend) => (
                  <Link key={friend.id} to={`/profile/${friend.id}`} className="profile-friend">
                    <img src={avatarSrc(friend.avatarUrl)} alt="" className="avatar" style={{ width: 38, height: 38 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="small strong truncate">{friend.fullName || friend.username || 'Người dùng'}</div>
                      {friend.username && <div className="tiny muted truncate">@{friend.username}</div>}
                    </div>
                    <ChevronRight size={15} className="muted" />
                  </Link>
                ))}
              </div>
            )}
            {friendsToShow.length > 6 && (
              <p className="tiny muted" style={{ margin: '8px 0 0' }}>+{friendsToShow.length - 6} người khác</p>
            )}
            {isOwnProfile && (
              <Link to="/friends" className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 10 }}>
                Xem tất cả bạn bè
              </Link>
            )}
          </div>

          <div className="card">
            <SectionTitle icon={ImageIcon} right={<span className="badge">{mediaPosts.length}</span>}>
              Ảnh & video
            </SectionTitle>
            {mediaPosts.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>Chưa đăng ảnh hoặc video nào.</p>
            ) : (
              <>
                <div className="profile-media-grid">
                  {mediaPosts.slice(0, 6).map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      className="profile-media-item"
                      onClick={() => setMediaViewer(post)}
                      aria-label={isVideoMedia(post.image) ? 'Xem video' : 'Xem ảnh'}
                    >
                      {isVideoMedia(post.image) ? (
                        <>
                          <video src={mediaSrc(post.image)} muted preload="metadata" playsInline />
                          <span className="profile-media-play"><Play size={16} fill="currentColor" /></span>
                        </>
                      ) : (
                        <img src={mediaSrc(post.image)} alt="" loading="lazy" />
                      )}
                    </button>
                  ))}
                </div>
                {mediaPosts.length > 6 && (
                  <p className="tiny muted" style={{ margin: '8px 0 0' }}>+{mediaPosts.length - 6} ảnh/video khác</p>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {mediaViewer && (
        <div className="modal-backdrop" onClick={() => setMediaViewer(null)} role="presentation">
          <div className="profile-media-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Xem ảnh hoặc video">
            <button type="button" className="btn-icon profile-media-modal-close" onClick={() => setMediaViewer(null)} aria-label="Đóng">
              <X size={18} />
            </button>
            {isVideoMedia(mediaViewer.image) ? (
              <video src={mediaSrc(mediaViewer.image)} controls playsInline />
            ) : (
              <img src={mediaSrc(mediaViewer.image)} alt={mediaViewer.content || 'Ảnh bài viết'} />
            )}
            {mediaViewer.content && <p className="small" style={{ margin: '10px 2px 0', lineHeight: 1.55 }}>{mediaViewer.content}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
