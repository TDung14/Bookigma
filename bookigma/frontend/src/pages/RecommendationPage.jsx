import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Bot, Gauge, Send, Sparkles, Tag, TrendingUp, User as UserIcon,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { askAssistant, getRecommendations, SUGGESTED_QUESTIONS } from '../lib/recommend';
import { currency } from '../lib/format';
import { Rating } from '../components/common/ui';

const REASON_ICON = { category: BookOpen, author: UserIcon, tag: Tag, trending: TrendingUp };

export default function RecommendationPage() {
  const { books, orders, posts, getProgress, addToCart, getCart } = useApp();
  const { user } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Chào bạn! Mình là trợ lý sách của Bookigma. Bạn muốn tìm cuốn nào hôm nay?', books: [] },
  ]);
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const chatRef = useRef(null);

  const ctx = useMemo(
    () => ({
      books,
      progress: user ? getProgress(user.id) : {},
      orders,
      cart: user ? getCart(user.id) : [],
      posts,
      userId: user?.id,
    }),
    [books, orders, posts, user, getProgress, getCart]
  );

  const rec = useMemo(() => getRecommendations(ctx, 8), [ctx]);

  const ask = (text) => {
    const q = (text || question).trim();
    if (!q) return;
    setMessages((m) => [...m, { from: 'me', text: q }]);
    setQuestion('');
    setThinking(true);

    // Độ trễ ngắn để mô phỏng thời gian suy nghĩ; logic trả lời nằm ở lib/recommend.js.
    setTimeout(() => {
      const answer = askAssistant(q, ctx);
      setMessages((m) => [...m, { from: 'bot', text: answer.text, books: answer.books }]);
      setThinking(false);
      requestAnimationFrame(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
      });
    }, 700);
  };

  return (
    <div className="main-layout">
      {/* Banner */}
      <div
        className="card"
        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #065f46 100%)', color: '#fff', border: 'none', marginBottom: 20 }}
      >
        <div className="row" style={{ gap: 10, marginBottom: 8 }}>
          <Sparkles size={24} />
          <h1 style={{ margin: 0, color: '#fff', fontSize: 23 }}>Đề xuất dành riêng cho bạn</h1>
        </div>
        <p style={{ margin: 0, opacity: .92, maxWidth: 720, lineHeight: 1.6 }}>
          {rec.hasHistory ? (
            <>
              Trợ lý đã phân tích <b>{rec.profile.signals.length} tín hiệu</b> từ thói quen đọc, lịch sử mua và
              các bài viết bạn đã thích. Thể loại bạn gắn bó nhất là <b>{rec.topCategory}</b>
              {rec.topAuthor && <> và tác giả bạn đọc nhiều nhất là <b>{rec.topAuthor}</b></>}.
            </>
          ) : (
            <>Bạn chưa có lịch sử đọc nên trợ lý đang gợi ý theo những cuốn được cộng đồng đánh giá cao nhất. Hãy đọc hoặc mua vài cuốn để gợi ý chính xác hơn.</>
          )}
        </p>
        {rec.topTags.length > 0 && (
          <div className="row" style={{ gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {rec.topTags.map((t) => (
              <span key={t} className="badge" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>#{t}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)', gap: 20, alignItems: 'start' }}>
        {/* Danh sách gợi ý */}
        <div className="stack">
          {rec.items.map(({ book, score, reasons }) => (
            <div key={book.id} className="card card-hover row" style={{ alignItems: 'flex-start', gap: 16 }}>
              <Link to={`/book/${book.id}`}>
                <img src={book.cover} alt="" className="book-cover" style={{ width: 96, height: 132 }} />
              </Link>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-between" style={{ gap: 10, marginBottom: 4 }}>
                  <Link to={`/book/${book.id}`}>
                    <h3 style={{ margin: 0, fontSize: 17 }}>{book.title}</h3>
                  </Link>
                  <span
                    className="badge row"
                    style={{ background: 'var(--accent-soft)', color: 'var(--text-primary)', gap: 4, flexShrink: 0 }}
                    title="Mức độ phù hợp do bộ máy gợi ý tính toán"
                  >
                    <Gauge size={13} /> {score}% hợp gu
                  </span>
                </div>

                <div className="row" style={{ gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span className="small muted">{book.author}</span>
                  <Rating value={book.rating} size={14} />
                  <span className="badge">{book.category}</span>
                </div>

                <p className="small muted clamp-2" style={{ margin: '0 0 12px', lineHeight: 1.55 }}>{book.description}</p>

                <div className="stack" style={{ gap: 6, marginBottom: 14, background: 'var(--bg-soft)', padding: 10, borderRadius: 9 }}>
                  <span className="tiny strong muted" style={{ textTransform: 'uppercase', letterSpacing: .4 }}>Vì sao gợi ý cuốn này</span>
                  {reasons.map((r, i) => {
                    const Icon = REASON_ICON[r.icon] || Sparkles;
                    return (
                      <div key={i} className="row tiny" style={{ gap: 7, alignItems: 'flex-start' }}>
                        <Icon size={13} color="var(--accent-green)" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span>{r.text}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <span className="price" style={{ fontSize: 18 }}>{currency(book.price)}</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      if (!user) return toast('Hãy đăng nhập để thêm vào giỏ.', 'error');
                      addToCart(user.id, book.id, 1);
                      toast(`Đã thêm "${book.title}" vào giỏ hàng.`);
                    }}
                  >
                    Thêm vào giỏ
                  </button>
                  {book.chapters?.length > 0 && (
                    <Link to={`/read/${book.id}`} className="btn btn-ghost btn-sm">
                      <BookOpen size={15} /> Đọc thử
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trợ lý hỏi đáp */}
        <div className="card" style={{ position: 'sticky', top: 76, padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', minHeight: 440 }}>
          <div className="row" style={{ padding: 14, borderBottom: '1px solid var(--border-color)' }}>
            <div className="stat-icon" style={{ background: 'var(--accent-soft)' }}>
              <Bot size={19} color="var(--accent-green)" />
            </div>
            <div>
              <div className="strong small">Trợ lý sách Bookigma</div>
              <div className="tiny muted">Hỏi bất cứ điều gì về sách</div>
            </div>
          </div>

          <div ref={chatRef} className="scroll-y" style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'me' ? 'flex-end' : 'flex-start', gap: 8 }}>
                <div className={`bubble ${m.from === 'me' ? 'bubble-me' : 'bubble-them'}`} style={{ maxWidth: '88%' }}>
                  {m.text}
                </div>
                {m.books?.length > 0 && (
                  <div className="stack" style={{ gap: 6, width: '100%' }}>
                    {m.books.map((b) => (
                      <Link key={b.id} to={`/book/${b.id}`} className="row card-hover" style={{ gap: 10, background: 'var(--bg-soft)', padding: 8, borderRadius: 9 }}>
                        <img src={b.cover} alt="" className="book-cover" style={{ width: 34, height: 46 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="tiny strong truncate">{b.title}</div>
                          <div className="tiny muted truncate">{b.author}</div>
                          <div className="tiny price">{currency(b.price)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="bubble bubble-them typing row" style={{ gap: 4, width: 'fit-content' }}>
                <span /><span /><span />
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid var(--border-color)' }}>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
                <button key={q} className="badge" style={{ cursor: 'pointer', border: '1px solid var(--border-color)' }} onClick={() => ask(q)}>
                  {q}
                </button>
              ))}
            </div>
            <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); ask(); }}>
              <input
                className="input"
                style={{ borderRadius: 20 }}
                placeholder="Hỏi trợ lý về sách..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 20 }} disabled={!question.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
