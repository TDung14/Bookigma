import { avatarSrc, mediaSrc } from '../lib/avatar';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Bookmark, Flag, Image as ImageIcon, X, MessageSquare, MoreHorizontal,
  Send, Share2, ThumbsUp, UserCheck, Users, Sparkles, TrendingUp, Gift, Zap,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { timeAgo, currency } from '../lib/format';
import { POINT_RULES } from '../lib/gamification';
import { uploadPostImage } from '../services/api';
import ReportModal from '../components/common/ReportModal';
import { ProgressBar } from '../components/common/ui';

const LEFT_MENU = [
  { icon: Users, label: 'Nhóm đọc sách', color: '#3b82f6', to: '/' },
  { icon: UserCheck, label: 'Bạn bè', color: '#10b981', to: '/friends' },
  { icon: Bookmark, label: 'Đã lưu', color: '#8b5cf6', to: '/library' },
  { icon: BookOpen, label: 'Tủ sách cá nhân', color: '#ef4444', to: '/library' },
  { icon: Zap, label: 'Nhiệm vụ & phần thưởng', color: '#f59e0b', to: '/rewards' },
  { icon: Gift, label: 'Blind Book', color: '#ec4899', to: '/blind-book' },
  { icon: TrendingUp, label: 'Bảng xếp hạng', color: '#0ea5e9', to: '/leaderboard' },
];

