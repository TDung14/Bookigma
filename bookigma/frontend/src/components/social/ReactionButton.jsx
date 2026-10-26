import { useEffect, useRef, useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import ReactionPicker from './ReactionPicker';
import { REACTION_BY_TYPE } from './reactions';

export default function ReactionButton({
  myReaction = null,
  count = 0,
  onReact,
  compact = false,
  className = '',
  align = 'left',
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const hoverCapable = useRef(
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
  ).current;
  const active = myReaction ? REACTION_BY_TYPE[myReaction] : null;

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const openPicker = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  const selectReaction = (type) => {
    setOpen(false);
    onReact(type);
  };

  const handleMainClick = () => {
    if (!hoverCapable) {
      setOpen((value) => !value);
      return;
    }
    setOpen(false);
    onReact(myReaction || 'LIKE');
  };

  return (
    <div
      className={`reaction-control ${compact ? 'is-compact' : ''} ${className}`.trim()}
      onMouseEnter={hoverCapable ? openPicker : undefined}
      onMouseLeave={hoverCapable ? scheduleClose : undefined}
    >
      <ReactionPicker open={open} onSelect={selectReaction} align={align} />
      <button
        type="button"
        className={`reaction-trigger ${active ? 'is-active' : ''}`.trim()}
        style={active ? { color: active.color } : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        title={active ? `Cảm xúc: ${active.label}` : 'Chọn cảm xúc'}
        onClick={handleMainClick}
      >
        {active ? (
          <span className="reaction-trigger-emoji">{active.emoji}</span>
        ) : (
          <ThumbsUp size={compact ? 14 : 17} />
        )}
        <span>{active ? active.label : 'Thích'}</span>
        {compact && count > 0 && <span className="reaction-trigger-count">{count}</span>}
      </button>
    </div>
  );
}
