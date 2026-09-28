import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, Clock, Flame, Package, ShoppingBag } from 'lucide-react';
import { useApp, useAuth } from '../hooks/useStore';
import { currency, dateOnly, duration, timeAgo } from '../lib/format';
import { ProgressBar, StatCard } from '../components/common/ui';

export default function ProfilePage() {
  const { user } = useAuth();
  const { orders, posts, getProgress, books } = useApp();

  const myOrders = useMemo(() => orders.filter((o) => o.userId === user.id), [orders, user.id]);
  const myPosts = useMemo(() => posts.filter((p) => p.authorId === user.id && !p.hidden), [posts, user.id]);
  const progress = getProgress(user.id);

  const entries = Object.values(progress)
    .map((p) => ({ ...p, book: books.find((b) => b.id === p.bookId) }))
    .filter((p) => p.book)
    .sort((a, b) => b.lastReadAt - a.lastReadAt);

  const spent = myOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const readSeconds = entries.reduce((s, e) => s + (e.secondsRead || 0), 0);

  return (
    <div className="main-layout" style={{ maxWidth: 1000 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
          <img src={user.avatar} alt="" className="avatar" style={{ width: 86, height: 86 }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 23 }}>{user.name}</h1>
            <p className="small muted" style={{ margin: '0 0 8px' }}>{user.email}</p>
            {user.bio && <p className="small" style={{ margin: '0 0 10px' }}>{user.bio}</p>}
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-green">{user.badge}</span>
              <span className="badge row" style={{ gap: 5 }}><Flame size={13} /> {user.points.toLocaleString('vi-VN')} điểm</span>
              <span className="badge row" style={{ gap: 5 }}><Calendar size={13} /> Tham gia {dateOnly(new Date(user.joinedAt).getTime())}</span>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/orders" className="btn btn-ghost btn-sm"><Package size={15} /> Đơn hàng</Link>
            <Link to="/library" className="btn btn-primary btn-sm"><BookOpen size={15} /> Tủ sách</Link>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        <StatCard icon={BookOpen} label="Sách trong tủ" value={entries.length} sub={`${entries.filter((e) => e.finished).length} cuốn đã xong`} />
        <StatCard icon={Clock} label="Thời gian đọc" value={duration(readSeconds)} color="var(--purple)" bg="var(--purple-soft)" />
        <StatCard icon={ShoppingBag} label="Đã chi tiêu" value={currency(spent)} sub={`${myOrders.length} đơn hàng`} color="var(--info)" bg="var(--info-soft)" />
        <StatCard icon={Flame} label="Bài viết" value={myPosts.length} sub={`${myPosts.reduce((s, p) => s + p.likedBy.length, 0)} lượt thích`} color="var(--warning)" bg="var(--warning-soft)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="card">
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Đang đọc gần đây</h3>
          {entries.length === 0 && <p className="small muted">Chưa có cuốn nào trong tủ sách.</p>}
          {entries.slice(0, 5).map((e) => (
            <Link key={e.bookId} to={`/read/${e.bookId}`} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', gap: 12, alignItems: 'flex-start' }}>
              <img src={e.book.cover} alt="" className="book-cover" style={{ width: 40, height: 55 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small strong truncate">{e.book.title}</div>
                <div className="tiny muted" style={{ margin: '3px 0 6px' }}>{e.percent}% · {timeAgo(e.lastReadAt)}</div>
                <ProgressBar percent={e.percent} height={4} />
              </div>
            </Link>
          ))}
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Bài viết của tôi</h3>
          {myPosts.length === 0 && <p className="small muted">Bạn chưa đăng bài viết nào.</p>}
          {myPosts.slice(0, 5).map((p) => (
            <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
              <p className="small clamp-2" style={{ margin: '0 0 6px' }}>{p.content}</p>
              <div className="row tiny muted" style={{ gap: 14 }}>
                <span>{timeAgo(p.time)}</span>
                <span>{p.likedBy.length} thích</span>
                <span>{p.comments.length} bình luận</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
