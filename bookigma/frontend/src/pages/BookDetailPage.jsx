import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen, ChevronLeft, Flag, Minus, MessageSquare, Plus, ShoppingCart,
  Store, Truck, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { currency } from '../lib/format';
import { Rating, ProgressBar } from '../components/common/ui';
import BookCard from '../components/book/BookCard';
import ReportModal from '../components/common/ReportModal';

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { bookById, shopById, books, addToCart, getProgress, findOrCreateConversation, userById, trackDaily } = useApp();

  const [qty, setQty] = useState(1);
  const [reporting, setReporting] = useState(false);

  const book = bookById(id);

  // Mở trang chi tiết một cuốn tính là một lượt "khám phá sách mới" cho nhiệm vụ hằng ngày.
  useEffect(() => {
    if (user && book) trackDaily(user.id, 'explore', 1);
  }, [user, book, trackDaily]);

  if (!book) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <h3>Không tìm thấy sách</h3>
          <Link to="/shop" className="btn btn-primary btn-sm">Quay lại cửa hàng</Link>
        </div>
      </div>
    );
  }

  const shop = shopById(book.shopId);
  const progress = user ? getProgress(user.id)[book.id] : null;
  const discount = book.originalPrice ? Math.round((1 - book.price / book.originalPrice) * 100) : 0;
  const related = books
    .filter((b) => b.id !== book.id && b.status === 'active' && (b.category === book.category || b.author === book.author))
    .slice(0, 5);

  const requireLogin = () => {
    if (!user) { navigate('/login'); return true; }
    return false;
  };

  const handleAddToCart = () => {
    if (requireLogin()) return;
    if (book.stock <= 0) return toast('Sản phẩm đã hết hàng.', 'error');
    addToCart(user.id, book.id, qty);
    toast(`Đã thêm ${qty} cuốn "${book.title}" vào giỏ.`);
  };

  const handleBuyNow = () => {
    if (requireLogin()) return;
    if (book.stock <= 0) return toast('Sản phẩm đã hết hàng.', 'error');
    addToCart(user.id, book.id, qty);
    navigate('/checkout');
  };

  const chatWithShop = () => {
    if (requireLogin()) return;
    const ownerId = shop?.ownerId;
    if (!ownerId || ownerId === user.id) return toast('Đây là shop của bạn.', 'info');
    const convId = findOrCreateConversation(user.id, ownerId);
    navigate(`/chat/${convId}`);
  };

  return (
    <div className="main-layout">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        <ChevronLeft size={16} /> Quay lại
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,330px) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
        {/* Ảnh + shop */}
        <div className="stack" style={{ position: 'sticky', top: 76 }}>
          <div className="card">
            <img src={book.cover} alt={book.title} className="book-cover" style={{ width: '100%', height: 380 }} />
          </div>

          <div className="card">
            <div className="row" style={{ marginBottom: 10 }}>
              <img src={shop?.avatar} alt="" className="avatar" style={{ width: 44, height: 44 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className="strong small truncate">{shop?.name}</span>
                  {shop?.verified && <ShieldCheck size={15} color="var(--accent-green)" />}
                </div>
                <div className="tiny muted">{(shop?.followers || 0).toLocaleString('vi-VN')} người theo dõi · {shop?.rating}★</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm btn-block" onClick={chatWithShop}>
              <MessageSquare size={15} /> Chat với shop
            </button>
          </div>

          <div className="card stack small" style={{ gap: 10 }}>
            <div className="row"><Truck size={17} color="var(--accent-green)" /> Giao hàng toàn quốc 2-4 ngày</div>
            <div className="row"><ShieldCheck size={17} color="var(--accent-green)" /> Đổi trả trong 7 ngày nếu lỗi in ấn</div>
            <div className="row"><Store size={17} color="var(--accent-green)" /> Sách chính hãng có tem NXB</div>
          </div>
        </div>

        {/* Thông tin */}
        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <span className="badge badge-green" style={{ marginBottom: 10 }}>{book.category}</span>
            <h1 style={{ margin: '0 0 6px', fontSize: 25, lineHeight: 1.3 }}>{book.title}</h1>
            <p className="muted small" style={{ margin: '0 0 12px' }}>Tác giả: <b style={{ color: 'var(--text-main)' }}>{book.author}</b> · {book.pages} trang</p>

            <div className="row" style={{ gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <Rating value={book.rating} count={book.ratingCount} size={17} />
              <span className="small muted">Đã bán {book.sold.toLocaleString('vi-VN')}</span>
              <span className={`badge ${book.stock > 20 ? 'badge-green' : book.stock > 0 ? 'badge-amber' : 'badge-red'}`}>
                {book.stock > 0 ? `Còn ${book.stock} cuốn` : 'Hết hàng'}
              </span>
            </div>

            <div className="row" style={{ gap: 12, background: 'var(--bg-soft)', padding: 16, borderRadius: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className="price" style={{ fontSize: 30 }}>{currency(book.price)}</span>
              {discount > 0 && (
                <>
                  <span className="muted" style={{ textDecoration: 'line-through' }}>{currency(book.originalPrice)}</span>
                  <span className="badge badge-red">-{discount}%</span>
                </>
              )}
            </div>

            {progress && (
              <div style={{ background: 'var(--accent-soft)', padding: 12, borderRadius: 10, marginBottom: 16 }}>
                <div className="row-between small" style={{ marginBottom: 6 }}>
                  <span className="strong" style={{ color: 'var(--text-primary)' }}>
                    {progress.finished ? 'Bạn đã đọc xong cuốn này' : `Bạn đang đọc — ${progress.percent}% hoàn thành`}
                  </span>
                  <Link to={`/read/${book.id}`} className="link small">{progress.finished ? 'Đọc lại' : 'Đọc tiếp'} →</Link>
                </div>
                <ProgressBar percent={progress.percent} />
              </div>
            )}

            <div className="row" style={{ gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <span className="small strong">Số lượng</span>
              <div className="row" style={{ gap: 0, border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                <button className="btn-icon" style={{ borderRadius: 0 }} onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm"><Minus size={15} /></button>
                <span style={{ minWidth: 42, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
                <button className="btn-icon" style={{ borderRadius: 0 }} onClick={() => setQty((q) => Math.min(book.stock || 1, q + 1))} aria-label="Tăng"><Plus size={15} /></button>
              </div>
            </div>

            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-lg" onClick={handleAddToCart} disabled={book.stock <= 0}>
                <ShoppingCart size={17} /> Thêm vào giỏ
              </button>
              <button className="btn btn-primary btn-lg" onClick={handleBuyNow} disabled={book.stock <= 0}>
                Mua ngay
              </button>
              {book.chapters?.length > 0 && (
                <Link to={`/read/${book.id}`} className="btn btn-soft btn-lg">
                  <BookOpen size={17} /> Đọc thử
                </Link>
              )}
              <button
                className="btn btn-ghost btn-lg"
                style={{ marginLeft: 'auto', color: 'var(--text-sub)' }}
                onClick={() => (user ? setReporting(true) : navigate('/login'))}
              >
                <Flag size={16} /> Báo cáo
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ margin: '0 0 10px', fontSize: 17 }}>Mô tả sản phẩm</h3>
            <p style={{ lineHeight: 1.7, margin: '0 0 14px' }}>{book.description}</p>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {(book.tags || []).map((t) => <span key={t} className="badge">#{t}</span>)}
            </div>
          </div>

          {related.length > 0 && (
            <div>
              <h3 className="row" style={{ gap: 8, fontSize: 17, marginBottom: 14 }}>
                <Sparkles size={18} color="var(--accent-green)" /> Có thể bạn cũng thích
              </h3>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {related.map((b) => <BookCard key={b.id} book={b} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      <ReportModal
        open={reporting}
        onClose={() => setReporting(false)}
        type="book"
        targetId={book.id}
        targetLabel={`${book.title} — ${userById(shop?.ownerId)?.name || shop?.name}`}
      />
    </div>
  );
}
