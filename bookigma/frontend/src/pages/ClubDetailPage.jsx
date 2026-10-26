import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Check, Clock, Crown, Globe2, Image as ImageIcon, Lock, LogOut,
  MessageSquare, Send, Settings, Shield, ShieldCheck, Sparkles, ThumbsUp, Trash2,
  UserCog, UserPlus, Users, X,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { avatarSrc, DEFAULT_AVATAR, mediaSrc } from '../lib/avatar';
import { timeAgo } from '../lib/format';
import { uploadPostImage } from '../services/api';
import ReactionButton from '../components/social/ReactionButton';
import ReactionSummary from '../components/social/ReactionSummary';
import CommentThread from '../components/social/CommentThread';
import Modal from '../components/common/Modal';
import * as clubApi from '../services/clubApi';
import './clubs.css';

const EMPTY_SETTINGS = { name: '', description: '', coverUrl: '', privateClub: false };

function mediaUrl(value) {
  const raw = mediaSrc(value);
  return raw && /^(https?:\/\/|\/)/i.test(raw) ? raw : '';
}

function heroStyle(club) {
  const url = mediaUrl(club?.coverUrl);
  return url ? { backgroundImage: `url("${url.replace(/"/g, '%22')}")` } : undefined;
}

const ROLE_LABEL = {
  OWNER: 'Chủ nhóm',
  ADMIN: 'Quản trị',
  MODERATOR: 'Điều hành',
  MEMBER: 'Thành viên',
};

