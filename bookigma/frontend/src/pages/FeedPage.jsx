import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Bookmark, Flag, Image as ImageIcon, MessageSquare, MoreHorizontal,
  Send, Share2, ThumbsUp, UserCheck, Users, Sparkles, TrendingUp, Gift, Zap,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { timeAgo, currency } from '../lib/format';
import { POINT_RULES } from '../lib/gamification';
import ReportModal from '../components/common/ReportModal';
import { ProgressBar } from '../components/common/ui';

const LEFT_MENU = [
  { icon: Users, label: 'Nhóm đọc sách', color: '#3b82f6', to: '/' },
  { icon: UserCheck, label: 'Bạn bè', color: '#10b981', to: '/chat' },
  { icon: Bookmark, label: 'Đã lưu', color: '#8b5cf6', to: '/library' },
  { icon: BookOpen, label: 'Tủ sách cá nhân', color: '#ef4444', to: '/library' },
  { icon: Zap, label: 'Nhiệm vụ & phần thưởng', color: '#f59e0b', to: '/rewards' },
  { icon: Gift, label: 'Blind Book', color: '#ec4899', to: '/blind-book' },
  { icon: TrendingUp, label: 'Bảng xếp hạng', color: '#0ea5e9', to: '/leaderboard' },
];

export default function FeedPage() {
  const { posts, userById, bookById, toggleLike, addComment, addPost, books, getProgress, earnPoints, trackDaily } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [draft, setDraft] = useState('');
  const [draftImage, setDraftImage] = useState('');
  const [draftBookId, setDraftBookId] = useState('');
  const [openComments, setOpenComments] = useState({});
  const [commentDraft, setCommentDraft] = useState({});
  const [reportTarget, setReportTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

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

  const submitPost = (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!draft.trim()) return toast('Hãy viết gì đó trước khi đăng nhé.', 'error');
    addPost({
      authorId: user.id,
      content: draft.trim(),
      image: draftImage.trim() || (draftBookId ? bookById(draftBookId)?.cover : null),
      bookId: draftBookId || null,
    });
    setDraft('');
    setDraftImage('');
    setDraftBookId('');
    earnPoints(user.id, POINT_RULES.createPost);
    trackDaily(user.id, 'social', 1);
    toast(`Đã đăng bài — nhận ${POINT_RULES.createPost} điểm Gigma.`);
  };

  const submitComment = (postId) => {
    const text = (commentDraft[postId] || '').trim();
    if (!text) return;
    addComment(postId, { authorId: user.id, text });
    setCommentDraft((d) => ({ ...d, [postId]: '' }));
    earnPoints(user.id, POINT_RULES.createComment);
    trackDaily(user.id, 'social', 1);
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
              <img src={user?.avatar} alt="" className="avatar" style={{ width: 40, height: 40 }} />
              <textarea
                className="textarea"
                style={{ minHeight: 52, borderRadius: 18 }}
                placeholder="Bạn đang đọc gì thế? Cùng chia sẻ cảm nhận nào..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>

            {(draftImage || draftBookId) && (
              <img
                src={draftImage || bookById(draftBookId)?.cover}
                alt=""
                style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10, marginTop: 12 }}
              />
            )}

            <div className="row-between" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <select className="select" style={{ width: 'auto', fontSize: 13, padding: '7px 10px' }} value={draftBookId} onChange={(e) => setDraftBookId(e.target.value)}>
                  <option value="">Gắn sách (tùy chọn)</option>
                  {books.filter((b) => b.status === 'active').map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-soft btn-sm"
                  onClick={() => {
                    const url = window.prompt('Dán link ảnh minh họa:');
                    if (url) setDraftImage(url);
                  }}
                >
                  <ImageIcon size={16} color="#22c55e" /> Ảnh
                </button>
              </div>
              <button type="submit" className="btn btn-primary btn-sm"><Send size={15} /> Đăng bài</button>
            </div>
          </form>

          {/* Danh sách bài đăng */}
          {visiblePosts.map((post) => {
            const author = userById(post.authorId);
            const book = post.bookId ? bookById(post.bookId) : null;
            const liked = user && post.likedBy.includes(user.id);
            const showComments = openComments[post.id];

            return (
              <article key={post.id} className="card">
                <div className="row-between" style={{ marginBottom: 12 }}>
                  <div className="row">
                    <img src={author?.avatar} alt="" className="avatar" style={{ width: 42, height: 42 }} />
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
                  <img src={post.image} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }} loading="lazy" />
                )}

                {book && (
                  <Link to={`/book/${book.id}`} className="row card-hover" style={{ gap: 12, background: 'var(--bg-soft)', padding: 10, borderRadius: 10, marginBottom: 12 }}>
                    <img src={book.cover} alt="" className="book-cover" style={{ width: 44, height: 60 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="small strong truncate">{book.title}</div>
                      <div className="tiny muted">{book.author}</div>
                      <div className="price small" style={{ marginTop: 3 }}>{currency(book.price)}</div>
                    </div>
                    <span className="btn btn-soft btn-sm">Xem sách</span>
                  </Link>
                )}

                <div className="row-between tiny muted" style={{ paddingBottom: 8 }}>
                  <span>{post.likedBy.length} lượt thích</span>
                  <span>{post.comments.length} bình luận</span>
                </div>

                <div className="row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, gap: 0 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, border: 'none', color: liked ? 'var(--accent-green)' : 'var(--text-sub)', fontWeight: liked ? 700 : 600 }}
                    onClick={() => (user ? toggleLike(post.id, user.id) : navigate('/login'))}
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
                      return (
                        <div key={c.id} className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                          <img src={cAuthor?.avatar} alt="" className="avatar" style={{ width: 30, height: 30 }} />
                          <div style={{ background: 'var(--bg-soft)', borderRadius: 12, padding: '8px 12px', flex: 1 }}>
                            <div className="tiny strong">{cAuthor?.name}</div>
                            <div className="small">{c.text}</div>
                            <div className="tiny muted" style={{ marginTop: 3 }}>{timeAgo(c.time)}</div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="row" style={{ gap: 8 }}>
                      <img src={user?.avatar} alt="" className="avatar" style={{ width: 30, height: 30 }} />
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
