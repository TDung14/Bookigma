import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, Flame, Library, Target } from 'lucide-react';
import { useApp, useAuth } from '../hooks/useStore';
import { duration, timeAgo } from '../lib/format';
import { EmptyState, ProgressBar, StatCard } from '../components/common/ui';

const TABS = [
  { id: 'reading', label: 'Đang đọc' },
  { id: 'finished', label: 'Đã đọc xong' },
  { id: 'all', label: 'Tất cả' },
];

export default function LibraryPage() {
  const { getProgress, books, orders } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState('reading');

  const progress = getProgress(user.id);

  const entries = useMemo(
    () =>
      Object.values(progress)
        .map((p) => ({ ...p, book: books.find((b) => b.id === p.bookId) }))
        .filter((p) => p.book)
        .sort((a, b) => b.lastReadAt - a.lastReadAt),
    [progress, books]
  );

  // Sách đã mua nhưng chưa bắt đầu đọc — gợi ý người dùng mở lên đọc.
  const notStarted = useMemo(() => {
    const boughtIds = new Set(
      orders
        .filter((o) => o.userId === user.id && o.status !== 'cancelled')
        .flatMap((o) => o.items.map((i) => i.bookId))
    );
    return [...boughtIds].filter((id) => !progress[id]).map((id) => books.find((b) => b.id === id)).filter(Boolean);
  }, [orders, user.id, progress, books]);

  const filtered = entries.filter((e) =>
    tab === 'all' ? true : tab === 'finished' ? e.finished : !e.finished
  );

  const totalSeconds = entries.reduce((s, e) => s + (e.secondsRead || 0), 0);
  const finishedCount = entries.filter((e) => e.finished).length;
  const avgPercent = entries.length
    ? Math.round(entries.reduce((s, e) => s + e.percent, 0) / entries.length)
    : 0;

  return (
    <div className="main-layout">
      <div className="page-head">
        <h1>Tủ sách & tiến trình đọc</h1>
        <p>Bookigma ghi nhớ vị trí đọc của bạn ở từng cuốn — mở lại là đọc tiếp ngay chỗ đang dở</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        <StatCard icon={Library} label="Sách trong tủ" value={entries.length} sub={`${notStarted.length} cuốn chưa mở`} />
        <StatCard icon={CheckCircle2} label="Đã đọc xong" value={finishedCount} sub="Tính cả sách đọc lại" color="var(--info)" bg="var(--info-soft)" />
        <StatCard icon={Clock} label="Thời gian đọc" value={duration(totalSeconds)} sub="Tổng cộng" color="var(--purple)" bg="var(--purple-soft)" />
        <StatCard icon={Target} label="Tiến độ trung bình" value={`${avgPercent}%`} sub="Trên toàn bộ tủ sách" color="var(--warning)" bg="var(--warning-soft)" />
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BookOpen}
            title={tab === 'finished' ? 'Bạn chưa đọc xong cuốn nào' : 'Chưa có cuốn nào đang đọc dở'}
            hint="Mở một cuốn sách bất kỳ, Bookigma sẽ tự động lưu vị trí bạn đang đọc."
            action={<Link to="/shop" className="btn btn-primary">Khám phá sách</Link>}
          />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filtered.map((e) => (
            <div key={e.bookId} className="card card-hover row" style={{ alignItems: 'flex-start', gap: 14 }}>
              <Link to={`/book/${e.bookId}`}>
                <img src={e.book.cover} alt="" className="book-cover" style={{ width: 76, height: 104 }} />
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-between" style={{ gap: 8, marginBottom: 2 }}>
                  <Link to={`/book/${e.bookId}`} className="strong small clamp-2">{e.book.title}</Link>
                  {e.finished && <span className="badge badge-green">Xong</span>}
                </div>
                <p className="tiny muted" style={{ margin: '0 0 8px' }}>{e.book.author}</p>

                <div className="row-between tiny" style={{ marginBottom: 5 }}>
                  <span className="muted">
                    {e.book.chapters?.[e.chapterIndex]?.title?.split(':')[0] || `Chương ${e.chapterIndex + 1}`}
                  </span>
                  <span className="strong" style={{ color: 'var(--accent-green)' }}>{e.percent}%</span>
                </div>
                <ProgressBar percent={e.percent} />

                <div className="row-between" style={{ marginTop: 10, gap: 8 }}>
                  <span className="tiny muted row" style={{ gap: 4 }}>
                    <Flame size={13} /> {timeAgo(e.lastReadAt)}
                  </span>
                  <Link to={`/read/${e.bookId}`} className="btn btn-primary btn-sm">
                    {e.finished ? 'Đọc lại' : 'Đọc tiếp'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {notStarted.length > 0 && (
        <>
          <h3 style={{ fontSize: 17, margin: '28px 0 14px' }}>Sách đã mua nhưng chưa mở</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {notStarted.map((b) => (
              <Link key={b.id} to={`/read/${b.id}`} className="card card-hover" style={{ padding: 12 }}>
                <img src={b.cover} alt="" className="book-cover" style={{ width: '100%', height: 160 }} />
                <div className="small strong clamp-2" style={{ margin: '10px 0 4px' }}>{b.title}</div>
                <div className="tiny muted">Bắt đầu đọc →</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
