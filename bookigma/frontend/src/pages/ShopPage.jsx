import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Store } from 'lucide-react';
import { useApp } from '../hooks/useStore';
import BookCard from '../components/book/BookCard';
import { EmptyState } from '../components/common/ui';

const SORTS = [
  { id: 'popular', label: 'Phổ biến' },
  { id: 'newest', label: 'Mới nhất' },
  { id: 'price-asc', label: 'Giá thấp → cao' },
  { id: 'price-desc', label: 'Giá cao → thấp' },
  { id: 'rating', label: 'Đánh giá cao' },
];

const PRICE_RANGES = [
  { id: 'all', label: 'Tất cả', test: () => true },
  { id: 'lt80', label: 'Dưới 80.000đ', test: (p) => p < 80000 },
  { id: '80-150', label: '80.000đ – 150.000đ', test: (p) => p >= 80000 && p <= 150000 },
  { id: 'gt150', label: 'Trên 150.000đ', test: (p) => p > 150000 },
];

export default function ShopPage() {
  const { books, categories, shops } = useApp();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState(params.get('q') || '');
  const [category, setCategory] = useState('all');
  const [shopId, setShopId] = useState('all');
  const [price, setPrice] = useState('all');
  const [sort, setSort] = useState('popular');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const range = PRICE_RANGES.find((r) => r.id === price);
    let list = books.filter((b) => b.status === 'active');

    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (category !== 'all') list = list.filter((b) => b.category === category);
    if (shopId !== 'all') list = list.filter((b) => b.shopId === shopId);
    list = list.filter((b) => range.test(b.price));

    const sorters = {
      popular: (a, b) => b.sold - a.sold,
      newest: (a, b) => b.id.localeCompare(a.id),
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
    };
    return [...list].sort(sorters[sort]);
  }, [books, query, category, shopId, price, sort]);

  const onSearch = (value) => {
    setQuery(value);
    if (value) setParams({ q: value }, { replace: true });
    else setParams({}, { replace: true });
  };

  return (
    <div className="main-layout">
      <div className="page-head row-between" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1>Bookigma Shop</h1>
          <p>Sách chính hãng từ các nhà xuất bản và nhà sách uy tín</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {shops.map((s) => (
            <button
              key={s.id}
              className={`btn btn-sm ${shopId === s.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setShopId(shopId === s.id ? 'all' : s.id)}
            >
              <Store size={14} /> {s.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,230px) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
        {/* Bộ lọc */}
        <aside className="card stack hide-lg" style={{ position: 'sticky', top: 76 }}>
          <div className="row" style={{ gap: 8 }}>
            <SlidersHorizontal size={17} color="var(--accent-green)" />
            <h4 style={{ margin: 0, fontSize: 15 }}>Bộ lọc</h4>
          </div>

          <div>
            <label className="label">Thể loại</label>
            <div className="stack" style={{ gap: 4 }}>
              <FilterRow active={category === 'all'} onClick={() => setCategory('all')}>Tất cả</FilterRow>
              {categories.map((c) => (
                <FilterRow key={c} active={category === c} onClick={() => setCategory(c)}>{c}</FilterRow>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Khoảng giá</label>
            <div className="stack" style={{ gap: 4 }}>
              {PRICE_RANGES.map((r) => (
                <FilterRow key={r.id} active={price === r.id} onClick={() => setPrice(r.id)}>{r.label}</FilterRow>
              ))}
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm btn-block"
            onClick={() => { setCategory('all'); setPrice('all'); setShopId('all'); onSearch(''); }}
          >
            Xóa toàn bộ bộ lọc
          </button>
        </aside>

        {/* Kết quả */}
        <div>
          <div className="card row" style={{ marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={17} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--text-sub)' }} />
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Tìm theo tên sách, tác giả, chủ đề..."
                value={query}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
            <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s.id} value={s.id}>Sắp xếp: {s.label}</option>)}
            </select>
            <span className="small muted">{results.length} sản phẩm</span>
          </div>

          {results.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Search}
                title="Không tìm thấy sách phù hợp"
                hint="Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
                action={<button className="btn btn-primary btn-sm" onClick={() => { setCategory('all'); setPrice('all'); setShopId('all'); onSearch(''); }}>Xóa bộ lọc</button>}
              />
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))' }}>
              {results.map((b) => <BookCard key={b.id} book={b} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterRow({ active, onClick, children }) {
  return (
    <button
      className="list-item small"
      onClick={onClick}
      style={{ padding: '6px 9px', color: active ? 'var(--accent-green)' : 'var(--text-main)', fontWeight: active ? 700 : 400 }}
    >
      {children}
    </button>
  );
}
