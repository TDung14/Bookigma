import { useMemo } from 'react';
import { X } from 'lucide-react';
import { useApp, useAuth } from '../../hooks/useStore';
import { avatarSrc } from '../../lib/avatar';
import { conversationTitle } from '../../lib/chat';
import FloatingChatWindow from './FloatingChatWindow';

export default function FloatingChatContainer() {
  const { user } = useAuth();
  const {
    openChats,
    conversations,
    userById,
    closeFloatingChat,
    minimizeFloatingChat,
  } = useApp();

  // Chỉ hiển thị khi user đã đăng nhập và có ít nhất 1 cửa sổ chat đang mở
  if (!user || !openChats || openChats.length === 0) {
    return null;
  }

  // Chia thành các chat đang mở (unminimized) và chat thu nhỏ (minimized)
  const activeChats = openChats.filter((c) => !c.minimized);
  const minimizedChats = openChats.filter((c) => c.minimized);

  return (
    <div className="fb-floating-dock-container">
      {/* 1. Các cửa sổ chat đang mở xếp ngang ở góc phải */}
      {activeChats.map((chatItem, index) => (
        <FloatingChatWindow
          key={chatItem.id}
          convId={chatItem.id}
          minimized={false}
          focused={Boolean(chatItem.focused)}
          onMinimize={(min) => minimizeFloatingChat(chatItem.id, min)}
          onClose={() => closeFloatingChat(chatItem.id)}
          index={index}
        />
      ))}

      {/* 2. Bong bóng chat thu nhỏ (Facebook Chat Heads) */}
      {minimizedChats.length > 0 && (
        <div className="fb-chat-heads-stack">
          {minimizedChats.map((chatItem) => {
            const conv = conversations.find((c) => String(c.id) === String(chatItem.id));
            const partnerId = conv?.participants.find((p) => String(p) !== String(user.id));
            const partner = partnerId ? userById(partnerId) : null;
            const name = conversationTitle(conv, user.id, userById);
            const unread = Math.max(0, (conv?.messages?.length || 0) - (conv?.readBy?.[String(user.id)] ?? 0));

            return (
              <div
                key={chatItem.id}
                className="fb-chat-head-item"
                onClick={() => minimizeFloatingChat(chatItem.id, false)}
                title={`Mở cuộc trò chuyện với ${name}`}
              >
                <div className="fb-chat-head-avatar-wrap">
                  <img
                    src={avatarSrc(partner?.avatar)}
                    alt=""
                    className="avatar fb-chat-head-avatar"
                  />
                  <span className="fb-online-badge-bubble" />
                  {unread > 0 && (
                    <span className="fb-chat-head-badge">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="fb-chat-head-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFloatingChat(chatItem.id);
                  }}
                  title="Đóng bong bóng chat"
                  aria-label="Đóng"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
