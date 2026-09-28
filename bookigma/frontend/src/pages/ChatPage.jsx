import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, MessageSquare, Paperclip, Plus, Search, Send, Smile, X } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { clockTime, timeAgo } from '../lib/format';
import { EmptyState } from '../components/common/ui';
import Modal from '../components/common/Modal';
import ReportModal from '../components/common/ReportModal';

const EMOJIS = ['😀', '😄', '😍', '👍', '🔥', '📚', '❤️', '😢', '🎉', '🙏', '😎', '🤔'];

/** Câu trả lời tự động để cuộc trò chuyện trong bản demo có phản hồi hai chiều. */
const AUTO_REPLIES = [
  'Ok bạn, mình xem rồi trả lời sớm nhé!',
  'Nghe hay đấy, cuốn đó mình cũng đang muốn đọc.',
  'Bạn cho mình xin thêm ảnh cuốn sách với.',
  'Mình đồng ý, khi nào bạn rảnh thì mình trao đổi nhé.',
  'Cảm ơn bạn đã nhắn tin, mình phản hồi ngay đây.',
];

export default function ChatPage() {
  const { convId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const {
    conversations, users, userById, sendMessage, markConversationRead, findOrCreateConversation,
  } = useApp();

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reporting, setReporting] = useState(false);
  const bodyRef = useRef(null);
  const replyTimer = useRef(null);

  const myConvs = useMemo(
    () =>
      conversations
        .filter((c) => c.participants.includes(user.id))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations, user.id]
  );

  const active = myConvs.find((c) => c.id === convId) || null;
  const partnerId = active?.participants.find((p) => p !== user.id);
  const partner = partnerId ? userById(partnerId) : null;

  const filteredConvs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return myConvs;
    return myConvs.filter((c) => {
      const other = userById(c.participants.find((p) => p !== user.id));
      return other?.name.toLowerCase().includes(q);
    });
  }, [myConvs, query, userById, user.id]);

  // Đánh dấu đã đọc khi mở hội thoại hoặc khi có tin nhắn mới tới.
  // Phụ thuộc vào id và số tin nhắn (giá trị nguyên thủy) thay vì vào cả object
  // hội thoại — object được tạo mới sau mỗi lần cập nhật nên sẽ khiến effect chạy lại liên tục.
  const activeMessageCount = active?.messages.length ?? 0;
  useEffect(() => {
    if (convId) markConversationRead(convId, user.id);
  }, [convId, activeMessageCount, markConversationRead, user.id]);

  // Luôn cuộn xuống tin mới nhất.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [activeMessageCount, typing]);

  // Dọn timer trả lời tự động khi rời trang hoặc đổi hội thoại.
  useEffect(() => () => clearTimeout(replyTimer.current), [convId]);

  const submit = (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;
    sendMessage(active.id, user.id, text);
    setDraft('');
    setShowEmoji(false);

    // Người nhận "gõ" rồi trả lời — chỉ để demo, không thay cho backend thật.
    setTyping(true);
    replyTimer.current = setTimeout(() => {
      setTyping(false);
      sendMessage(active.id, partnerId, AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]);
    }, 1600);
  };

  const startChat = (otherId) => {
    const id = findOrCreateConversation(user.id, otherId);
    setShowNew(false);
    navigate(`/chat/${id}`);
  };

  return (
    <div className="main-layout" style={{ maxWidth: 1180 }}>
      <div className="page-head row-between" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1>Tin nhắn</h1>
          <p>Trao đổi với độc giả khác và các shop trên Bookigma</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
          <Plus size={16} /> Cuộc trò chuyện mới
        </button>
      </div>

      <div
        className="card"
        style={{ padding: 0, display: 'grid', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr)', height: 'calc(100vh - 210px)', minHeight: 460, overflow: 'hidden' }}
      >
        {/* Danh sách hội thoại */}
        <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 23, top: 22, color: 'var(--text-sub)' }} />
            <input
              className="input"
              style={{ paddingLeft: 34, height: 38 }}
              placeholder="Tìm cuộc trò chuyện..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="scroll-y" style={{ flex: 1, padding: 8 }}>
            {filteredConvs.length === 0 && (
              <div className="small muted" style={{ padding: 16, textAlign: 'center' }}>Chưa có cuộc trò chuyện nào.</div>
            )}
            {filteredConvs.map((c) => {
              const other = userById(c.participants.find((p) => p !== user.id));
              const last = c.messages[c.messages.length - 1];
              const unread = Math.max(0, c.messages.length - (c.readBy?.[user.id] ?? 0));
              return (
                <button
                  key={c.id}
                  className={`list-item ${c.id === convId ? 'active' : ''}`}
                  style={{ alignItems: 'flex-start', padding: 10 }}
                  onClick={() => navigate(`/chat/${c.id}`)}
                >
                  <img src={other?.avatar} alt="" className="avatar" style={{ width: 42, height: 42 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-between" style={{ gap: 6 }}>
                      <span className="small strong truncate">{other?.name}</span>
                      <span className="tiny muted" style={{ flexShrink: 0 }}>{last ? timeAgo(last.at) : ''}</span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <span className="tiny muted truncate" style={{ flex: 1, fontWeight: unread ? 700 : 400, color: unread ? 'var(--text-main)' : undefined }}>
                        {last ? `${last.senderId === user.id ? 'Bạn: ' : ''}${last.text}` : 'Bắt đầu trò chuyện'}
                      </span>
                      {unread > 0 && (
                        <span className="badge" style={{ background: 'var(--accent-green)', color: '#fff', minWidth: 19, justifyContent: 'center', padding: '2px 6px' }}>
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Khung hội thoại */}
        {!active ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState
              icon={MessageSquare}
              title="Chọn một cuộc trò chuyện"
              hint="Hoặc bắt đầu cuộc trò chuyện mới với một độc giả / shop."
              action={<button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>Trò chuyện mới</button>}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div className="row-between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
              <div className="row">
                <img src={partner?.avatar} alt="" className="avatar" style={{ width: 40, height: 40 }} />
                <div>
                  <div className="small strong">{partner?.name}</div>
                  <div className="tiny muted row" style={{ gap: 5 }}>
                    <span className="dot" style={{ background: partner?.status === 'active' ? '#22c55e' : '#9ca3af', width: 7, height: 7 }} />
                    {partner?.role === 'shop' ? 'Đối tác bán hàng' : partner?.status === 'active' ? 'Đang hoạt động' : 'Ngoại tuyến'}
                  </div>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setReporting(true)} aria-label="Báo cáo người dùng">
                <Flag size={17} />
              </button>
            </div>

            <div ref={bodyRef} className="scroll-y" style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-primary)' }}>
              <div className="tiny muted" style={{ textAlign: 'center', marginBottom: 6 }}>
                Cuộc trò chuyện với {partner?.name}
              </div>
              {active.messages.map((m, i) => {
                const mine = m.senderId === user.id;
                const showTime = i === 0 || m.at - active.messages[i - 1].at > 10 * 60 * 1000;
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                    {showTime && (
                      <div className="tiny muted" style={{ alignSelf: 'center', margin: '8px 0' }}>{clockTime(m.at)}</div>
                    )}
                    <div className={`bubble ${mine ? 'bubble-me' : 'bubble-them'}`}>{m.text}</div>
                    <span className="tiny muted" style={{ marginTop: 2 }}>{clockTime(m.at)}</span>
                  </div>
                );
              })}
              {typing && (
                <div className="bubble bubble-them typing row" style={{ gap: 4, width: 'fit-content' }}>
                  <span /><span /><span />
                </div>
              )}
            </div>

            <form onSubmit={submit} style={{ padding: 12, borderTop: '1px solid var(--border-color)', position: 'relative' }}>
              {showEmoji && (
                <div className="card" style={{ position: 'absolute', bottom: 62, left: 12, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, boxShadow: 'var(--shadow-lg)', zIndex: 900 }}>
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" className="btn-icon" style={{ fontSize: 19 }} onClick={() => setDraft((d) => d + e)}>{e}</button>
                  ))}
                </div>
              )}
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className="btn-icon" onClick={() => setShowEmoji((v) => !v)} aria-label="Biểu tượng cảm xúc">
                  {showEmoji ? <X size={19} /> : <Smile size={19} />}
                </button>
                <button type="button" className="btn-icon" onClick={() => toast('Tính năng gửi tệp sẽ có khi kết nối backend.', 'info')} aria-label="Đính kèm">
                  <Paperclip size={19} />
                </button>
                <input
                  className="input"
                  style={{ borderRadius: 20 }}
                  placeholder="Nhập tin nhắn..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ borderRadius: 20 }} disabled={!draft.trim()}>
                  <Send size={17} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Chọn người để bắt đầu trò chuyện */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Bắt đầu trò chuyện mới">
        <div className="stack" style={{ gap: 4 }}>
          {users
            .filter((u) => u.id !== user.id && u.role !== 'admin')
            .map((u) => (
              <button key={u.id} className="list-item" onClick={() => startChat(u.id)}>
                <img src={u.avatar} alt="" className="avatar" style={{ width: 38, height: 38 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="small strong truncate">{u.name}</div>
                  <div className="tiny muted">{u.role === 'shop' ? 'Đối tác bán hàng' : u.badge}</div>
                </div>
              </button>
            ))}
        </div>
      </Modal>

      <ReportModal
        open={reporting}
        onClose={() => setReporting(false)}
        type="user"
        targetId={partnerId}
        targetLabel={partner?.name || ''}
      />
    </div>
  );
}
