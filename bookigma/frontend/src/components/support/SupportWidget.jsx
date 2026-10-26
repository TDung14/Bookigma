import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Crown,
  Headset,
  LifeBuoy,
  Mail,
  Maximize2,
  MessageCircle,
  Minus,
  RefreshCw,
  Send,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp, useAuth } from '../../hooks/useStore';
import { avatarSrc } from '../../lib/avatar';
import { clockTime } from '../../lib/format';
import './SupportWidget.css';

const FAQS = [
  {
    q: 'Làm sao để theo dõi đơn hàng đã đặt?',
    a: 'Mở mục Đơn hàng trên thanh điều hướng. Mỗi đơn đều có trạng thái xử lý, vận chuyển và mã thanh toán để bạn đối chiếu.',
  },
  {
    q: 'Tôi có thể đọc sách trực tuyến không?',
    a: 'Có. Sách đã mua hoặc sách miễn phí sẽ nằm trong Tủ sách của bạn. Chọn Đọc ngay để mở Góc đọc với mục lục, đánh dấu trang và đổi cỡ chữ.',
  },
  {
    q: 'Thanh toán chuyển khoản cần lưu ý gì?',
    a: 'Quét đúng mã QR và nhập chính xác nội dung chuyển khoản hiển thị trên trang thanh toán. Đơn hàng được xác nhận tự động sau khi hệ thống nhận được tiền.',
  },
  {
    q: 'Làm sao để trở thành đối tác bán sách?',
    a: 'Gửi yêu cầu qua email support@bookigma.vn kèm tên cửa hàng và đầu sách bạn muốn phân phối. Đội ngũ Bookigma sẽ phản hồi trong 1–2 ngày làm việc.',
  },
  {
    q: 'VIP Bookigma mang lại quyền lợi gì?',
    a: 'VIP mở khoá toàn bộ âm thanh trong Góc đọc, kèm các quyền lợi đọc sách và tích điểm. Bạn có thể xem các gói tại trang Nâng cấp VIP.',
  },
];

const QUICK_PROMPTS = ['Tôi cần tư vấn chọn sách', 'Kiểm tra tình trạng đơn hàng', 'Hỗ trợ thanh toán / chuyển khoản'];

const HELP_LINKS = [
  { to: '/orders', icon: ShoppingBag, label: 'Theo dõi đơn hàng', hint: 'Xem trạng thái và mã thanh toán' },
  { to: '/library', icon: BookOpen, label: 'Tủ sách & Góc đọc', hint: 'Sách đã mua, tiến độ đọc' },
  { to: '/upgrade', icon: Crown, label: 'Nâng cấp VIP', hint: 'Quyền lợi và các gói thành viên' },
  { to: '/shop', icon: Sparkles, label: 'Khám phá cửa hàng', hint: 'Tìm sách theo thể loại, mức giá' },
];

const normalizeId = (value) => String(value ?? '');