export default function FeedPage() {
  const { posts, userById, toggleLike, addComment, addPost, books, getProgress, trackDaily } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [draft, setDraft] = useState('');
  const [draftImage, setDraftImage] = useState(null);
  const [draftBookId, setDraftBookId] = useState('');
  const [draftImagePreview, setDraftImagePreview] = useState('');
  const [imageInputKey, setImageInputKey] = useState(0);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [commentDraft, setCommentDraft] = useState({});
  const [reportTarget, setReportTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    if (!draftImage) {
      setDraftImagePreview('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(draftImage);
    setDraftImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [draftImage]);

  const visiblePosts = useMemo(() => posts.filter((p) => !p.hidden), [posts]);
  const continueReading = useMemo(
    () =>
      Object.values(user ? getProgress(user.id) : {})
        .filter((p) => !p.finished && p.percent > 0)
        .sort((a, b) => b.lastReadAt - a.lastReadAt)
        .slice(0, 2)
        .map((p) => ({ ...p, book: books.find((b) => b.id === p.bookId) }))
        .filter((p) => p.book),
    [user, getProgress, books]
  );

  const submitPost = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!draft.trim()) return toast('Hãy viết gì đó trước khi đăng nhé.', 'error');
    try {
      setPosting(true);
      let imageUrl = null;
      if (draftImage) {
        const uploaded = await uploadPostImage(draftImage, user.id);
        imageUrl = uploaded.imageUrl;
      }
      await addPost({
        authorId: user.id,
        content: draft.trim(),
        image: imageUrl,
        bookId: draftBookId || null,
      });
    } catch (error) {
      return toast(error.message || 'Không thể đăng bài.', 'error');
    } finally {
      setPosting(false);
    }
    setDraft('');
    setDraftImage(null);
    setDraftBookId('');
    setImageInputKey((key) => key + 1);
    trackDaily(user.id, 'social', 1);
    toast(`Đã đăng bài — nhận ${POINT_RULES.createPost} điểm Bookigma.`);
  };

  const submitComment = async (postId) => {
    if (!user) return navigate('/login');
    const text = (commentDraft[postId] || '').trim();
    if (!text) return;
    try {
      await addComment(postId, { text });
      setCommentDraft((d) => ({ ...d, [postId]: '' }));
      trackDaily(user.id, 'social', 1);
    } catch (error) {
      toast(error.message || 'Không thể gửi bình luận.', 'error');
    }
  };

  return (
    <div className="main-layout">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,230px) minmax(0,1fr) minmax(0,300px)', gap: 20, alignItems: 'start' }}>
        {/* ---------- Cột trái ---------- */}
        <aside className="stack hide-lg" style={{ position: 'sticky', top: 76 }}>
          <div className="card card-tight">
            <h4 className="tiny muted" style={{ margin: '4px 0 8px 8px', textTransform: 'uppercase', letterSpacing: .5 }}>Khám phá</h4>
            {LEFT_MENU.map(({ icon: Icon, label, color, to }) => (
              <Link key={label} to={to} className="list-item small">
                <Icon size={18} color={color} /> {label}
              </Link>
            ))}
          </div>

          {continueReading.length > 0 && (
            <div className="card card-tight">
              <h4 className="tiny muted" style={{ margin: '4px 0 10px 8px', textTransform: 'uppercase', letterSpacing: .5 }}>Đọc tiếp</h4>
              {continueReading.map((p) => (
                <Link key={p.bookId} to={`/read/${p.bookId}`} className="list-item" style={{ alignItems: 'flex-start' }}>
                  <img src={p.book.cover} alt="" className="book-cover" style={{ width: 34, height: 46 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small strong clamp-2" style={{ lineHeight: 1.3 }}>{p.book.title}</div>
                    <div className="tiny muted" style={{ margin: '3px 0 5px' }}>{p.percent}% hoàn thành</div>
                    <ProgressBar percent={p.percent} height={4} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>

        {/* ---------- Cột giữa: bảng tin ---------- */}
        <div className="stack" style={{ gap: 18 }}>
          {/* Soạn bài */}
          <form className="card" onSubmit={submitPost}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <img src={avatarSrc(user?.avatar)} alt="" className="avatar" style={{ width: 40, height: 40 }} />
              <textarea
                className="textarea"
                style={{ minHeight: 52, borderRadius: 18 }}
                placeholder="Bạn đang đọc gì thế? Cùng chia sẻ cảm nhận nào..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>

            {draftImage && (
              <div style={{ position: 'relative', marginTop: 12 }}>
                <img
                  src={draftImagePreview}
                  alt="Ảnh xem trước bài viết"
                  style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 10 }}
                />
                <button type="button" className="btn-icon" aria-label="Bỏ ảnh"
                  onClick={() => { setDraftImage(null); setImageInputKey((key) => key + 1); }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'var(--bg-card)' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="row-between" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <select
                  className="select"
                  style={{ width: 'auto', maxWidth: 220, fontSize: 13, padding: '7px 10px' }}
                  value={draftBookId}
                  onChange={(event) => setDraftBookId(event.target.value)}
                  aria-label="Gắn sách vào bài viết"
                >
                  <option value="">Gắn sách (tùy chọn)</option>
                  {books.filter((book) => book.status === 'active').map((book) => (
                    <option key={book.id} value={book.id}>{book.title}</option>
                  ))}
                </select>
                <label className="btn btn-soft btn-sm" style={{ cursor: 'pointer' }}>
                  <ImageIcon size={16} color="#22c55e" /> {draftImage ? 'Đổi ảnh' : 'Tải ảnh lên'}
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
              <button type="submit" disabled={posting} className="btn btn-primary btn-sm">
                <Send size={15} /> {posting ? 'Đang đăng...' : 'Đăng bài'}
              </button>
            </div>
          </form>

          {/* Danh sách bài đăng */}
          {visiblePosts.map((post) => {
            const localAuthor = userById(post.authorId);
            // Tên/avatar từ backend là nguồn chính; không để seed/localStorage ghi đè tên thật.
            const author = {
              id: post.authorId,
              name: post.authorName || post.username || localAuthor?.name || 'Người dùng',
              avatar: post.avatarUrl || localAuthor?.avatar || '/default-avatar.svg',
              role: localAuthor?.role || 'user',
            };
            const liked = user && post.likedByMe;
            const showComments = openComments[post.id];

            return (
              <article key={post.id} className="card">
                <div className="row-between" style={{ marginBottom: 12 }}>
                  <div className="row">
                    <img src={avatarSrc(author?.avatar)} alt="" className="avatar" style={{ width: 42, height: 42 }} />
                    <div>
                      <div className="row" style={{ gap: 6 }}>
                        <h4 style={{ margin: 0, fontSize: 15 }}>{author?.name}</h4>
                        {author?.role === 'shop' && <span className="badge badge-blue">Đối tác</span>}
                      </div>
                      <span className="tiny muted">{timeAgo(post.time)}</span>
                    </div>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <button className="btn-icon" onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)} aria-label="Tùy chọn bài viết">
                      <MoreHorizontal size={18} />
                    </button>
                    {menuOpen === post.id && (
                      <div className="card" style={{ position: 'absolute', right: 0, top: 36, width: 190, padding: 6, zIndex: 900, boxShadow: 'var(--shadow-lg)' }}>
                        <button
                          className="list-item small"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => {
                            setMenuOpen(null);
                            if (!user) return navigate('/login');
                            setReportTarget({ type: 'post', targetId: post.id, targetLabel: `Bài đăng của ${author?.name}` });
                          }}
                        >
                          <Flag size={15} /> Báo cáo bài viết
                        </button>
                        <button className="list-item small" onClick={() => { setMenuOpen(null); toast('Đã lưu bài viết vào mục Đã lưu.'); }}>
                          <Bookmark size={15} /> Lưu bài viết
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ lineHeight: 1.6, margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{post.content}</p>

                {post.image && (
                  <img src={mediaSrc(post.image)} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }} loading="lazy" />
                )}

                {post.bookId && (() => {
                  const attachedBook = books.find((book) => String(book.id) === String(post.bookId));
                  if (!attachedBook) return null;
                  return (
                    <Link
                      to={attachedBook.forSale === false ? `/read/${attachedBook.id}` : `/book/${attachedBook.id}`}
                      className="row card-hover"
                      style={{ gap: 12, background: 'var(--bg-soft)', padding: 10, borderRadius: 10, marginBottom: 12 }}
                    >
                      <img src={attachedBook.cover} alt="" className="book-cover" style={{ width: 44, height: 60 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="small strong truncate">{attachedBook.title}</div>
                        <div className="tiny muted">{attachedBook.author}</div>
                        <div className="price small" style={{ marginTop: 3 }}>{currency(attachedBook.price)}</div>
                      </div>
                      <span className="btn btn-soft btn-sm">Xem sách</span>
                    </Link>
                  );
                })()}

                <div className="row-between tiny muted" style={{ paddingBottom: 8 }}>
                  <span>{post.likeCount ?? post.likedBy.length} lượt thích</span>
                  <span>{post.comments.length} bình luận</span>
                </div>

                <div className="row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, gap: 0 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, border: 'none', color: liked ? 'var(--accent-green)' : 'var(--text-sub)', fontWeight: liked ? 700 : 600 }}
                    onClick={async () => {
                      if (!user) return navigate('/login');
                      try { await toggleLike(post.id); } catch (error) { toast(error.message || 'Không thể cập nhật lượt thích.', 'error'); }
                    }}
                  >
                    <ThumbsUp size={17} fill={liked ? 'currentColor' : 'none'} /> Thích
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, border: 'none', color: 'var(--text-sub)' }}
                    onClick={() => setOpenComments((o) => ({ ...o, [post.id]: !o[post.id] }))}
                  >
                    <MessageSquare size={17} /> Bình luận
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, border: 'none', color: 'var(--text-sub)' }}
                    onClick={() => toast('Đã sao chép liên kết bài viết.')}
                  >
                    <Share2 size={17} /> Chia sẻ
                  </button>
                </div>

                {showComments && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }} className="stack">
                    {post.comments.map((c) => {
                      const cAuthor = userById(c.authorId);
                      const commentName = c.authorName || cAuthor?.name || c.username || 'Người dùng';
                      const commentAvatar = c.avatarUrl || cAuthor?.avatar || '/default-avatar.svg';
                      return (
                        <div key={c.id} className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                          <img src={avatarSrc(commentAvatar)} alt="" className="avatar" style={{ width: 30, height: 30 }} />
                          <div style={{ background: 'var(--bg-soft)', borderRadius: 12, padding: '8px 12px', flex: 1 }}>
                            <div className="tiny strong">{commentName}</div>
                            <div className="small">{c.text}</div>
                            <div className="tiny muted" style={{ marginTop: 3 }}>{timeAgo(c.time)}</div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="row" style={{ gap: 8 }}>
                      <img src={avatarSrc(user?.avatar)} alt="" className="avatar" style={{ width: 30, height: 30 }} />
                      <input
                        className="input"
                        style={{ borderRadius: 18, height: 36 }}
                        placeholder="Viết bình luận..."
                        value={commentDraft[post.id] || ''}
                        onChange={(e) => setCommentDraft((d) => ({ ...d, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                      />
                      <button className="btn-icon" onClick={() => submitComment(post.id)} aria-label="Gửi bình luận">
                        <Send size={17} color="var(--accent-green)" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* ---------- Cột phải ---------- */}
        <aside className="stack hide-lg" style={{ position: 'sticky', top: 76 }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none' }}>
            <div className="row" style={{ gap: 8, marginBottom: 6 }}>
              <Sparkles size={18} />
              <h4 style={{ margin: 0, color: '#fff', fontSize: 15 }}>Gợi ý từ AI</h4>
            </div>
            <p className="small" style={{ margin: '0 0 12px', opacity: .92, lineHeight: 1.5 }}>
              Trợ lý đã phân tích thói quen đọc của bạn và chọn ra những cuốn phù hợp nhất.
            </p>
            <Link to="/recommend" className="btn btn-sm" style={{ background: '#fff', color: 'var(--accent-hover)' }}>
              Xem gợi ý cho tôi
            </Link>
          </div>

          <Link to="/blind-book" className="card card-hover" style={{ display: 'block' }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 30 }}>🎁</span>
              <div style={{ minWidth: 0 }}>
                <h4 style={{ margin: '0 0 3px', fontSize: 15 }}>Blind Book</h4>
                <p className="tiny muted" style={{ margin: 0, lineHeight: 1.45 }}>
                  Hộp sách bí ẩn chọn theo tâm trạng. Chỉ biết sách gì khi mở hộp.
                </p>
              </div>
            </div>
          </Link>

          <div className="card card-tight">
            <h4 className="tiny muted" style={{ margin: '4px 0 10px 8px', textTransform: 'uppercase', letterSpacing: .5 }}>Sách nổi bật</h4>
            {books.filter((b) => b.status === 'active').slice(0, 4).map((b) => (
              <Link key={b.id} to={`/book/${b.id}`} className="list-item">
                <img src={b.cover} alt="" className="book-cover" style={{ width: 32, height: 44 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="small truncate strong">{b.title}</div>
                  <div className="tiny price">{currency(b.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <ReportModal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        type={reportTarget?.type}
        targetId={reportTarget?.targetId}
        targetLabel={reportTarget?.targetLabel}
      />
    </div>
  );
}
