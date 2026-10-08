import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check, Flag, Inbox, Mail, MapPin, MessageSquare, Plus, RefreshCw, Search, Send, Trash2, X,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import Modal from '../components/common/Modal';
import ReportModal from '../components/common/ReportModal';
import { EmptyState, Field } from '../components/common/ui';
import { LISTING_STATUS, OFFER_STATUS, timeAgo } from '../lib/format';

const CITIES = ['Tất cả', 'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
const CONDITIONS = ['Mới 99%', 'Mới 95%', 'Mới 90%', 'Mới 80%', 'Đã cũ'];
const EMPTY_FORM = { bookTitle: '', wanted: '', condition: 'Mới 95%', location: 'Hà Nội', note: '', coverUrl: '' };

/**
 * Sàn trao đổi sách cũ: đăng tin "có cuốn X, muốn đổi lấy Y", gửi đề nghị,
 * chủ tin chấp nhận / từ chối. Khi hai bên đồng ý, mỗi bên thấy email của nhau để hẹn trao đổi.
 */
export default function ExchangePage() {
  const {
    exchanges, myExchanges, sentOffers, refreshExchanges, addExchange, sendExchangeOffer,
    respondExchangeOffer, setExchangeStatus, deleteExchange, findOrCreateConversation,
  } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = user && ['mine', 'sent'].includes(params.get('tab')) ? params.get('tab') : 'all';

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Tất cả');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [offerTarget, setOfferTarget] = useState(null);
  const [offerForm, setOfferForm] = useState({ offeredBook: '', message: '' });
  const [reportTarget, setReportTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  // Tải lại mỗi khi mở trang
  useEffect(() => {
    refreshExchanges();
  }, [refreshExchanges]);

  const openListings = useMemo(
    () => exchanges.filter((e) => e.status === 'open').sort((a, b) => b.createdAt - a.createdAt),
    [exchanges]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return openListings.filter(
      (e) =>
        (city === 'Tất cả' || e.location === city) &&
        (!q || e.bookTitle.toLowerCase().includes(q) || e.wanted.toLowerCase().includes(q))
    );
  }, [openListings, query, city]);

  const pendingReceived = myExchanges.reduce((sum, listing) => sum + listing.pendingOffers, 0);

  const switchTab = (next) => setParams(next === 'all' ? {} : { tab: next }, { replace: true });

  /** Chạy một thao tác gọi API, báo lỗi bằng toast. Trả về false nếu thất bại. */
  const run = async (action, message, type) => {
    setBusy(true);
    try {
      await action();
      if (message) toast(message, type);
      return true;
    } catch (error) {
      toast(error.message || 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openForm = () => (user ? setShowForm(true) : navigate('/login'));

  const submitListing = async () => {
    if (!form.bookTitle.trim() || !form.wanted.trim()) {
      return toast('Hãy điền tên sách và cuốn bạn muốn đổi.', 'error');
    }
    const ok = await run(() => addExchange({
      ...form,
      bookTitle: form.bookTitle.trim(),
      wanted: form.wanted.trim(),
      coverUrl: form.coverUrl.trim() || null,
      note: form.note.trim() || null,
    }), 'Đã đăng tin trao đổi lên sàn.');
    if (ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
    }
  };

  const openOffer = (item) => {
    if (!user) return navigate('/login');
    setOfferTarget(item);
    setOfferForm({ offeredBook: '', message: '' });
  };

  const goToPayment = () => {
    if (!user) return navigate('/login');
    navigate('/payment');
  };

  const sendOffer = async () => {
    if (!offerForm.offeredBook.trim()) return toast('Hãy cho biết cuốn sách bạn mang ra đổi.', 'error');
    const ok = await run(() => sendExchangeOffer(offerTarget.id, {
      offeredBook: offerForm.offeredBook.trim(),
      message: offerForm.message.trim() || null,
    }), 'Đã gửi đề nghị. Chủ tin sẽ nhận được thông báo.');
    if (ok) setOfferTarget(null);
  };

  const accept = (listing, offer) => {
    const others = listing.offers.filter((o) => o.status === 'pending' && o.id !== offer.id).length;
    const warning = others ? ` ${others} đề nghị còn lại sẽ tự động bị từ chối.` : '';
    if (!window.confirm(`Đồng ý đổi "${listing.bookTitle}" lấy "${offer.offeredBook}" của ${offer.sender?.name}?${warning}`)) return;
    run(() => respondExchangeOffer(offer.id, 'accept'), 'Đã chốt trao đổi! Liên hệ với người đổi qua email bên dưới.');
  };

  const chatWith = async (otherId) => {
    if (!user) return navigate('/login');
    const convId = await findOrCreateConversation(user.id, otherId);
    navigate(`/chat/${convId}`);
  };

  return (
    <div className="main-layout">
      <div className="page-head row-between" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1>Sàn trao đổi sách</h1>
          <p>Sẻ chia tri thức, kết nối đam mê — hoàn toàn miễn phí</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={openForm}>
            <Plus size={17} /> Đăng tin trao đổi
          </button>
          <button className="btn btn-ghost" onClick={goToPayment}>
            Thanh toán nhanh
          </button>
        </div>
      </div>

      {user && (
        <div className="tabs" style={{ marginBottom: 18 }}>
          <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => switchTab('all')}>
            Tất cả tin ({openListings.length})
          </button>
          <button className={`tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => switchTab('mine')}>
            Tin của tôi ({myExchanges.length})
            {pendingReceived > 0 && <span className="badge badge-red" style={{ marginLeft: 6 }}>{pendingReceived}</span>}
          </button>
          <button className={`tab ${tab === 'sent' ? 'active' : ''}`} onClick={() => switchTab('sent')}>
            Đề nghị đã gửi ({sentOffers.length})
          </button>
        </div>
      )}

      {/* ---------- Tất cả tin ---------- */}
      {tab === 'all' && (
        <>
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
                action={<button className="btn btn-primary" onClick={openForm}>Đăng tin trao đổi</button>}
              />
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {filtered.map((item) => {
                const mine = user && item.ownerId === user.id;
                return (
                  <div key={item.id} className="card card-hover">
                    <div className="row" style={{ alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <img src={item.cover} alt="" className="book-cover" style={{ width: 70, height: 96 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="badge badge-green" style={{ marginBottom: 6 }}>{item.condition}</span>
                        <h3 className="clamp-2" style={{ margin: '0 0 4px', fontSize: 16 }}>{item.bookTitle}</h3>
                        <div className="row tiny muted" style={{ gap: 6 }}>
                          <img src={item.owner?.avatar} alt="" className="avatar" style={{ width: 18, height: 18 }} />
                          <span className="truncate">{item.owner?.name} · {timeAgo(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-soft)', padding: 10, borderRadius: 9, marginBottom: 10 }}>
                      <div className="tiny muted">Muốn đổi lấy</div>
                      <div className="small strong">{item.wanted}</div>
                    </div>

                    {item.note && <p className="tiny muted clamp-2" style={{ margin: '0 0 10px' }}>{item.note}</p>}

                    <div className="row-between" style={{ marginBottom: 12 }}>
                      <span className="row tiny muted" style={{ gap: 4 }}>
                        <MapPin size={13} /> {item.location}
                        {item.pendingOffers > 0 && ` · ${item.pendingOffers} đề nghị đang chờ`}
                      </span>
                      {!mine && (
                        <button
                          className="btn-icon"
                          style={{ padding: 4 }}
                          onClick={() => (user ? setReportTarget(item) : navigate('/login'))}
                          aria-label="Báo cáo tin đăng"
                        >
                          <Flag size={15} />
                        </button>
                      )}
                    </div>

                    {mine ? (
                      <button className="btn btn-soft btn-block" onClick={() => switchTab('mine')}>
                        Tin của bạn — xem đề nghị
                      </button>
                    ) : item.myOfferStatus === 'pending' ? (
                      <button className="btn btn-soft btn-block" onClick={() => switchTab('sent')}>
                        Đã gửi đề nghị — đang chờ phản hồi
                      </button>
                    ) : (
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => openOffer(item)}>
                          <RefreshCw size={15} /> Gửi đề nghị
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => chatWith(item.ownerId)}
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
        </>
      )}

      {/* ---------- Tin của tôi ---------- */}
      {tab === 'mine' && (
        myExchanges.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Inbox}
              title="Bạn chưa đăng tin trao đổi nào"
              hint="Đăng cuốn sách bạn đã đọc xong để đổi lấy cuốn bạn đang tìm."
              action={<button className="btn btn-primary" onClick={openForm}>Đăng tin trao đổi</button>}
            />
          </div>
        ) : (
          <div className="stack">
            {myExchanges.map((listing) => {
              const st = LISTING_STATUS[listing.status];
              return (
                <div key={listing.id} className="card">
                  <div className="row" style={{ alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <img src={listing.cover} alt="" className="book-cover" style={{ width: 56, height: 76 }} />
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <h3 style={{ margin: 0, fontSize: 16 }}>{listing.bookTitle}</h3>
                        <span className={`badge ${st.badge}`}>{st.label}</span>
                      </div>
                      <div className="tiny muted">
                        Muốn đổi lấy: <b style={{ color: 'var(--text-main)' }}>{listing.wanted}</b> · {listing.condition} · {listing.location} · {timeAgo(listing.createdAt)}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      {listing.status === 'open' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm('Đóng tin này? Các đề nghị đang chờ sẽ bị từ chối.')) return;
                            run(() => setExchangeStatus(listing.id, 'closed'), 'Đã đóng tin.', 'info');
                          }}
                        >
                          Đóng tin
                        </button>
                      )}
                      {listing.status === 'closed' && (
                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(() => setExchangeStatus(listing.id, 'open'), 'Đã mở lại tin.')}>
                          Mở lại
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--danger)' }}
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm(`Xóa tin "${listing.bookTitle}"?`)) return;
                          run(() => deleteExchange(listing.id), 'Đã xóa tin.', 'info');
                        }}
                        aria-label="Xóa tin"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <hr className="divider" />
                  <div className="small strong" style={{ marginBottom: 4 }}>Đề nghị nhận được ({listing.offers.length})</div>
                  {listing.offers.length === 0 && <p className="tiny muted" style={{ margin: 0 }}>Chưa có ai gửi đề nghị cho tin này.</p>}
                  {listing.offers.map((offer) => {
                    const ost = OFFER_STATUS[offer.status];
                    return (
                      <div key={offer.id} className="row" style={{ alignItems: 'flex-start', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                        <img src={offer.sender?.avatar} alt="" className="avatar" style={{ width: 34, height: 34 }} />
                        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                            <span className="small strong">{offer.sender?.name}</span>
                            <span className={`badge ${ost.badge}`}>{ost.label}</span>
                            <span className="tiny muted">{timeAgo(offer.createdAt)}</span>
                          </div>
                          <div className="small">Muốn đổi bằng: <b>{offer.offeredBook}</b></div>
                          {offer.message && <div className="tiny muted" style={{ marginTop: 2 }}>“{offer.message}”</div>}
                          {offer.status === 'accepted' && offer.contactEmail && (
                            <div className="badge badge-green" style={{ marginTop: 6 }}>
                              <Mail size={12} /> Liên hệ: {offer.contactEmail}
                            </div>
                          )}
                        </div>
                        <div className="row" style={{ gap: 6 }}>
                          {offer.status === 'pending' && listing.status === 'open' && (
                            <>
                              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => accept(listing, offer)}>
                                <Check size={14} /> Đồng ý
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                disabled={busy}
                                onClick={() => run(() => respondExchangeOffer(offer.id, 'reject'), 'Đã từ chối đề nghị.', 'info')}
                              >
                                <X size={14} /> Từ chối
                              </button>
                            </>
                          )}
                          {offer.sender && (
                            <button className="btn-icon" onClick={() => chatWith(offer.sender.id)} aria-label="Nhắn tin">
                              <MessageSquare size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ---------- Đề nghị đã gửi ---------- */}
      {tab === 'sent' && (
        sentOffers.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Send}
              title="Bạn chưa gửi đề nghị trao đổi nào"
              hint="Tìm một cuốn bạn thích ở tab Tất cả tin rồi bấm Gửi đề nghị."
              action={<button className="btn btn-primary" onClick={() => switchTab('all')}>Xem các tin trao đổi</button>}
            />
          </div>
        ) : (
          <div className="stack">
            {sentOffers.map((offer) => {
              const ost = OFFER_STATUS[offer.status];
              return (
                <div key={offer.id} className="card row" style={{ alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <img src={offer.listingCover} alt="" className="book-cover" style={{ width: 56, height: 76 }} />
                  <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <h4 style={{ margin: 0, fontSize: 15 }}>{offer.listingTitle}</h4>
                      <span className={`badge ${ost.badge}`}>{ost.label}</span>
                    </div>
                    <div className="tiny muted" style={{ marginBottom: 4 }}>Chủ tin: {offer.owner?.name} · gửi {timeAgo(offer.createdAt)}</div>
                    <div className="small">Bạn đề nghị đổi bằng: <b>{offer.offeredBook}</b></div>
                    {offer.message && <div className="tiny muted" style={{ marginTop: 2 }}>“{offer.message}”</div>}
                    {offer.status === 'accepted' && (
                      <div className="badge badge-green" style={{ marginTop: 6 }}>
                        <Mail size={12} /> Chủ tin đã đồng ý! Liên hệ: {offer.contactEmail}
                      </div>
                    )}
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    {offer.status === 'pending' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => run(() => respondExchangeOffer(offer.id, 'cancel'), 'Đã rút lại đề nghị.', 'info')}
                      >
                        Rút lại
                      </button>
                    )}
                    {offer.owner && (
                      <button className="btn-icon" onClick={() => chatWith(offer.owner.id)} aria-label="Nhắn tin cho chủ tin">
                        <MessageSquare size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Đăng tin */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Đăng tin trao đổi sách"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={submitListing} disabled={busy}>Đăng tin</button>
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
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
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
          {(id) => <input id={id} className="input" value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="https://..." />}
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
            <button className="btn btn-primary" onClick={sendOffer} disabled={busy}>Gửi đề nghị</button>
          </>
        }
      >
        <p className="small" style={{ marginTop: 0 }}>
          Bạn muốn đổi lấy <b>{offerTarget?.bookTitle}</b> của <b>{offerTarget?.owner?.name}</b>.
          Chủ sách đang tìm: <b>{offerTarget?.wanted}</b>.
        </p>
        <Field label="Cuốn sách bạn mang ra đổi">
          {(id) => (
            <input
              id={id}
              className="input"
              value={offerForm.offeredBook}
              onChange={(e) => setOfferForm({ ...offerForm, offeredBook: e.target.value })}
              placeholder={offerTarget ? `Ví dụ: ${offerTarget.wanted}` : ''}
            />
          )}
        </Field>
        <Field label="Lời nhắn kèm theo (không bắt buộc)" style={{ marginBottom: 0 }}>
          {(id) => (
            <textarea
              id={id}
              className="textarea"
              value={offerForm.message}
              onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
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