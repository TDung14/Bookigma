import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, MapPin, MessageSquare, Plus, RefreshCw, Search } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import Modal from '../components/common/Modal';
import ReportModal from '../components/common/ReportModal';
import { EmptyState, Field } from '../components/common/ui';

const CITIES = ['Tất cả', 'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];

export default function ExchangePage() {
  const { exchanges, userById, addExchange, findOrCreateConversation, pushNotification } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Tất cả');
  const [showForm, setShowForm] = useState(false);
  const [offerTarget, setOfferTarget] = useState(null);
  const [offerText, setOfferText] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  const [form, setForm] = useState({ bookTitle: '', wanted: '', condition: 'Mới 95%', location: 'Hà Nội', note: '', cover: '' });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exchanges.filter(
      (e) =>
        (city === 'Tất cả' || e.location === city) &&
        (!q || e.bookTitle.toLowerCase().includes(q) || e.wanted.toLowerCase().includes(q))
    );
  }, [exchanges, query, city]);

  const submitListing = () => {
    if (!form.bookTitle.trim() || !form.wanted.trim()) {
      return toast('Hãy điền tên sách và cuốn bạn muốn đổi.', 'error');
    }
    addExchange({
      ...form,
      ownerId: user.id,
      cover: form.cover.trim() || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
    });
    setForm({ bookTitle: '', wanted: '', condition: 'Mới 95%', location: 'Hà Nội', note: '', cover: '' });
    setShowForm(false);
    toast('Đã đăng tin trao đổi lên sàn.');
  };

  const sendOffer = () => {
    const owner = offerTarget.ownerId;
    const convId = findOrCreateConversation(user.id, owner);
    pushNotification(owner, `${user.name} muốn trao đổi cuốn "${offerTarget.bookTitle}" với bạn.`, `/chat/${convId}`);
    toast('Đã gửi đề nghị. Cuộc trò chuyện đã được mở.');
    setOfferTarget(null);
    setOfferText('');
    navigate(`/chat/${convId}`);
  };

  return (
    <div className="main-layout">
      <div className="page-head row-between" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1>Sàn trao đổi sách</h1>
          <p>Sẻ chia tri thức, kết nối đam mê — hoàn toàn miễn phí</p>
        </div>
        <button className="btn btn-primary" onClick={() => (user ? setShowForm(true) : navigate('/login'))}>
          <Plus size={17} /> Đăng tin trao đổi
        </button>
      </div>

      <div className="card row" style={{ marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={17} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--text-sub)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Tìm sách muốn đổi hoặc sách bạn đang tìm..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="select" style={{ width: 'auto' }} value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => <option key={c} value={c}>Khu vực: {c}</option>)}
        </select>
        <span className="small muted">{filtered.length} tin đăng</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={RefreshCw}
            title="Chưa có tin trao đổi nào phù hợp"
            hint="Thử đổi khu vực hoặc là người đầu tiên đăng tin ở đây."
            action={<button className="btn btn-primary" onClick={() => setShowForm(true)}>Đăng tin trao đổi</button>}
          />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filtered.map((item) => {
            const owner = userById(item.ownerId);
            const mine = owner?.id === user?.id;
            return (
              <div key={item.id} className="card card-hover">
                <div className="row" style={{ alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <img src={item.cover} alt="" className="book-cover" style={{ width: 70, height: 96 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="badge badge-green" style={{ marginBottom: 6 }}>{item.condition}</span>
                    <h3 className="clamp-2" style={{ margin: '0 0 4px', fontSize: 16 }}>{item.bookTitle}</h3>
                    <div className="row tiny muted" style={{ gap: 6 }}>
                      <img src={owner?.avatar} alt="" className="avatar" style={{ width: 18, height: 18 }} />
                      {owner?.name}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-soft)', padding: 10, borderRadius: 9, marginBottom: 10 }}>
                  <div className="tiny muted">Muốn đổi lấy</div>
                  <div className="small strong">{item.wanted}</div>
                </div>

                {item.note && <p className="tiny muted clamp-2" style={{ margin: '0 0 10px' }}>{item.note}</p>}

                <div className="row-between" style={{ marginBottom: 12 }}>
                  <span className="row tiny muted" style={{ gap: 4 }}><MapPin size={13} /> {item.location}</span>
                  <button
                    className="btn-icon"
                    style={{ padding: 4 }}
                    onClick={() => (user ? setReportTarget(item) : navigate('/login'))}
                    aria-label="Báo cáo tin đăng"
                  >
                    <Flag size={15} />
                  </button>
                </div>

                {mine ? (
                  <button className="btn btn-soft btn-block" disabled>Tin đăng của bạn</button>
                ) : (
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => (user ? setOfferTarget(item) : navigate('/login'))}>
                      <RefreshCw size={15} /> Gửi đề nghị
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => (user ? navigate(`/chat/${findOrCreateConversation(user.id, item.ownerId)}`) : navigate('/login'))}
                      aria-label="Nhắn tin"
                    >
                      <MessageSquare size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Đăng tin */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Đăng tin trao đổi sách"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={submitListing}>Đăng tin</button>
          </>
        }
      >
        <Field label="Tên cuốn sách bạn có">
          {(id) => <input id={id} className="input" value={form.bookTitle} onChange={(e) => setForm({ ...form, bookTitle: e.target.value })} placeholder="Ví dụ: Nhà Giả Kim" />}
        </Field>
        <Field label="Bạn muốn đổi lấy cuốn nào?">
          {(id) => <input id={id} className="input" value={form.wanted} onChange={(e) => setForm({ ...form, wanted: e.target.value })} placeholder="Ví dụ: Sapiens hoặc sách kỹ năng bất kỳ" />}
        </Field>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
          <Field label="Tình trạng">
            {(id) => (
              <select id={id} className="select" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {['Mới 99%', 'Mới 95%', 'Mới 90%', 'Mới 80%', 'Đã cũ'].map((c) => <option key={c}>{c}</option>)}
              </select>
            )}
          </Field>
          <Field label="Khu vực">
            {(id) => (
              <select id={id} className="select" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                {CITIES.filter((c) => c !== 'Tất cả').map((c) => <option key={c}>{c}</option>)}
              </select>
            )}
          </Field>
        </div>
        <Field label="Link ảnh bìa (không bắt buộc)">
          {(id) => <input id={id} className="input" value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} placeholder="https://..." />}
        </Field>
        <Field label="Mô tả thêm" style={{ marginBottom: 0 }}>
          {(id) => <textarea id={id} className="textarea" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Sách còn nguyên bìa, không gấp trang..." />}
        </Field>
      </Modal>

      {/* Gửi đề nghị */}
      <Modal
        open={!!offerTarget}
        onClose={() => setOfferTarget(null)}
        title="Gửi đề nghị trao đổi"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOfferTarget(null)}>Hủy</button>
            <button className="btn btn-primary" onClick={sendOffer}>Gửi đề nghị</button>
          </>
        }
      >
        <p className="small" style={{ marginTop: 0 }}>
          Bạn muốn đổi lấy <b>{offerTarget?.bookTitle}</b> của <b>{userById(offerTarget?.ownerId)?.name}</b>.
          Chủ sách đang tìm: <b>{offerTarget?.wanted}</b>.
        </p>
        <Field label="Lời nhắn kèm theo" style={{ marginBottom: 0 }}>
          {(id) => (
            <textarea
              id={id}
              className="textarea"
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              placeholder="Chào bạn, mình có cuốn ... còn mới 95%, bạn xem có hợp không nhé!"
            />
          )}
        </Field>
      </Modal>

      <ReportModal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        type="exchange"
        targetId={reportTarget?.id}
        targetLabel={`Tin trao đổi "${reportTarget?.bookTitle}"`}
      />
    </div>
  );
}
