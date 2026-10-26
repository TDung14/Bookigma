import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send } from 'lucide-react';
import { avatarSrc } from '../../lib/avatar';
import { timeAgo } from '../../lib/format';
import { useToast } from '../../hooks/useStore';
import ReactionButton from './ReactionButton';
import ReactionSummary from './ReactionSummary';
import './social.css';

const FILTERS = [
  { id: 'featured', label: 'Nổi bật' },
  { id: 'relevant', label: 'Phù hợp' },
  { id: 'reacted', label: 'Nhiều cảm xúc' },
  { id: 'all', label: 'Tất cả' },
];

const HOUR = 36e5;

function recencyScore(time) {
  const hours = Math.max(0, (Date.now() - Number(time || 0)) / HOUR);
  return 1 / (1 + hours / 24);
}

function featuredScore(comment) {
  return Number(comment.reactionCount || 0) * 10
    + recencyScore(comment.time) * 4
    + (comment.parentCommentId ? 1 : 0);
}

function relevantScore(comment) {
  return Number(comment.reactionCount || 0) * 2 + recencyScore(comment.time) * 6;
}

export default function CommentThread({ post, user, onAdd, onReactComment }) {
  const toast = useToast();
  const comments = post.comments || [];
  const [filter, setFilter] = useState('featured');
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const listRef = useRef(null);
  const scrollOnNext = useRef(false);

  const visibleComments = useMemo(() => {
    const list = [...comments];
    if (filter === 'all') return list;
    if (filter === 'reacted') {
      return list
        .filter((comment) => Number(comment.reactionCount || 0) > 0)
        .sort((a, b) => (b.reactionCount - a.reactionCount) || (b.time - a.time))
        .slice(0, 3);
    }
    if (filter === 'relevant') {
      return list.sort((a, b) => relevantScore(b) - relevantScore(a)).slice(0, 6);
    }
    return list.sort((a, b) => featuredScore(b) - featuredScore(a)).slice(0, 3);
  }, [comments, filter]);

  useEffect(() => {
    if (!scrollOnNext.current || filter !== 'all' || !listRef.current) return;
    scrollOnNext.current = false;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [filter, comments.length]);

  const submit = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || submitting) return;
    try {
      setSubmitting(true);
      await onAdd(text);
      setDraft('');
      scrollOnNext.current = true;
      setFilter('all');
    } catch (error) {
      toast(error.message || 'Không thể gửi bình luận.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const react = async (commentId, type) => {
    try {
      await onReactComment(commentId, type);
    } catch (error) {
      toast(error.message || 'Không thể cập nhật cảm xúc.', 'error');
    }
  };

  const scrollable = filter === 'all' && comments.length > 4;

  return (
    <div className="comment-thread">
      <div className="comment-thread-head">
        <span className="comment-thread-count">
          <MessageSquare size={14} /> {comments.length} bình luận
        </span>
        <div className="comment-filters" role="tablist" aria-label="Lọc bình luận">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={`comment-filter ${filter === item.id ? 'is-active' : ''}`.trim()}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {scrollable && <p className="comment-scroll-hint">Đưa chuột vào khung và cuộn để xem tất cả bình luận.</p>}

      <div ref={listRef} className={`comment-list ${scrollable ? 'is-scrollable' : ''}`.trim()}>
        {visibleComments.length === 0 && (
          <p className="comment-empty">
            {comments.length === 0
              ? 'Chưa có bình luận nào. Hãy là người đầu tiên!'
              : 'Chưa có bình luận nào nhận cảm xúc.'}
          </p>
        )}

        {visibleComments.map((comment) => {
          const name = comment.authorName || comment.username || 'Người dùng';
          return (
            <div key={comment.id} className="comment-item">
              <img src={avatarSrc(comment.avatarUrl)} alt="" className="avatar comment-avatar" />
              <div className="comment-main">
                <div className="comment-bubble">
                  <div className="comment-author">{name}</div>
                  <div className="comment-text">{comment.text}</div>
                </div>
                <div className="comment-meta">
                  <span>{timeAgo(comment.time)}</span>
                  <ReactionButton
                    compact
                    myReaction={comment.myReaction}
                    onReact={(type) => react(comment.id, type)}
                  />
                  {comment.reactionCount > 0 && (
                    <ReactionSummary counts={comment.reactionCounts} total={comment.reactionCount} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <img src={avatarSrc(user.avatar)} alt="" className="avatar comment-avatar" />
          <input
            className="input comment-input"
            placeholder="Viết bình luận..."
            value={draft}
            maxLength={2000}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className="btn-icon comment-send"
            type="submit"
            disabled={submitting || !draft.trim()}
            aria-label="Gửi bình luận"
          >
            <Send size={17} />
          </button>
        </form>
      ) : (
        <Link to="/login" className="btn btn-soft btn-sm">Đăng nhập để bình luận</Link>
      )}
    </div>
  );
}
