import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, SquarePen, MessageSquare, Check, MoreHorizontal } from 'lucide-react';
import { useApp, useAuth } from '../../hooks/useStore';
import { avatarSrc, isImageMedia } from '../../lib/avatar';
import { conversationTitle } from '../../lib/chat';
import { timeAgo } from '../../lib/format';
import Modal from '../common/Modal';

export default function MessengerDropdown({ isOpen, onClose }) {
  const { user } = useAuth();
  const {
    conversations,
    users,
    userById,
    openFloatingChat,
    findOrCreateConversation,
    markConversationRead,
  } = useApp();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all'); // 'all' | 'unread'
  const [showNewModal, setShowNewModal] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng khi click ra ngoài.
  // Tạm gỡ listener khi modal mở: modal render ngoài dropdownRef nên mousedown vào modal
  // sẽ đóng dropdown và unmount modal trước khi kịp chọn người.
  useEffect(() => {
    if (!isOpen || showNewModal) return undefined;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        // Kiểm tra xem click có nằm trên nút toggle không
        const toggleBtn = document.getElementById('navbar-chat-toggle-btn');
        if (toggleBtn && toggleBtn.contains(e.target)) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, showNewModal, onClose]);

  // Danh sách hội thoại của user
  const myConvs = useMemo(() => {
    if (!user) return [];
    const currentId = String(user.id);
    return conversations
      .filter((c) => c.participants.map(String).includes(currentId))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [conversations, user]);

  // Lọc theo tìm kiếm và tab
  const filteredConvs = useMemo(() => {
    let list = myConvs;
    if (tab === 'unread') {
      list = list.filter((c) => {
        const unread = Math.max(0, c.messages.length - (c.readBy?.[String(user?.id)] ?? 0));
        return unread > 0;
      });
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const name = conversationTitle(c, user?.id, userById);
        const lastMsg = c.messages[c.messages.length - 1]?.text || '';
        return name.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
      });
    }
    return list;
  }, [myConvs, tab, query, user?.id, userById]);

  const handleSelectConv = (convId) => {
    openFloatingChat(convId);
    onClose();
  };

  const handleStartNewChat = async (otherUserId) => {
    setShowNewModal(false);
    onClose();
    const convId = await findOrCreateConversation(user.id, otherUserId);
    openFloatingChat(convId);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fb-messenger-dropdown card" ref={dropdownRef} style={{ position: 'fixed', top: 'calc(var(--nav-h) + 10px)', right: 0, zIndex: 1250 }}>
        {/* Header Facebook Messenger */}
        <div className="fb-messenger-dropdown-header">
          <div className="fb-messenger-title-row">
            <h2>Đoạn chat</h2>
            <div className="fb-messenger-header-actions">
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowNewModal(true)}
                title="Tạo cuộc trò chuyện mới"
                aria-label="Tin nhắn mới"
              >
                <SquarePen size={18} />
              </button>
            </div>
          </div>

          {/* Ô tìm kiếm hội thoại */}
          <div className="fb-search-wrap">
            <Search size={15} className="fb-search-icon" />
            <input
              type="text"
              className="fb-search-input"
              placeholder="Tìm kiếm trên Chat..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Tabs bộ lọc */}
          <div className="fb-tabs-row">
            <button
              type="button"
              className={`fb-tab-chip ${tab === 'all' ? 'active' : ''}`}
              onClick={() => setTab('all')}
            >
              Hộp thư
            </button>
            <button
              type="button"
              className={`fb-tab-chip ${tab === 'unread' ? 'active' : ''}`}
              onClick={() => setTab('unread')}
            >
              Chưa đọc
            </button>
          </div>
        </div>

        {/* Danh sách các cuộc trò chuyện */}
        <div className="fb-messenger-list scroll-y">
          {filteredConvs.length === 0 ? (
            <div className="fb-messenger-empty">
              <MessageSquare size={38} className="muted" style={{ marginBottom: 8, opacity: 0.5 }} />
              <div className="small strong">
                {query ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có tin nhắn nào'}
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                Bắt đầu trò chuyện với bạn bè hoặc shop yêu thích của bạn
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: 12, borderRadius: 18 }}
                onClick={() => setShowNewModal(true)}
              >
                Tin nhắn mới
              </button>
            </div>
          ) : (
            filteredConvs.map((c) => {
              const partnerId = c.participants.find((p) => String(p) !== String(user?.id));
              const partner = partnerId ? userById(partnerId) : null;
              const name = conversationTitle(c, user?.id, userById);
              const lastMsg = c.messages[c.messages.length - 1];
              const unread = Math.max(0, c.messages.length - (c.readBy?.[String(user?.id)] ?? 0));
              const isMine = lastMsg && String(lastMsg.senderId) === String(user?.id);

              return (
                <div
                  key={c.id}
                  className={`fb-conv-item ${unread > 0 ? 'unread' : ''}`}
                  onClick={() => handleSelectConv(c.id)}
                >
                  <div className="fb-avatar-wrap">
                    <img
                      src={avatarSrc(partner?.avatar)}
                      alt=""
                      className="avatar"
                      style={{ width: 48, height: 48 }}
                    />
                    <span className="fb-online-badge" />
                  </div>

                  <div className="fb-conv-info">
                    <div className="fb-conv-name-row">
                      <span className="fb-conv-name truncate">{name}</span>
                      {lastMsg && (
                        <span className="fb-conv-time">{timeAgo(lastMsg.at)}</span>
                      )}
                    </div>

                    <div className="fb-conv-preview-row">
                      <span className="fb-conv-preview truncate">
                        {lastMsg ? (
                          <>
                            {isMine ? 'Bạn: ' : ''}
                            {isImageMedia(lastMsg.text) ? 'Đã gửi một ảnh' : lastMsg.text}
                          </>
                        ) : (
                          'Bắt đầu cuộc trò chuyện mới'
                        )}
                      </span>
                      {unread > 0 && <span className="fb-unread-dot" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer chuyển sang trang Messenger đầy đủ */}
        <div className="fb-messenger-dropdown-footer">
          <Link
            to="/chat"
            className="fb-see-all-link"
            onClick={onClose}
          >
            Xem tất cả trong Chat
          </Link>
        </div>
      </div>

      {/* Modal chọn người để nhắn tin mới */}
      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Bắt đầu cuộc trò chuyện mới"
      >
        <div className="stack" style={{ gap: 6, maxHeight: 360, overflowY: 'auto' }}>
          {users
            .filter((u) => String(u.id) !== String(user?.id) && u.role !== 'admin')
            .map((u) => (
              <button
                key={u.id}
                type="button"
                className="list-item"
                style={{ padding: '8px 10px' }}
                onClick={() => handleStartNewChat(u.id)}
              >
                <img src={avatarSrc(u.avatar)} alt="" className="avatar" style={{ width: 40, height: 40 }} />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div className="small strong truncate">{u.name}</div>
                  <div className="tiny muted">{u.role === 'shop' ? 'Shop đối tác' : u.role === 'support' ? 'Hỗ trợ viên' : u.badge || 'Độc giả'}</div>
                </div>
              </button>
            ))}
        </div>
      </Modal>
    </>
  );
}
