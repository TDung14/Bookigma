import { avatarSrc } from '../lib/avatar';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Flame, Star, Trophy } from 'lucide-react';
import { useApp } from '../hooks/useStore';
import { Rating } from '../components/common/ui';
import { currency, duration } from '../lib/format';
import { fetchLeaderboard } from '../services/leaderboardApi';

const MEDALS = ['#f59e0b', '#94a3b8', '#b45309'];

export default function LeaderboardPage() {
  const { books } = useApp();
  const [metric, setMetric] = useState('rating');
  const [board, setBoard] = useState({ readers: [], buyers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then((data) => {
        if (cancelled) return;
        setBoard({ readers: data?.readers || [], buyers: data?.buyers || [] });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const topBooks = useMemo(() => {
    const sorters = {
      rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount,
      sold: (a, b) => b.sold - a.sold,
      revenue: (a, b) => b.sold * b.price - a.sold * a.price,
    };
    return [...books].filter((b) => b.status === 'active').sort(sorters[metric]).slice(0, 8);
  }, [books, metric]);

  const topReaders = board.readers;
  const topBuyers = board.buyers;

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
          {loading && <p className="small muted">Đang tải bảng xếp hạng...</p>}
          {!loading && topReaders.length === 0 && <p className="small muted">Chưa có dữ liệu đọc sách.</p>}
          {topReaders.map((u, i) => (
            <div key={u.userId} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', gap: 12 }}>
              <span
                className="strong"
                style={{ width: 26, textAlign: 'center', color: i < 3 ? MEDALS[i] : 'var(--text-sub)', fontSize: i < 3 ? 17 : 14 }}
              >
                {i + 1}
              </span>
              <img src={avatarSrc(u.avatarUrl)} alt="" className="avatar" style={{ width: 38, height: 38 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small strong truncate">{u.name}</div>
                <div className="tiny muted">{u.booksFinished} cuốn hoàn thành · {duration(u.secondsRead)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="row small strong" style={{ gap: 4, color: 'var(--accent-green)', justifyContent: 'flex-end' }}>
                  <Flame size={14} /> {u.streak} ngày
                </div>
                <div className="tiny muted">{u.points.toLocaleString('vi-VN')} điểm</div>
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
          {topBuyers.map((u, i) => (
            <div key={u.userId} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', gap: 12 }}>
              <span className="strong" style={{ width: 26, textAlign: 'center', color: i < 3 ? MEDALS[i] : 'var(--text-sub)' }}>{i + 1}</span>
              <img src={avatarSrc(u.avatarUrl)} alt="" className="avatar" style={{ width: 38, height: 38 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small strong truncate">{u.name}</div>
                <div className="tiny muted">{u.orderCount} đơn hàng</div>
              </div>
              <div className="small strong price">{currency(u.totalSpent)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
