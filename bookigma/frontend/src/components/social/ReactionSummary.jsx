import { topReactions } from './reactions';

export default function ReactionSummary({ counts = {}, total = 0, className = '' }) {
  const top = topReactions(counts);

  return (
    <span className={`reaction-summary ${className}`.trim()} title="Cảm xúc">
      {top.length > 0 && (
        <span className="reaction-summary-emojis">
          {top.map((reaction) => (
            <span key={reaction.type} className="reaction-summary-emoji" title={reaction.label}>
              {reaction.emoji}
            </span>
          ))}
        </span>
      )}
      <span>{total} cảm xúc</span>
    </span>
  );
}