export default function SupportWidget() {
  const { user } = useAuth();
  const { conversations, users, userById, sendMessage, markConversationRead, startSupportConversation } = useApp();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('chat');
  const [convId, setConvId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [openFaq, setOpenFaq] = useState(0);
  const startingRef = useRef(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const previousConvIdRef = useRef(null);

  const supportUser = useMemo(() => users.find((u) => u.role === 'support') || null, [users]);

  const supportConversation = useMemo(() => {
    if (!user) return null;
    const currentId = normalizeId(user.id);
    return conversations.find((c) => (
      c.type === 'DIRECT' &&
      c.participants.map(normalizeId).includes(currentId) &&
      (supportUser
        ? c.participants.map(normalizeId).includes(normalizeId(supportUser.id))
        : userById(c.participants.find((p) => normalizeId(p) !== currentId))?.role === 'support')
    )) || null;
  }, [conversations, supportUser, user, userById]);

  const activeId = convId || supportConversation?.id || null;
  const activeConversation = useMemo(
    () => conversations.find((c) => normalizeId(c.id) === normalizeId(activeId)) || supportConversation,
    [conversations, activeId, supportConversation]
  );

  const partnerId = activeConversation?.participants.find((p) => normalizeId(p) !== normalizeId(user?.id));
  const partner = (partnerId ? userById(partnerId) : null) || supportUser;
  const messages = activeConversation?.messages || [];
  const messageCount = messages.length;

  const unread = useMemo(() => {
    if (!supportConversation || !user) return 0;
    const readCount = supportConversation.readBy?.[normalizeId(user.id)] ?? 0;
    return Math.max(0, supportConversation.messages.length - readCount);
  }, [supportConversation, user]);

  const ensureConversation = useCallback(async () => {
    if (startingRef.current) return null;
    if (activeId) return activeId;

    startingRef.current = true;
    setStarting(true);
    setError('');
    try {
      const id = await startSupportConversation();
      setConvId(id);
      return id;
    } catch (err) {
      setError(err.message || 'Không thể kết nối hỗ trợ viên. Vui lòng thử lại.');
      return null;
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }, [activeId, startSupportConversation]);

  const openWidget = (nextTab = 'chat') => {
    setOpen(true);
    setTab(nextTab);
    if (nextTab === 'chat') {
      if (supportConversation?.id) {
        setConvId(supportConversation.id);
      } else {
        ensureConversation();
      }
    }
  };

  useEffect(() => {
    if (!open || !activeId) return;
    markConversationRead(activeId, normalizeId(user?.id));
  }, [open, activeId, messageCount, markConversationRead, user?.id]);

  useEffect(() => {
    if (!open || tab !== 'chat') return;
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [open, tab, messageCount]);

  useEffect(() => {
    if (!open || tab !== 'chat') return;
    if (previousConvIdRef.current !== activeId) {
      previousConvIdRef.current = activeId;
      inputRef.current?.focus();
    }
  }, [open, tab, activeId]);

  if (!user) return null;

  const submit = (event) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;

    if (!activeId) {
      ensureConversation().then((id) => {
        if (id) sendMessage(id, text);
      });
      setDraft('');
      return;
    }

    sendMessage(activeId, text);
    setDraft('');
  };

  const sendPrompt = (text) => {
    setTab('chat');
    if (!activeId) {
      ensureConversation().then((id) => {
        if (id) sendMessage(id, text);
      });
      return;
    }
    sendMessage(activeId, text);
  };

  const expand = () => {
    if (!activeId) return;
    setOpen(false);
    navigate(`/chat/${activeId}`);
  };

  const supportName = partner?.name || 'Hỗ trợ Bookigma';

  return (
    <>
      {!open && (
        <button
          type="button"
          className="support-bubble"
          onClick={() => openWidget('chat')}
          aria-label="Mở hỗ trợ Bookigma"
          title="Cần hỗ trợ? Trò chuyện với Bookigma"
        >
          <span className="support-bubble-ring" aria-hidden="true" />
          <Headset size={26} />
          {unread > 0 && <span className="support-bubble-badge">{unread > 9 ? '9+' : unread}</span>}
          <span className="support-bubble-label">Hỗ trợ</span>
        </button>
      )}

      {open && (
        <section className="support-panel" role="dialog" aria-label="Hỗ trợ Bookigma">
          <header className="support-panel-head">
            <div className="support-identity">
              <div className="support-avatar-wrap">
                <img src={avatarSrc(partner?.avatar)} alt="" className="avatar" />
                <span className="support-online-dot" />
              </div>
              <div className="support-identity-text">
                <strong>Hỗ trợ Bookigma</strong>
                <span>{starting ? 'Đang kết nối...' : 'Thường trả lời trong vài phút'}</span>
              </div>
            </div>

            <div className="support-head-actions">
              <button
                type="button"
                className="support-icon-btn"
                onClick={expand}
                disabled={!activeId}
                title="Mở trong trang Tin nhắn"
                aria-label="Mở rộng"
              >
                <Maximize2 size={15} />
              </button>
              <button
                type="button"
                className="support-icon-btn"
                onClick={() => setOpen(false)}
                title="Thu nhỏ"
                aria-label="Thu nhỏ"
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                className="support-icon-btn support-icon-close"
                onClick={() => setOpen(false)}
                title="Đóng"
                aria-label="Đóng"
              >
                <X size={17} />
              </button>
            </div>
          </header>

          <div className="support-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'chat'}
              className={tab === 'chat' ? 'active' : ''}
              onClick={() => {
                setTab('chat');
                if (!activeId) ensureConversation();
              }}
            >
              <MessageCircle size={15} /> Trò chuyện
              {unread > 0 && <span className="support-tab-badge">{unread}</span>}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'help'}
              className={tab === 'help' ? 'active' : ''}
              onClick={() => setTab('help')}
            >
              <LifeBuoy size={15} /> Trợ giúp
            </button>
          </div>

          {tab === 'chat' ? (
            <>
              <div className="support-chat-body" ref={bodyRef}>
                <div className="support-chat-intro">
                  <Headset size={18} />
                  <p>
                    Xin chào <strong>{user.name}</strong>! Đội ngũ Bookigma luôn ở đây để hỗ trợ bạn về đơn hàng,
                    thanh toán, tủ sách và tài khoản.
                  </p>
                </div>

                {starting && (
                  <div className="support-state">
                    <span className="support-typing"><i /><i /><i /></span>
                    Đang kết nối với hỗ trợ viên...
                  </div>
                )}

                {error && (
                  <div className="support-state support-state-error">
                    <span>{error}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => ensureConversation()}
                    >
                      <RefreshCw size={14} /> Thử lại
                    </button>
                  </div>
                )}

                {!starting && !error && activeId && messages.length === 0 && (
                  <div className="support-state">Hãy gửi tin nhắn đầu tiên để bắt đầu trò chuyện.</div>
                )}

                {messages.map((message, index) => {
                  const mine = normalizeId(message.senderId) === normalizeId(user.id);
                  const showTime = index === 0
                    || (message.at && messages[index - 1]?.at && message.at - messages[index - 1].at > 10 * 60 * 1000);

                  return (
                    <div key={message.id || index} className={`support-msg-row ${mine ? 'mine' : 'other'}`}>
                      {showTime && <span className="support-msg-time">{clockTime(message.at)}</span>}
                      {!mine && (
                        <img src={avatarSrc(partner?.avatar)} alt="" className="avatar support-msg-avatar" />
                      )}
                      <div className="support-msg-bubble">{message.text}</div>
                    </div>
                  );
                })}
              </div>

              <div className="support-quick">
                {QUICK_PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => sendPrompt(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>

              <form className="support-composer" onSubmit={submit}>
                <input
                  ref={inputRef}
                  className="input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={starting ? 'Đang kết nối hỗ trợ...' : 'Nhập nội dung cần hỗ trợ...'}
                  disabled={starting}
                  aria-label="Nội dung tin nhắn hỗ trợ"
                />
                <button
                  type="submit"
                  className="btn btn-primary support-send"
                  disabled={!draft.trim() || starting}
                  aria-label="Gửi tin nhắn"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="support-help-body">
              <div className="support-help-hero">
                <LifeBuoy size={19} />
                <div>
                  <strong>Câu hỏi thường gặp</strong>
                  <span>Giải đáp nhanh trước khi trò chuyện với hỗ trợ viên.</span>
                </div>
              </div>

              <div className="support-faq-list">
                {FAQS.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div key={faq.q} className={`support-faq ${isOpen ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="support-faq-question"
                        onClick={() => setOpenFaq(isOpen ? -1 : index)}
                        aria-expanded={isOpen}
                      >
                        <span>{faq.q}</span>
                        <ChevronDown size={15} />
                      </button>
                      {isOpen && <p className="support-faq-answer">{faq.a}</p>}
                    </div>
                  );
                })}
              </div>

              <div className="support-links">
                {HELP_LINKS.map(({ to, icon: Icon, label, hint }) => (
                  <button
                    key={to}
                    type="button"
                    className="support-link-item"
                    onClick={() => {
                      setOpen(false);
                      navigate(to);
                    }}
                  >
                    <span className="support-link-icon"><Icon size={16} /></span>
                    <span className="support-link-text">
                      <strong>{label}</strong>
                      <small>{hint}</small>
                    </span>
                    <ArrowRight size={15} className="support-link-arrow" />
                  </button>
                ))}
              </div>

              <div className="support-help-foot">
                <a href="mailto:support@bookigma.vn" className="support-mail-link">
                  <Mail size={15} /> support@bookigma.vn
                </a>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setTab('chat');
                    if (!activeId) ensureConversation();
                  }}
                >
                  <MessageCircle size={15} /> Trò chuyện với hỗ trợ viên
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
