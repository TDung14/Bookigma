import { REACTIONS } from './reactions';

export default function ReactionPicker({ open, onSelect, align = 'left' }) {
  if (!open) return null;

  return (
    <div className={`reaction-picker ${align === 'right' ? 'align-right' : ''}`} role="menu" aria-label="Chọn cảm xúc">
      {REACTIONS.map((reaction) => (
        <button
          key={reaction.type}
          type="button"
          role="menuitem"
          className="reaction-picker-item"
          title={reaction.label}
          aria-label={reaction.label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(reaction.type)}
        >
          <span>{reaction.emoji}</span>
        </button>
      ))}
    </div>
  );
}
