import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Minus, Phone, Video, Maximize2, Send, ThumbsUp,
  Smile, Image as ImageIcon, CheckCheck, Sparkles
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../../hooks/useStore';
import { avatarSrc } from '../../lib/avatar';
import { clockTime } from '../../lib/format';

const QUICK_EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '❤️', '👏', '🎉', '🥳', '🤩', '📚', '✨', '💡', '🙌', '☕', '💯'];
const REACTION_LIST = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function FloatingChatWindow({
  convId,
  minimized,
  focused,
  onMinimize,
  onClose,
  index = 0,
}) {
  const { user } = useAuth();
  const {
    conversations,
    userById,
    sendMessage,
    markConversationRead,
    addMessageReaction,
  } = useApp();
  const navigate = useNavigate();
  const toast = useToast();

  const [draft, setDraft] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const conv = useMemo(() => conversations.find((c) => String(c.id) === String(convId)), [conversations, convId]);

  const partnerId = useMemo(() => {
    if (!conv || !user) return null;
    return conv.participants.find((p) => String(p) !== String(user.id)) || null;
  }, [conv, user]);

  const partner = useMemo(() => (partnerId ? userById(partnerId) : null), [partnerId, userById]);

  const title = conv?.name || partner?.name || 'Trò chuyện';
  const isOnline = partner?.status === 'active' || true;

  // Cuộn xuống tin nhắn mới nhất
  const messageCount = conv?.messages?.length ?? 0;
  useEffect(() => {
    if (!minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageCount, minimized]);

  // Đánh dấu đã đọc khi xem cửa sổ này
  useEffect(() => {
    if (!minimized && convId && user?.id) {
      markConversationRead(convId, user.id);
    }
  }, [convId, messageCount, minimized, user?.id, markConversationRead]);

  // Focus ô nhập tin nhắn khi mở
  useEffect(() => {
    if (!minimized && focused) {
      inputRef.current?.focus();
    }
  }, [minimized, focused]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!text || !user || !convId) return;
    sendMessage(convId, user.id, text);
    setDraft('');
    setShowEmojiPicker(false);
  };

  const handleSendLike = () => {
    if (!user || !convId) return;
    sendMessage(convId, user.id, '👍');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCall = (type = 'voice') => {
    toast(`Đang kết nối cuộc gọi ${type === 'video' ? 'video' : 'thoại'} với ${title}... (Demo)`, 'info');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Demo gửi ảnh
      const fakeUrl = URL.createObjectURL(file);
      sendMessage(convId, user.id, `[Hình ảnh: ${file.name}]`);
      toast('Đã gửi tệp ảnh đính kèm!', 'success');
      e.target.value = '';
    }
  };

  const handleExpand = () => {
    onClose();
    navigate(`/chat/${convId}`);
  };

  // Tính vị trí xếp các cửa sổ chat theo chiều ngang (Facebook style)
  // Mỗi chatbox rộng 330px + khoảng cách 12px
  const rightOffset = 18 + index * 342;

  if (minimized) {
    return (
      <div
        className="fb-chat-minimized-bar"
        style={{ right: `${rightOffset}px` }}
        onClick={() => onMinimize(false)}
        title={`Mở chat với ${title}`}
      >
        <div className="fb-avatar-wrap">
          <img src={avatarSrc(partner?.avatar)} alt="" className="avatar" style={{ width: 26, height: 26 }} />
          {isOnline && <span className="fb-online-badge-sm" />}
        </div>
        <span className="fb-min-title">{title}</span>
        <button
          className="fb-min-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Đóng"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fb-chat-window ${focused ? 'focused' : ''}`}
      style={{ right: `${rightOffset}px` }}
      onClick={() => {
        if (convId && user?.id) markConversationRead(convId, user.id);
      }}
    >
      {/* Header phong cách Facebook Messenger */}
      <div className="fb-chat-header">
        <div
          className="fb-header-info"
          onClick={() => partner?.id && navigate(`/profile/${partner.id}`)}
          title={`Xem trang cá nhân ${title}`}
        >
          <div className="fb-avatar-wrap">
            <img src={avatarSrc(partner?.avatar)} alt="" className="avatar" style={{ width: 34, height: 34 }} />
            {isOnline && <span className="fb-online-badge" />}
          </div>
          <div className="fb-header-text">
            <div className="fb-header-name">{title}</div>
            <div className="fb-header-status">
              {partner?.role === 'shop' ? 'Cửa hàng đối tác' : 'Đang hoạt động'}
            </div>
          </div>
        </div>

        <div className="fb-header-actions">
          <button
            type="button"
            className="fb-action-btn"
            onClick={() => handleCall('voice')}
            title="Bắt đầu cuộc gọi thoại"
            aria-label="Gọi thoại"
          >
            <Phone size={15} />
          </button>
          <button
            type="button"
            className="fb-action-btn"
            onClick={() => handleCall('video')}
            title="Bắt đầu gọi video"
            aria-label="Gọi video"
          >
            <Video size={16} />
          </button>
          <button
            type="button"
            className="fb-action-btn"
            onClick={handleExpand}
            title="Mở rộng trong Messenger"
            aria-label="Mở rộng"
          >
            <Maximize2 size={14} />
          </button>
          <button
            type="button"
            className="fb-action-btn"
            onClick={() => onMinimize(true)}
            title="Thu nhỏ cửa sổ chat"
            aria-label="Thu nhỏ"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            className="fb-action-btn fb-action-close"
            onClick={onClose}
            title="Đóng cửa sổ chat"
            aria-label="Đóng chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Thân tin nhắn */}
      <div className="fb-chat-body">
        {(!conv || conv.messages.length === 0) ? (
          <div className="fb-chat-empty">
            <img src={avatarSrc(partner?.avatar)} alt="" className="avatar" style={{ width: 56, height: 56, marginBottom: 8 }} />
            <div className="strong">{title}</div>
            <div className="tiny muted" style={{ marginTop: 2, textAlign: 'center' }}>
              Hãy gửi lời chào đến {title} để bắt đầu cuộc trò chuyện!
            </div>
            <button
              className="btn btn-ghost btn-xs"
              style={{ marginTop: 12, borderRadius: 16 }}
              onClick={() => sendMessage(convId, user.id, 'Xin chào! 👋')}
            >
              Vẫy tay chào 👋
            </button>
          </div>
        ) : (
          conv.messages.map((m, idx) => {
            const isMine = String(m.senderId) === String(user?.id);
            const showTime =
              idx === 0 ||
              (m.at && conv.messages[idx - 1]?.at && m.at - conv.messages[idx - 1].at > 10 * 60 * 1000);
            const isHovered = hoveredMessageId === m.id;
            const reactions = m.reactions || {};
            const reactionEntries = Object.entries(reactions).filter(([, count]) => count > 0);

            return (
              <div
                key={m.id || idx}
                className={`fb-msg-row ${isMine ? 'mine' : 'other'}`}
                onMouseEnter={() => setHoveredMessageId(m.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                {showTime && (
                  <div className="fb-msg-time-divider">
                    <span>{clockTime(m.at)}</span>
                  </div>
                )}

                <div className="fb-msg-bubble-container">
                  {!isMine && (
                    <img
                      src={avatarSrc(partner?.avatar)}
                      alt=""
                      className="avatar fb-msg-avatar"
                      style={{ width: 26, height: 26 }}
                    />
                  )}

                  {/* Thanh thả cảm xúc Facebook khi hover */}
                  {isHovered && (
                    <div className={`fb-reaction-bar ${isMine ? 'mine' : 'other'}`}>
                      {REACTION_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="fb-reaction-quick-btn"
                          onClick={() => addMessageReaction(convId, m.id, emoji)}
                          title={`Bày tỏ cảm xúc ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="fb-msg-bubble-wrap">
                    <div
                      className={`fb-msg-bubble ${isMine ? 'mine' : 'other'}`}
                      title={clockTime(m.at)}
                    >
                      {m.text}
                    </div>

                    {/* Hiển thị các cảm xúc đã thả */}
                    {reactionEntries.length > 0 && (
                      <div className={`fb-msg-reactions ${isMine ? 'mine' : 'other'}`}>
                        {reactionEntries.map(([em, cnt]) => (
                          <span key={em} className="fb-reaction-pill">
                            {em} {cnt > 1 ? cnt : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Popover chọn emoji nhanh */}
      {showEmojiPicker && (
        <div className="fb-emoji-popover">
          <div className="fb-emoji-grid">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className="fb-emoji-btn"
                onClick={() => setDraft((prev) => prev + e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer input chuẩn Facebook Messenger */}
      <form className="fb-chat-footer" onSubmit={handleSend}>
        <div className="fb-footer-tools">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleImageSelect}
          />
          <button
            type="button"
            className="fb-tool-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Đính kèm ảnh"
            aria-label="Gửi ảnh"
          >
            <ImageIcon size={18} />
          </button>
          <button
            type="button"
            className={`fb-tool-btn ${showEmojiPicker ? 'active' : ''}`}
            onClick={() => setShowEmojiPicker((v) => !v)}
            title="Chọn biểu tượng cảm xúc"
            aria-label="Emoji"
          >
            <Smile size={18} />
          </button>
        </div>

        <div className="fb-input-wrap">
          <input
            ref={inputRef}
            className="fb-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Aa"
            autoComplete="off"
          />
        </div>

        {/* Nút gửi: Hiện máy bay gửi khi có chữ, hiện nút Thumbs Up khi trống như Facebook */}
        {draft.trim() ? (
          <button type="submit" className="fb-send-btn" title="Gửi (Enter)" aria-label="Gửi">
            <Send size={17} />
          </button>
        ) : (
          <button
            type="button"
            className="fb-like-btn"
            onClick={handleSendLike}
            title="Gửi biểu tượng thích 👍"
            aria-label="Thích"
          >
            <ThumbsUp size={18} />
          </button>
        )}
      </form>
    </div>
  );
}
