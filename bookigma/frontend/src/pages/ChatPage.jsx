import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, MessageSquare, Paperclip, Plus, Search, Send, Smile, X } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { clockTime, timeAgo } from '../lib/format';
import { EmptyState } from '../components/common/ui';
import Modal from '../components/common/Modal';
import ReportModal from '../components/common/ReportModal';

const EMOJIS = ['😀', '😄', '😍', '👍', '🔥', '📚', '❤️', '😢', '🎉', '🙏', '😎', '🤔'];

const normalizeId = (value) => String(value ?? '');

export default function ChatPage() {
  const { convId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const {
    conversations, users, userById, sendMessage, markConversationRead, findOrCreateConversation,
    createGroupConversation, isFriend,
  } = useApp();

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [reporting, setReporting] = useState(false);
  const bodyRef = useRef(null);

  const myConvs = useMemo(() => {
    const currentId = normalizeId(user.id);
    return conversations
      .filter((c) => c.participants.map((p) => normalizeId(p)).includes(currentId))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations, user.id]);

  const active = myConvs.find((c) => c.id === convId) || null;
  const partnerId = active?.participants.find((p) => normalizeId(p) !== normalizeId(user.id));
  const partner = partnerId ? userById(partnerId) : null;

  const filteredConvs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return myConvs;
    return myConvs.filter((c) => {
      const other = userById(c.participants.find((p) => normalizeId(p) !== normalizeId(user.id)));
      return other?.name.toLowerCase().includes(q);
    });
  }, [myConvs, query, userById, user.id]);

  // Đánh dấu đã đọc khi mở hội thoại hoặc khi có tin nhắn mới tới.
  // Phụ thuộc vào id và số tin nhắn (giá trị nguyên thủy) thay vì vào cả object
  // hội thoại — object được tạo mới sau mỗi lần cập nhật nên sẽ khiến effect chạy lại liên tục.
  const activeMessageCount = active?.messages.length ?? 0;
  useEffect(() => {
    if (convId) markConversationRead(convId, normalizeId(user.id));
  }, [convId, activeMessageCount, markConversationRead, user.id]);

  // Luôn cuộn xuống tin mới nhất.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [activeMessageCount]);

  const submit = (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;
    sendMessage(active.id, user.id, text);
    setDraft('');
    setShowEmoji(false);
  };

  const startChat = async (otherId) => {
    const id = await findOrCreateConversation(user.id, otherId);
    setShowNew(false);
    setGroupMode(false);
    setGroupMembers([]);
    setGroupName('');
    navigate(`/chat/${id}`);
  };

  const friendUsers = useMemo(
    () => users.filter((u) => String(u.id) !== String(user.id) && u.role !== 'admin' && isFriend(user.id, u.id)),
    [isFriend, user.id, users]
  );

  const toggleGroupMember = (friendId) => {
    setGroupMembers((prev) => (prev.includes(String(friendId))
      ? prev.filter((id) => id !== String(friendId))
      : [...prev, String(friendId)]));
  };

  const submitGroupChat = async () => {
    if (groupMembers.length + 1 < 3) {
      toast('Nhóm tối thiểu 3 người, bao gồm bạn.', 'error');
      return;
    }

    try {
      const created = await createGroupConversation(user.id, groupMembers, groupName.trim() || `Nhóm của ${user.name}`);
      setShowNew(false);
      setGroupMode(false);
      setGroupMembers([]);
      setGroupName('');
      navigate(`/chat/${created.id}`);
    } catch (error) {
      toast(error.message || 'Không thể tạo nhóm chat.', 'error');
    }
  };

  return (
    <div className="main-layout" style={{ maxWidth: 1180 }}>
      <div className="page-head row-between" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1>Tin nhắn</h1>
          <p>Trao đổi với độc giả khác và các shop trên Bookigma</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { setGroupMode(false); setShowNew(true); }}>
            <Plus size={16} /> Cuộc trò chuyện mới
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setGroupMode(true); setGroupMembers([]); setShowNew(true); }}>
            <Plus size={16} /> Tạo nhóm
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{ padding: 0, display: 'grid', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr)', height: 'calc(100vh - 210px)', minHeight: 460, overflow: 'hidden', minWidth: 0, minHeight: 0 }}
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
              const other = userById(c.participants.find((p) => normalizeId(p) !== normalizeId(user.id)));
              const last = c.messages[c.messages.length - 1];
              const unread = Math.max(0, c.messages.length - (c.readBy?.[normalizeId(user.id)] ?? 0));
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
                        {last ? `${normalizeId(last.senderId) === normalizeId(user.id) ? 'Bạn: ' : ''}${last.text}` : 'Bắt đầu trò chuyện'}
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
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%' }}>
            <div className="row-between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="row"
                onClick={() => partner?.id && navigate(`/profile/${partner.id}`)}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                aria-label={`Xem trang cá nhân của ${partner?.name || 'người dùng'}`}
              >
                <img src={partner?.avatar} alt="" className="avatar" style={{ width: 40, height: 40 }} />
                <div>
                  <div className="small strong">{partner?.name}</div>
                  <div className="tiny muted row" style={{ gap: 5 }}>
                    <span className="dot" style={{ background: partner?.status === 'active' ? '#22c55e' : '#9ca3af', width: 7, height: 7 }} />
                    {partner?.role === 'shop' ? 'Đối tác bán hàng' : partner?.status === 'active' ? 'Đang hoạt động' : 'Ngoại tuyến'}
                  </div>
                </div>
              </button>
              <button className="btn-icon" onClick={() => setReporting(true)} aria-label="Báo cáo người dùng">
                <Flag size={17} />
              </button>
            </div>

            <div ref={bodyRef} className="scroll-y" style={{ flex: 1, minHeight: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-primary)', overflowY: 'auto' }}>
              <div className="tiny muted" style={{ textAlign: 'center', marginBottom: 6 }}>
                Cuộc trò chuyện với {partner?.name}
              </div>
              {active.messages.map((m, i) => {
                const mine = normalizeId(m.senderId) === normalizeId(user.id);
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
            </div>

            <form onSubmit={submit} style={{ padding: 12, borderTop: '1px solid var(--border-color)', position: 'relative', flexShrink: 0 }}>
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
      <Modal open={showNew} onClose={() => { setShowNew(false); setGroupMode(false); setGroupMembers([]); setGroupName(''); }} title={groupMode ? 'Tạo nhóm chat' : 'Bắt đầu trò chuyện mới'}>
        {groupMode ? (
          <div className="stack" style={{ gap: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Tên nhóm</label>
              <input className="input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ví dụ: Nhóm đọc sách" />
            </div>
            <div>
              <div className="small strong" style={{ marginBottom: 8 }}>Chọn bạn bè đã kết bạn</div>
              {friendUsers.length === 0 ? (
                <div className="small muted">Bạn chưa có bạn bè nào để tạo nhóm. Hãy kết bạn trước.</div>
              ) : (
                <div className="stack" style={{ gap: 6 }}>
                  {friendUsers.map((u) => (
                    <label key={u.id} className="list-item" style={{ justifyContent: 'space-between', padding: '8px 10px' }}>
                      <div className="row" style={{ minWidth: 0 }}>
                        <img src={u.avatar} alt="" className="avatar" style={{ width: 32, height: 32 }} />
                        <div style={{ minWidth: 0 }}>
                          <div className="small strong truncate">{u.name}</div>
                          <div className="tiny muted">{u.role === 'shop' ? 'Đối tác bán hàng' : u.badge}</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={groupMembers.includes(String(u.id))}
                        onChange={() => toggleGroupMember(u.id)}
                        style={{ width: 16, height: 16 }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="small muted">
              {groupMembers.length + 1 < 3 ? 'Cần ít nhất 3 người (bao gồm bạn) để tạo nhóm.' : `Đã chọn ${groupMembers.length} bạn bè.`}
            </div>
            <div className="row-between">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setGroupMode(false); setGroupMembers([]); setGroupName(''); }}>Quay lại</button>
              <button className="btn btn-primary btn-sm" type="button" disabled={groupMembers.length + 1 < 3} onClick={submitGroupChat}>Tạo nhóm</button>
            </div>
          </div>
        ) : (
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
        )}
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