export default function ClubDetailPage() {
  const { clubId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    posts, loadClubPosts, addClubPost, reactToPost, addComment, reactToComment,
  } = useApp();

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const [draft, setDraft] = useState('');
  const [draftImage, setDraftImage] = useState(null);
  const [draftImagePreview, setDraftImagePreview] = useState('');
  const [imageInputKey, setImageInputKey] = useState(0);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState({});

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState(EMPTY_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [managingMember, setManagingMember] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clubApi.fetchClub(clubId);
      setClub(data);
      setError('');
      if (!data.privateClub || data.joined) {
        await loadClubPosts(clubId).catch(() => {});
      }
    } catch (err) {
      setClub(null);
      setError(err.message || 'Không thể tải nhóm đọc sách.');
    } finally {
      setLoading(false);
    }
  }, [clubId, loadClubPosts]);

  useEffect(() => {
    load();
  }, [load, user?.id]);

  useEffect(() => {
    if (!location.state?.join) return;
    if (loading || !club) return;
    if (!club.joined && !club.pendingRequest) {
      setJoinMessage('');
      setJoinOpen(true);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, loading, club, navigate]);

  useEffect(() => {
    if (!draftImage) {
      setDraftImagePreview('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(draftImage);
    setDraftImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [draftImage]);

  const clubPosts = useMemo(
    () => posts
      .filter((post) => String(post.clubId) === String(clubId))
      .sort((a, b) => b.time - a.time),
    [posts, clubId]
  );

  const memberById = useMemo(
    () => new Map((club?.members || []).map((member) => [String(member.userId), member])),
    [club]
  );

  const canSeePosts = Boolean(club && (!club.privateClub || club.joined));
  const pendingRequests = club?.pendingRequests || [];
  const settingsCoverPreview = mediaUrl(settingsForm.coverUrl);

  const requireLogin = () => {
    if (user) return false;
    navigate('/login', { state: { from: `/clubs/${clubId}` } });
    return true;
  };

  const openJoin = () => {
    if (requireLogin()) return;
    setJoinMessage('');
    setJoinOpen(true);
  };

  const submitJoinRequest = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      const data = await clubApi.joinClub(clubId, joinMessage.trim());
      setClub(data);
      setJoinOpen(false);
      if (data.joined) {
        toast(`Đã tham gia nhóm "${data.name}".`);
        await loadClubPosts(clubId).catch(() => {});
      } else {
        toast('Đã gửi yêu cầu. Chờ chủ nhóm duyệt nhé.');
      }
    } catch (err) {
      toast(err.message || 'Không thể gửi yêu cầu tham gia.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (!club) return;
    if (!window.confirm('Hủy yêu cầu tham gia nhóm này?')) return;
    try {
      setBusy(true);
      const data = await clubApi.cancelJoinRequest(clubId);
      setClub(data);
      toast('Đã hủy yêu cầu tham gia.');
    } catch (err) {
      toast(err.message || 'Không thể hủy yêu cầu.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const leaveClub = async () => {
    if (!club) return;
    if (!window.confirm(`Bạn chắc chắn muốn rời nhóm "${club.name}"?`)) return;
    try {
      setBusy(true);
      const data = await clubApi.leaveClub(clubId);
      setClub(data);
      toast('Bạn đã rời nhóm.');
    } catch (err) {
      toast(err.message || 'Không thể rời nhóm.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitPost = async (event) => {
    event.preventDefault();
    if (!draft.trim()) {
      toast('Hãy viết nội dung trước khi đăng nhé.', 'error');
      return;
    }
    try {
      setPosting(true);
      let imageUrl = null;
      if (draftImage) {
        const uploaded = await uploadPostImage(draftImage);
        imageUrl = uploaded.imageUrl;
      }
      await addClubPost(clubId, { content: draft.trim(), image: imageUrl });
      setDraft('');
      setDraftImage(null);
      setImageInputKey((key) => key + 1);
      setClub((prev) => prev ? { ...prev, postCount: (prev.postCount || 0) + 1 } : prev);
      toast('Đã đăng bài trong nhóm — nhận 10 điểm Bookigma.');
    } catch (err) {
      toast(err.message || 'Không thể đăng bài trong nhóm.', 'error');
    } finally {
      setPosting(false);
    }
  };

  const promptJoin = () => toast('Hãy gửi yêu cầu và chờ chủ nhóm duyệt để tương tác.', 'info');

  const openSettings = () => {
    if (!club) return;
    setSettingsForm({
      name: club.name || '',
      description: club.description || '',
      coverUrl: club.coverUrl || '',
      privateClub: Boolean(club.privateClub),
    });
    setSettingsOpen(true);
  };

  const uploadSettingsCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Hãy chọn một file ảnh.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('Ảnh bìa không được vượt quá 10 MB.', 'error');
      return;
    }
    try {
      setUploadingCover(true);
      const uploaded = await uploadPostImage(file);
      setSettingsForm((prev) => ({ ...prev, coverUrl: uploaded.imageUrl || '' }));
      toast('Đã tải ảnh bìa lên.');
    } catch (err) {
      toast(err.message || 'Không thể tải ảnh bìa.', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    if (!settingsForm.name.trim()) {
      toast('Tên nhóm không được để trống.', 'error');
      return;
    }
    try {
      setSavingSettings(true);
      const data = await clubApi.updateClub(clubId, {
        name: settingsForm.name.trim(),
        description: settingsForm.description.trim() || null,
        coverUrl: settingsForm.coverUrl.trim() || null,
        privateClub: settingsForm.privateClub,
      });
      setClub(data);
      setSettingsOpen(false);
      toast('Đã cập nhật thông tin nhóm.');
    } catch (err) {
      toast(err.message || 'Không thể cập nhật nhóm.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const resolveRequest = async (requestId, approve) => {
    try {
      setResolvingId(requestId);
      if (approve) {
        await clubApi.approveJoinRequest(clubId, requestId);
      } else {
        await clubApi.rejectJoinRequest(clubId, requestId);
      }
      const data = await clubApi.fetchClub(clubId);
      setClub(data);
      toast(approve ? 'Đã duyệt yêu cầu tham gia.' : 'Đã từ chối yêu cầu tham gia.');
    } catch (err) {
      toast(err.message || 'Không thể xử lý yêu cầu.', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  const canChangeRole = (member) => Boolean(
    club?.owner && member.role !== 'OWNER' && String(member.userId) !== String(user?.id)
  );

  const canRemoveMember = (member) => {
    if (!club?.canManage) return false;
    if (member.role === 'OWNER' || String(member.userId) === String(user?.id)) return false;
    if (club.owner) return true;
    return member.role !== 'ADMIN';
  };

  const toggleMemberRole = async (member) => {
    const nextRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    const actionKey = `${member.userId}:role`;
    try {
      setManagingMember(actionKey);
      const data = await clubApi.updateMemberRole(clubId, member.userId, nextRole);
      setClub(data);
      toast(nextRole === 'ADMIN'
        ? `Đã bổ nhiệm ${member.name || member.username} làm quản trị viên.`
        : `Đã chuyển ${member.name || member.username} thành thành viên.`);
    } catch (err) {
      toast(err.message || 'Không thể đổi vai trò thành viên.', 'error');
    } finally {
      setManagingMember('');
    }
  };

  const kickMember = async (member) => {
    const displayName = member.name || member.username;
    if (!window.confirm(`Xóa ${displayName} khỏi nhóm?`)) return;
    const actionKey = `${member.userId}:remove`;
    try {
      setManagingMember(actionKey);
      const data = await clubApi.removeClubMember(clubId, member.userId);
      setClub(data);
      toast(`Đã xóa ${displayName} khỏi nhóm.`);
    } catch (err) {
      toast(err.message || 'Không thể xóa thành viên.', 'error');
    } finally {
      setManagingMember('');
    }
  };

  if (loading) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <Sparkles size={28} />
          <p className="small">Đang tải nhóm đọc sách...</p>
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <Users size={30} />
          <h3>Không thể mở nhóm</h3>
          <p className="small">{error || 'Nhóm đọc sách không tồn tại.'}</p>
          <Link to="/clubs" className="btn btn-primary">Về danh sách nhóm</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-layout">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className={`clubs-detail-hero ${mediaUrl(club.coverUrl) ? 'has-cover' : ''}`.trim()}
          style={heroStyle(club)}
        >
          <Link to="/clubs" className="btn btn-sm clubs-back-btn">
            <ArrowLeft size={15} /> Danh sách nhóm
          </Link>

          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className={`clubs-chip ${club.privateClub ? 'clubs-chip-private' : 'clubs-chip-on-hero'}`}>
              {club.privateClub ? <Lock size={12} /> : <Globe2 size={12} />}
              {club.privateClub ? 'Riêng tư' : 'Công khai'}
            </span>
            <span className="clubs-chip clubs-chip-on-hero">
              <ShieldCheck size={12} /> Tham gia cần duyệt
            </span>
            {club.owner && (
              <span className="clubs-chip clubs-owner-chip">
                <Crown size={12} /> Bạn là chủ nhóm
              </span>
            )}
            {!club.owner && club.myRole === 'ADMIN' && (
              <span className="clubs-chip clubs-owner-chip">
                <Shield size={12} /> Quản trị nhóm
              </span>
            )}
            {!club.owner && club.myRole === 'MODERATOR' && (
              <span className="clubs-chip clubs-chip-on-hero">
                <Shield size={12} /> Điều hành nhóm
              </span>
            )}
          </div>

          <h1 style={{ marginTop: 8 }}>{club.name}</h1>
          <p style={{ margin: '7px 0 0', maxWidth: 820, lineHeight: 1.55, opacity: 0.92 }}>
            {club.description || 'Nhóm chưa có mô tả. Hãy cùng nhau bắt đầu một cuốn sách mới!'}
          </p>
          <div className="clubs-detail-meta">
            <span className="row" style={{ gap: 5 }}><Users size={15} /> {club.memberCount} thành viên</span>
            <span className="row" style={{ gap: 5 }}><BookOpen size={15} /> {club.postCount} bài thảo luận</span>
            <span className="row" style={{ gap: 5 }}><Crown size={15} /> {club.ownerName}</span>
            {club.createdAt && (
              <span className="row" style={{ gap: 5 }}>
                Tạo ngày {new Date(club.createdAt).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
        </div>

        <div className="clubs-detail-actions">
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
            {(club.members || []).slice(0, 7).map((member) => (
              <img
                key={member.userId}
                src={avatarSrc(member.avatarUrl)}
                alt={member.name}
                title={`${member.name} · ${ROLE_LABEL[member.role] || 'Thành viên'}`}
                className="avatar"
                style={{ width: 28, height: 28, border: '2px solid var(--bg-card)', marginLeft: -6 }}
              />
            ))}
            <span className="tiny muted" style={{ marginLeft: 4 }}>
              {club.memberCount > 0 ? `${club.memberCount} người đang thảo luận` : 'Chưa có thành viên'}
            </span>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {club.canManage && (
              <>
                <button type="button" className="btn btn-soft btn-sm" onClick={openSettings}>
                  <Settings size={15} /> Cài đặt
                </button>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => setManageOpen(true)}>
                  <UserCog size={15} /> Thành viên
                </button>
              </>
            )}
            {club.joined && !club.owner && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={leaveClub} disabled={busy}>
                <LogOut size={15} /> Rời nhóm
              </button>
            )}
            {!club.joined && !club.pendingRequest && (
              <button type="button" className="btn btn-primary btn-sm" onClick={openJoin} disabled={busy}>
                <UserPlus size={15} /> Xin tham gia
              </button>
            )}
            {!club.joined && club.pendingRequest && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancelRequest} disabled={busy}>
                <X size={15} /> Hủy yêu cầu
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="clubs-detail-grid">
        <div className="stack" style={{ gap: 16 }}>
          {club.joined && (
            <form className="card" onSubmit={submitPost}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <img src={avatarSrc(user?.avatar)} alt="" className="avatar" style={{ width: 40, height: 40 }} />
                <textarea
                  className="textarea"
                  style={{ minHeight: 54, borderRadius: 18 }}
                  placeholder={`Chia sẻ cảm nhận, đặt câu hỏi hoặc mở một cuộc thảo luận trong "${club.name}"...`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={5000}
                />
              </div>

              {draftImage && (
                <div style={{ position: 'relative', marginTop: 12 }}>
                  <img
                    src={draftImagePreview}
                    alt="Ảnh xem trước bài viết"
                    style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 10 }}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label="Bỏ ảnh"
                    onClick={() => { setDraftImage(null); setImageInputKey((key) => key + 1); }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'var(--bg-card)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div
                className="row-between"
                style={{
                  marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 8,
                }}
              >
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <label className="btn btn-soft btn-sm" style={{ cursor: 'pointer' }}>
                    <ImageIcon size={16} color="var(--club-brass-strong)" /> {draftImage ? 'Đổi ảnh' : 'Tải ảnh lên'}
                    <input
                      key={imageInputKey}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          toast('Ảnh bài viết không được vượt quá 10 MB.', 'error');
                          event.target.value = '';
                          return;
                        }
                        setDraftImage(file);
                      }}
                    />
                  </label>
                  {draftImage && <span className="tiny muted">{draftImage.name}</span>}
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={posting}>
                  <Send size={15} /> {posting ? 'Đang đăng...' : 'Đăng bài'}
                </button>
              </div>
            </form>
          )}

          {!club.joined && !club.privateClub && (
            <div className="clubs-notice">
              <div className="clubs-notice-main">
                <span className="clubs-notice-icon">
                  {club.pendingRequest ? <Clock size={18} /> : <Globe2 size={18} />}
                </span>
                <div>
                  <strong className="small">
                    {club.pendingRequest ? 'Yêu cầu tham gia đang chờ duyệt' : 'Nhóm công khai — đọc trước, tham gia cần duyệt'}
                  </strong>
                  <p className="tiny muted" style={{ margin: '3px 0 0', lineHeight: 1.5 }}>
                    {club.pendingRequest
                      ? 'Chủ nhóm hoặc quản trị viên sẽ duyệt yêu cầu của bạn. Bạn có thể hủy yêu cầu bất cứ lúc nào.'
                      : 'Bạn xem được bài thảo luận, nhưng cần được chủ nhóm duyệt mới có thể đăng bài và bình luận.'}
                  </p>
                </div>
              </div>
              {club.pendingRequest ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={cancelRequest} disabled={busy}>
                  <X size={14} /> Hủy yêu cầu
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={openJoin} disabled={busy}>
                  <UserPlus size={15} /> Gửi yêu cầu tham gia
                </button>
              )}
            </div>
          )}

          {!club.joined && club.privateClub && (
            <div className="clubs-locked">
              <Lock size={34} />
              <h3 style={{ margin: '0 0 6px' }}>
                {club.pendingRequest ? 'Đang chờ chủ nhóm duyệt' : 'Nhóm riêng tư'}
              </h3>
              <p className="small" style={{ margin: '0 0 14px' }}>
                {club.pendingRequest
                  ? 'Nội dung, thành viên và bài thảo luận sẽ mở sau khi yêu cầu của bạn được duyệt.'
                  : 'Chỉ thành viên được duyệt mới xem được bài thảo luận và danh sách thành viên.'}
              </p>
              {club.pendingRequest ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={cancelRequest} disabled={busy}>
                  <X size={14} /> Hủy yêu cầu tham gia
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={openJoin} disabled={busy}>
                  <UserPlus size={16} /> Gửi yêu cầu tham gia
                </button>
              )}
            </div>
          )}

          {canSeePosts && clubPosts.length === 0 && (
            <div className="card empty" style={{ padding: '36px 20px' }}>
              <MessageSquare size={30} />
              <h3 style={{ margin: '0 0 6px' }}>Chưa có bài thảo luận nào</h3>
              <p className="small" style={{ margin: 0 }}>
                {club.joined
                  ? 'Hãy là người đầu tiên mở màn bằng một câu hỏi hoặc cảm nhận về cuốn sách bạn đang đọc.'
                  : 'Nhóm chưa có bài thảo luận nào. Gửi yêu cầu tham gia để bắt đầu trò chuyện.'}
              </p>
            </div>
          )}

          {canSeePosts && clubPosts.map((post) => {
            const member = memberById.get(String(post.authorId));
            const authorName = post.authorName || post.username || 'Người dùng';
            const authorAvatar = post.avatarUrl || DEFAULT_AVATAR;
            const showComments = openComments[post.id];
            const postImage = mediaUrl(post.image);

            return (
              <article key={post.id} className="card">
                <div className="row-between" style={{ marginBottom: 12 }}>
                  <div className="row">
                    <img src={avatarSrc(authorAvatar)} alt="" className="avatar" style={{ width: 42, height: 42 }} />
                    <div>
                      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                        <Link
                          to={`/profile/${post.authorId}`}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          <h4 style={{ margin: 0, fontSize: 15 }}>{authorName}</h4>
                        </Link>
                        {member?.role === 'OWNER' && (
                          <span className="clubs-role-chip clubs-role-owner"><Crown size={11} /> Chủ nhóm</span>
                        )}
                        {member?.role === 'ADMIN' && (
                          <span className="clubs-role-chip clubs-role-admin"><Shield size={11} /> Quản trị</span>
                        )}
                        {member?.role === 'MODERATOR' && (
                          <span className="clubs-role-chip clubs-role-mod"><Shield size={11} /> Điều hành</span>
                        )}
                      </div>
                      <span className="tiny muted">{timeAgo(post.time)}</span>
                    </div>
                  </div>
                </div>

                <p style={{ lineHeight: 1.6, margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{post.content}</p>

                {postImage && (
                  <img
                    src={postImage}
                    alt=""
                    style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }}
                    loading="lazy"
                  />
                )}

                <div className="row-between tiny muted post-stats" style={{ paddingBottom: 8 }}>
                  <ReactionSummary counts={post.reactionCounts} total={post.likeCount} />
                  <span>{post.comments.length} bình luận</span>
                </div>

                <div className="row post-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, gap: 0 }}>
                  {club.joined ? (
                    <ReactionButton
                      myReaction={post.myReaction}
                      count={post.likeCount}
                      onReact={(type) => reactToPost(post.id, type)
                        .catch((err) => toast(err.message || 'Không thể cập nhật cảm xúc.', 'error'))}
                    />
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, border: 'none', color: 'var(--text-sub)' }}
                      onClick={promptJoin}
                    >
                      <ThumbsUp size={17} /> Thích
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, border: 'none', color: 'var(--text-sub)' }}
                    onClick={() => {
                      if (!club.joined) {
                        promptJoin();
                        return;
                      }
                      setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }));
                    }}
                  >
                    <MessageSquare size={17} /> Bình luận
                  </button>
                </div>

                {showComments && club.joined && (
                  <CommentThread
                    post={post}
                    user={user}
                    onAdd={async (text) => {
                      await addComment(post.id, { text });
                    }}
                    onReactComment={(commentId, type) => reactToComment(post.id, commentId, type)}
                  />
                )}
              </article>
            );
          })}
        </div>

        <aside className="stack clubs-aside">
          {club.canManage && (
            <div className="card clubs-request-card">
              <div className="clubs-side-head">
                <h4>
                  <UserPlus size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                  Yêu cầu tham gia
                </h4>
                {pendingRequests.length > 0 && (
                  <span className="clubs-status-pending">{pendingRequests.length} chờ duyệt</span>
                )}
              </div>
              {pendingRequests.length === 0 && (
                <p className="tiny muted" style={{ margin: 0 }}>Chưa có yêu cầu nào đang chờ duyệt.</p>
              )}
              <div className="stack" style={{ gap: 10 }}>
                {pendingRequests.map((request) => (
                  <div key={request.id} className="clubs-request-item">
                    <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                      <img
                        src={avatarSrc(request.avatarUrl)}
                        alt=""
                        className="avatar"
                        style={{ width: 32, height: 32 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          to={`/profile/${request.userId}`}
                          className="small strong truncate"
                          style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                        >
                          {request.name || request.username}
                        </Link>
                        <span className="tiny muted">{timeAgo(new Date(request.createdAt).getTime())}</span>
                        {request.message && (
                          <p className="tiny muted" style={{ margin: '4px 0 0', lineHeight: 1.45 }}>
                            “{request.message}”
                          </p>
                        )}
                        <div className="row" style={{ gap: 6, marginTop: 7 }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => resolveRequest(request.id, true)}
                            disabled={resolvingId === request.id}
                          >
                            <Check size={13} /> Duyệt
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => resolveRequest(request.id, false)}
                            disabled={resolvingId === request.id}
                          >
                            <X size={13} /> Từ chối
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card card-tight">
            <div className="clubs-side-head" style={{ padding: '4px 8px 0' }}>
              <h4>Thành viên ({club.memberCount})</h4>
              {club.canManage && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setManageOpen(true)}>
                  <UserCog size={14} /> Quản lý
                </button>
              )}
            </div>
            {(club.members || []).map((member) => (
              <Link key={member.userId} to={`/profile/${member.userId}`} className="clubs-member-row">
                <img src={avatarSrc(member.avatarUrl)} alt="" className="avatar" style={{ width: 32, height: 32 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="small strong truncate">{member.name || member.username}</div>
                  <span className={`clubs-role-chip ${member.role === 'OWNER' ? 'clubs-role-owner' : member.role === 'ADMIN' ? 'clubs-role-admin' : member.role === 'MODERATOR' ? 'clubs-role-mod' : ''}`.trim()}>
                    {member.role === 'OWNER' && <Crown size={10} />}
                    {member.role === 'ADMIN' && <Shield size={10} />}
                    {ROLE_LABEL[member.role] || 'Thành viên'}
                  </span>
                </div>
              </Link>
            ))}
            {(!club.members || club.members.length === 0) && (
              <p className="tiny muted" style={{ margin: '0 8px 4px' }}>
                {club.privateClub && !club.joined
                  ? 'Gửi yêu cầu và chờ duyệt để xem danh sách thành viên.'
                  : 'Chưa có thành viên nào.'}
              </p>
            )}
            {club.joined && !club.owner && (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-block"
                style={{ marginTop: 8 }}
                onClick={leaveClub}
                disabled={busy}
              >
                <LogOut size={14} /> Rời nhóm
              </button>
            )}
          </div>

          <div className="card">
            <h4 style={{ margin: '0 0 8px', fontSize: 15 }}>Về nhóm này</h4>
            <div className="stack" style={{ gap: 8 }}>
              <div className="row-between tiny">
                <span className="muted">Quyền truy cập</span>
                <span className="strong">{club.privateClub ? 'Riêng tư' : 'Công khai'}</span>
              </div>
              <div className="row-between tiny">
                <span className="muted">Tham gia</span>
                <span className="strong">Chủ nhóm duyệt</span>
              </div>
              <div className="row-between tiny">
                <span className="muted">Chủ nhóm</span>
                <Link to={`/profile/${club.ownerId}`} className="strong" style={{ color: 'inherit' }}>
                  {club.ownerName}
                </Link>
              </div>
              <div className="row-between tiny">
                <span className="muted">Thành viên</span>
                <span className="strong">{club.memberCount}</span>
              </div>
            </div>
            <p className="tiny muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
              Mọi yêu cầu tham gia đều cần chủ nhóm hoặc quản trị viên duyệt.
              {club.privateClub
                ? ' Nội dung chỉ hiển thị với thành viên đã được duyệt.'
                : ' Nội dung công khai cho mọi người đọc, nhưng cần được duyệt để tương tác.'}
            </p>
          </div>
        </aside>
      </div>

      <Modal
        open={joinOpen}
        title={`Xin tham gia "${club.name}"`}
        onClose={() => setJoinOpen(false)}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setJoinOpen(false)}>Hủy</button>
            <button type="submit" form="club-join-form" className="btn btn-primary" disabled={busy}>
              {busy ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </>
        )}
      >
        <form id="club-join-form" className="stack" onSubmit={submitJoinRequest}>
          {mediaUrl(club.coverUrl) && (
            <div
              className="clubs-cover-preview"
              style={{ backgroundImage: `url("${mediaUrl(club.coverUrl).replace(/"/g, '%22')}")` }}
            />
          )}
          <div className="clubs-join-note">
            <ShieldCheck size={16} />
            <span>
              {club.privateClub
                ? 'Nhóm riêng tư: nội dung chỉ mở sau khi chủ nhóm duyệt yêu cầu của bạn.'
                : 'Nhóm công khai: bạn đọc được bài ngay, nhưng cần chủ nhóm duyệt để đăng bài và bình luận.'}
            </span>
          </div>
          <div>
            <label className="small strong" htmlFor="club-join-message">Lời nhắn tới chủ nhóm (không bắt buộc)</label>
            <textarea
              id="club-join-message"
              className="textarea"
              style={{ marginTop: 6 }}
              rows={4}
              maxLength={500}
              placeholder="Ví dụ: Mình đang tìm hiểu về đầu tư và muốn học hỏi từ mọi người..."
              value={joinMessage}
              onChange={(event) => setJoinMessage(event.target.value)}
              autoFocus
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={manageOpen && club.canManage}
        title="Quản lý thành viên"
        onClose={() => setManageOpen(false)}
        width={560}
        footer={(
          <button type="button" className="btn btn-soft" onClick={() => setManageOpen(false)}>Đóng</button>
        )}
      >
        <div className="stack">
          <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>
            {club.owner
              ? 'Bạn có thể bổ nhiệm quản trị viên hoặc xóa thành viên. Chủ nhóm không thể bị thay đổi vai trò.'
              : 'Bạn có thể xóa thành viên thường khỏi nhóm. Chỉ chủ nhóm mới đổi được vai trò và xóa quản trị viên.'}
          </p>
          <div className="clubs-manage-list">
            {(club.members || []).map((member) => {
              const displayName = member.name || member.username;
              const roleBusy = managingMember === `${member.userId}:role`;
              const removeBusy = managingMember === `${member.userId}:remove`;
              return (
                <div key={member.userId} className="clubs-manage-row">
                  <img src={avatarSrc(member.avatarUrl)} alt="" className="avatar" style={{ width: 34, height: 34 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="small strong truncate">{displayName}</div>
                    <span className={`clubs-role-chip ${member.role === 'OWNER' ? 'clubs-role-owner' : member.role === 'ADMIN' ? 'clubs-role-admin' : member.role === 'MODERATOR' ? 'clubs-role-mod' : ''}`.trim()}>
                      {ROLE_LABEL[member.role] || 'Thành viên'}
                    </span>
                  </div>
                  <div className="clubs-manage-actions">
                    {canChangeRole(member) && (
                      <button
                        type="button"
                        className="btn btn-soft btn-sm"
                        onClick={() => toggleMemberRole(member)}
                        disabled={roleBusy || removeBusy}
                      >
                        {member.role === 'ADMIN'
                          ? <><Shield size={13} /> Hạ quyền</>
                          : <><ShieldCheck size={13} /> Bổ nhiệm QTV</>}
                      </button>
                    )}
                    {canRemoveMember(member) && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => kickMember(member)}
                        disabled={roleBusy || removeBusy}
                      >
                        <Trash2 size={13} /> Xóa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal
        open={settingsOpen}
        title="Cài đặt nhóm"
        onClose={() => setSettingsOpen(false)}
        width={540}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setSettingsOpen(false)}>Hủy</button>
            <button type="submit" form="club-settings-form" className="btn btn-primary" disabled={savingSettings || uploadingCover}>
              {savingSettings ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </>
        )}
      >
        <form id="club-settings-form" className="stack" onSubmit={saveSettings}>
          <div>
            <label className="small strong" htmlFor="club-settings-name">Tên nhóm *</label>
            <input
              id="club-settings-name"
              className="input"
              style={{ marginTop: 6 }}
              maxLength={150}
              value={settingsForm.name}
              onChange={(event) => setSettingsForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="small strong" htmlFor="club-settings-description">Mô tả</label>
            <textarea
              id="club-settings-description"
              className="textarea"
              style={{ marginTop: 6 }}
              rows={4}
              maxLength={2000}
              value={settingsForm.description}
              onChange={(event) => setSettingsForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div>
            <label className="small strong">Ảnh bìa</label>
            <div className="clubs-cover-picker" style={{ marginTop: 6 }}>
              {settingsCoverPreview && (
                <div
                  className="clubs-cover-preview"
                  style={{ backgroundImage: `url("${settingsCoverPreview.replace(/"/g, '%22')}")` }}
                />
              )}
              <div className="clubs-cover-actions">
                <label className="btn btn-soft btn-sm" style={{ cursor: 'pointer' }}>
                  <ImageIcon size={15} /> {uploadingCover ? 'Đang tải...' : settingsForm.coverUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    hidden
                    disabled={uploadingCover}
                    onChange={uploadSettingsCover}
                  />
                </label>
                {settingsForm.coverUrl && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSettingsForm((prev) => ({ ...prev, coverUrl: '' }))}
                  >
                    <X size={14} /> Bỏ ảnh
                  </button>
                )}
                <span className="tiny muted">PNG, JPG, WebP hoặc GIF · tối đa 10 MB</span>
              </div>
              <input
                className="input"
                style={{ marginTop: 10 }}
                maxLength={255}
                placeholder="Hoặc dán URL ảnh bìa..."
                value={settingsForm.coverUrl}
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, coverUrl: event.target.value }))}
              />
            </div>
          </div>
          <label
            className="row"
            style={{
              gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-soft)',
              border: '1px solid var(--border-color)', cursor: 'pointer', alignItems: 'flex-start',
            }}
          >
            <input
              type="checkbox"
              checked={settingsForm.privateClub}
              onChange={(event) => setSettingsForm((prev) => ({ ...prev, privateClub: event.target.checked }))}
              style={{ marginTop: 2 }}
            />
            <span>
              <span className="small strong">Nhóm riêng tư</span>
              <span className="tiny muted" style={{ display: 'block', marginTop: 2 }}>
                Bật để chỉ thành viên được duyệt mới xem được nội dung thảo luận. Dù công khai hay riêng tư,
                mọi thành viên mới đều cần chủ nhóm duyệt.
              </span>
            </span>
          </label>
          <div className="clubs-join-note">
            <ShieldCheck size={16} />
            <span>Yêu cầu tham gia mới sẽ được gửi tới chủ nhóm và các quản trị viên của nhóm.</span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
