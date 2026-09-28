import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Store } from 'lucide-react';
import { currency } from '../../lib/format';
import { Rating } from '../common/ui';
import { useApp, useAuth, useToast } from '../../hooks/useStore';

export default function BookCard({ book, footer }) {
  const { addToCart, shopById } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const shop = shopById(book.shopId);
  const discount = book.originalPrice ? Math.round((1 - book.price / book.originalPrice) * 100) : 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate('/login');
    if (book.stock <= 0) return toast('Sản phẩm đã hết hàng.', 'error');
    addToCart(user.id, book.id, 1);
    toast(`Đã thêm "${book.title}" vào giỏ hàng.`);
  };

  return (
    <Link to={`/book/${book.id}`} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', padding: 12 }}>
      <div style={{ position: 'relative' }}>
        <img src={book.cover} alt={book.title} className="book-cover" style={{ width: '100%', height: 190 }} loading="lazy" />
        {discount > 0 && (
          <span className="badge badge-red" style={{ position: 'absolute', top: 8, left: 8 }}>-{discount}%</span>
        )}
        {book.stock <= 0 && (
          <span className="badge" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.65)', color: '#fff' }}>
            Hết hàng
          </span>
        )}
      </div>

      <h4 className="clamp-2" style={{ margin: '10px 0 4px', fontSize: 15, lineHeight: 1.35, minHeight: 40 }}>
        {book.title}
      </h4>
      <p className="tiny muted truncate" style={{ margin: 0 }}>{book.author}</p>

      <div className="row" style={{ margin: '8px 0', gap: 10 }}>
        <Rating value={book.rating} size={14} />
        <span className="tiny muted">Đã bán {book.sold.toLocaleString('vi-VN')}</span>
      </div>

      <div className="row tiny muted truncate" style={{ gap: 5, marginBottom: 10 }}>
        <Store size={13} /> {shop?.name || 'Bookigma'}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <span className="price" style={{ fontSize: 17 }}>{currency(book.price)}</span>
          {book.originalPrice > book.price && (
            <span className="tiny muted" style={{ textDecoration: 'line-through' }}>{currency(book.originalPrice)}</span>
          )}
        </div>
        {footer ?? (
          <button className="btn btn-primary btn-sm btn-block" onClick={handleAdd} disabled={book.stock <= 0}>
            <ShoppingCart size={15} /> Thêm vào giỏ
          </button>
        )}
      </div>
    </Link>
  );
}
