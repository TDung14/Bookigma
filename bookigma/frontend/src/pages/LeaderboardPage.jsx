import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Flame, Star, Trophy } from 'lucide-react';
import { useApp } from '../hooks/useStore';
import { Rating } from '../components/common/ui';
import { currency } from '../lib/format';

const MEDALS = ['#f59e0b', '#94a3b8', '#b45309'];

export default function LeaderboardPage() {
  const { books, users, orders } = useApp();
  const [metric, setMetric] = useState('rating');

  const topBooks = useMemo(() => {
    const sorters = {
      rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount,
      sold: (a, b) => b.sold - a.sold,
      revenue: (a, b) => b.sold * b.price - a.sold * a.price,
    };
    return [...books].filter((b) => b.status === 'active').sort(sorters[metric]).slice(0, 8);
  }, [books, metric]);

  const topReaders = useMemo(
    () => users.filter((u) => u.role === 'user').sort((a, b) => b.points - a.points).slice(0, 8),
    [users]
  );

  const topBuyers = useMemo(() => {
    const spend = {};
    orders
      .filter((o) => o.status !== 'cancelled')
      .forEach((o) => { spend[o.userId] = (spend[o.userId] || 0) + o.total; });
    return Object.entries(spend)
      .map(([id, total]) => ({ user: users.find((u) => u.id === id), total }))
      .filter((x) => x.user)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [orders, users]);

  return (
    <div className="main-layout">
      <div className="page-head">
        <h1>Bảng xếp hạng</h1>
        <p>Những cuốn sách và độc giả nổi bật nhất cộng đồng Bookigma</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {/* Sách */}
        <div className="card">
          <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h3 className="row" style={{ margin: 0, fontSize: 16, gap: 8 }}>
              <Trophy size={19} color="#f59e0b" /> Top sách
            </h3>
            <select className="select" style={{ width: 'auto', fontSize: 13, padding: '5px 9px' }} value={metric} onChange={(e) => setMetric(e.target.value)}>
              <option value="rating">Theo đánh giá</option>
              <option value="sold">Theo lượt bán</option>
              <option value="revenue">Theo doanh thu</option>
            </select>
          </div>

          {topBooks.map((b, i) => (
            <Link key={b.id} to={`/book/${b.id}`} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', gap: 12 }}>
              <span
                className="strong"
                style={{ width: 26, textAlign: 'center', color: i < 3 ? MEDALS[i] : 'var(--text-sub)', fontSize: i < 3 ? 17 : 14 }}
              >
                {i + 1}
              </span>
              <img src={b.cover} alt="" className="book-cover" style={{ width: 38, height: 52 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small strong truncate">{b.title}</div>
                <div className="tiny muted truncate">{b.author}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {metric === 'rating' && <Rating value={b.rating} size={13} />}
                {metric === 'sold' && <div className="small strong">{b.sold.toLocaleString('vi-VN')}</div>}
                {metric === 'revenue' && <div className="small strong price">{currency(b.sold * b.price)}</div>}
                <div className="tiny muted">
                  {metric === 'rating' ? `${b.ratingCount.toLocaleString('vi-VN')} đánh giá` : metric === 'sold' ? 'lượt bán' : 'doanh thu'}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Độc giả */}
        <div className="card">
          <h3 className="row" style={{ margin: '0 0 14px', fontSize: 16, gap: 8 }}>
            <Award size={19} color="#3b82f6" /> Top độc giả tích cực
          </h3>
          {topReaders.map((u, i) => (
            <div key={u.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', gap: 12 }}>
              <span
                className="strong"
                style={{ width: 26, textAlign: 'center', color: i < 3 ? MEDALS[i] : 'var(--text-sub)', fontSize: i < 3 ? 17 : 14 }}
              >
                {i + 1}
              </span>
              <img src={u.avatar} alt="" className="avatar" style={{ width: 38, height: 38 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small strong truncate">{u.name}</div>
                <div className="tiny muted">{u.booksRead} cuốn đã đọc</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="row small strong" style={{ gap: 4, color: 'var(--accent-green)' }}>
                  <Flame size={14} /> {u.points.toLocaleString('vi-VN')}
                </div>
                <div className="tiny muted">{u.badge}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Người mua */}
        <div className="card">
          <h3 className="row" style={{ margin: '0 0 14px', fontSize: 16, gap: 8 }}>
            <Star size={19} color="var(--purple)" /> Khách hàng thân thiết
          </h3>
          {topBuyers.length === 0 && <p className="small muted">Chưa có dữ liệu mua hàng.</p>}
          {topBuyers.map(({ user: u, total }, i) => (
            <div key={u.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', gap: 12 }}>
              <span className="strong" style={{ width: 26, textAlign: 'center', color: i < 3 ? MEDALS[i] : 'var(--text-sub)' }}>{i + 1}</span>
              <img src={u.avatar} alt="" className="avatar" style={{ width: 38, height: 38 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small strong truncate">{u.name}</div>
                <div className="tiny muted">{u.badge}</div>
              </div>
              <div className="small strong price">{currency(total)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
