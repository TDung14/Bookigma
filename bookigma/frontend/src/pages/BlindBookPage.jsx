import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronLeft, Gift, HelpCircle, Package, ShoppingCart, Sparkles,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { BOX_TIERS, MOODS, boxHints, pickBook } from '../lib/blindbook';
import { currency } from '../lib/format';

/**
 * Luồng đặt hộp Blind Book: chọn tâm trạng → chọn mức hộp → xem hộp đã ghép.
 * Tên sách bên trong được giấu tới khi đơn hàng giao xong (mở ở trang chi tiết đơn).
 */
export default function BlindBookPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { books, addBlindBox, getProgress, orders } = useApp();

  const [step, setStep] = useState(1);
  const [moodId, setMoodId] = useState(null);
  const [tierId, setTierId] = useState(null);
  // Giữ cố định một số ngẫu nhiên để hộp không đổi mỗi lần component render lại.
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));

  /** Không ghép lại cuốn người dùng đã đọc hoặc đã mua — hộp phải luôn là sách mới với họ. */
  const excludeIds = useMemo(() => {
    if (!user) return [];
    const read = Object.keys(getProgress(user.id));
    const bought = orders
      .filter((o) => o.userId === user.id && o.status !== 'cancelled')
      .flatMap((o) => o.items.map((i) => i.bookId));
    return [...new Set([...read, ...bought])];
  }, [user, getProgress, orders]);

  const mood = MOODS.find((m) => m.id === moodId);
  const tier = BOX_TIERS.find((t) => t.id === tierId);

  const matched = useMemo(
    () => (moodId && tierId ? pickBook(books, moodId, tierId, excludeIds, seed) : null),
    [books, moodId, tierId, excludeIds, seed]
  );

  const addToCart = () => {
    if (!user) return navigate('/login');
    if (!matched) return toast('Hiện chưa ghép được sách phù hợp, thử tâm trạng khác nhé.', 'error');
    addBlindBox(user.id, matched.id, {
      moodId, moodLabel: mood.label, tierId, tierName: tier.name, price: tier.price,
    });
    toast(`Đã thêm ${tier.name} vào giỏ. Nội dung bên trong vẫn là bí mật!`);
    navigate('/cart');
  };

  return (
    <div className="main-layout" style={{ maxWidth: 1080 }}>
      <div className="page-head">
        <h1 className="row" style={{ gap: 9 }}><Gift size={24} color="var(--accent-green)" /> Blind Book</h1>
        <p>Hộp sách bí ẩn được chọn riêng theo tâm trạng của bạn — chỉ biết sách gì khi mở hộp</p>
      </div>

      {/* Các bước */}
      <div className="card row" style={{ marginBottom: 20, gap: 0, padding: '14px 16px' }}>
        {['Chọn tâm trạng', 'Chọn hộp', 'Xác nhận'].map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={label} className="row" style={{ flex: 1, gap: 9, minWidth: 0 }}>
              <span
                style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  background: done || active ? 'var(--accent-green)' : 'var(--bg-soft)',
                  color: done || active ? '#fff' : 'var(--text-sub)',
                }}
              >
                {done ? <Check size={15} /> : n}
              </span>
              <span className="small truncate" style={{ fontWeight: active ? 700 : 400, color: active ? 'var(--text-main)' : 'var(--text-sub)' }}>
                {label}
              </span>
              {i < 2 && <div style={{ flex: 1, height: 2, background: step > n ? 'var(--accent-green)' : 'var(--border-color)', minWidth: 12 }} />}
            </div>
          );
        })}
      </div>

      {/* Bước 1 — tâm trạng */}
      {step === 1 && (
        <>
          <h3 style={{ fontSize: 17, marginTop: 0 }}>Hôm nay bạn đang cần điều gì?</h3>
          <p className="small muted" style={{ marginTop: 0 }}>
            Chúng tôi chọn sách theo cảm xúc bạn đang tìm kiếm, không phải theo danh sách bán chạy.
          </p>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {MOODS.map((m) => (
              <button
                key={m.id}
                className="card card-hover"
                onClick={() => { setMoodId(m.id); setStep(2); }}
                style={{
                  textAlign: 'left', cursor: 'pointer',
                  borderColor: moodId === m.id ? 'var(--accent-green)' : 'var(--border-color)',
                  borderWidth: moodId === m.id ? 2 : 1,
                }}
              >
                <div style={{ fontSize: 34, marginBottom: 8 }}>{m.emoji}</div>
                <h4 style={{ margin: '0 0 5px', fontSize: 16 }}>{m.label}</h4>
                <p className="small muted" style={{ margin: 0, lineHeight: 1.55 }}>{m.desc}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Bước 2 — mức hộp */}
      {step === 2 && (
        <>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={() => setStep(1)}>
            <ChevronLeft size={15} /> Đổi tâm trạng
          </button>
          <h3 style={{ fontSize: 17, marginTop: 0 }}>
            Chọn mức hộp cho tâm trạng <span style={{ color: 'var(--accent-green)' }}>{mood.emoji} {mood.label}</span>
          </h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))' }}>
            {BOX_TIERS.map((t) => (
              <button
                key={t.id}
                className="card card-hover"
                onClick={() => { setTierId(t.id); setStep(3); }}
                style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ fontSize: 34, marginBottom: 8 }}>{t.emoji}</div>
                <h4 style={{ margin: '0 0 4px', fontSize: 17 }}>{t.name}</h4>
                <div className="price" style={{ fontSize: 22, marginBottom: 10 }}>{currency(t.price)}</div>
                <p className="small muted" style={{ margin: '0 0 12px' }}>{t.desc}</p>
                <ul className="small" style={{ margin: 0, paddingLeft: 0, listStyle: 'none', flex: 1 }}>
                  {t.perks.map((perk) => (
                    <li key={perk} className="row" style={{ gap: 7, marginBottom: 6, alignItems: 'flex-start' }}>
                      <Check size={14} color="var(--accent-green)" style={{ marginTop: 3, flexShrink: 0 }} />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <span className="btn btn-primary btn-sm btn-block" style={{ marginTop: 14 }}>Chọn hộp này</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Bước 3 — hộp đã ghép */}
      {step === 3 && (
        <>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={() => setStep(2)}>
            <ChevronLeft size={15} /> Đổi mức hộp
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,340px)', gap: 20, alignItems: 'start' }}>
            <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <div style={{ fontSize: 88, marginBottom: 10 }}>{tier.emoji}</div>
              <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>{tier.name} đã sẵn sàng</h2>
              <p className="muted small" style={{ margin: '0 0 20px' }}>
                Chúng tôi đã chọn được một cuốn hợp với tâm trạng <b>{mood.label}</b> của bạn.
              </p>

              {matched ? (
                <>
                  <div style={{ background: 'var(--bg-soft)', borderRadius: 12, padding: 18, textAlign: 'left', maxWidth: 440, margin: '0 auto' }}>
                    <div className="row" style={{ gap: 7, marginBottom: 12 }}>
                      <HelpCircle size={17} color="var(--accent-green)" />
                      <span className="small strong">Manh mối về cuốn sách bên trong</span>
                    </div>
                    <ul className="small" style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                      {boxHints(matched).map((h) => (
                        <li key={h} className="row" style={{ gap: 8, marginBottom: 9, alignItems: 'flex-start' }}>
                          <Sparkles size={13} color="var(--accent-green)" style={{ marginTop: 3, flexShrink: 0 }} />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="tiny muted" style={{ margin: '16px 0 0' }}>
                    Tên sách sẽ chỉ hiện ra sau khi đơn hàng được giao và bạn bấm "Mở hộp".
                  </p>

                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 14 }}
                    onClick={() => { setSeed((x) => x + 1); toast('Đã ghép lại một cuốn khác cho bạn.', 'info'); }}
                  >
                    Đổi cuốn khác
                  </button>
                </>
              ) : (
                <div className="badge badge-amber" style={{ padding: '10px 14px' }}>
                  Kho hiện chưa có cuốn nào khớp tâm trạng này mà bạn chưa đọc. Thử tâm trạng khác nhé.
                </div>
              )}
            </div>

            <div className="card stack" style={{ position: 'sticky', top: 76 }}>
              <h4 style={{ margin: 0, fontSize: 16 }}>Tóm tắt đơn</h4>
              <hr className="divider" style={{ margin: 0 }} />
              <div className="row-between small"><span className="muted">Tâm trạng</span><span className="strong">{mood.emoji} {mood.label}</span></div>
              <div className="row-between small"><span className="muted">Loại hộp</span><span className="strong">{tier.name}</span></div>
              <div className="row-between small"><span className="muted">Nội dung</span><span className="strong">1 cuốn + phụ kiện</span></div>
              <hr className="divider" style={{ margin: 0 }} />
              <div className="row-between">
                <span className="strong">Giá hộp</span>
                <span className="price" style={{ fontSize: 22 }}>{currency(tier.price)}</span>
              </div>
              <button className="btn btn-primary btn-lg btn-block" onClick={addToCart} disabled={!matched}>
                <ShoppingCart size={17} /> Thêm vào giỏ hàng
              </button>
              <p className="tiny muted" style={{ margin: 0, textAlign: 'center' }}>
                Hộp được gói kín, kèm thiệp viết tay. Không hoàn trả vì lý do "đã đọc cuốn này rồi".
              </p>
            </div>
          </div>
        </>
      )}

      {/* Giới thiệu */}
      <div className="card" style={{ marginTop: 24, background: 'var(--bg-soft)' }}>
        <h4 className="row" style={{ margin: '0 0 10px', fontSize: 15, gap: 8 }}>
          <Package size={17} color="var(--accent-green)" /> Blind Book hoạt động thế nào?
        </h4>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
          {[
            ['1. Bạn chọn cảm xúc', 'Không chọn tên sách, chỉ chọn thứ bạn đang cần: động lực, một câu chuyện buồn, hay điều gì đó lạ.'],
            ['2. Hệ thống ghép sách', 'Thuật toán đối chiếu thể loại, từ khoá và đánh giá, đồng thời loại bỏ những cuốn bạn đã đọc hoặc đã mua.'],
            ['3. Nhận và mở hộp', 'Hộp được gói kín. Tên sách chỉ lộ ra khi bạn bấm "Mở hộp" ở trang đơn hàng.'],
          ].map(([title, body]) => (
            <div key={title}>
              <div className="small strong" style={{ marginBottom: 5 }}>{title}</div>
              <p className="tiny muted" style={{ margin: 0, lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
