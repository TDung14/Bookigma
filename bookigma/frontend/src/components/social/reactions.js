export const REACTIONS = [
  { type: 'LIKE', emoji: '👍', label: 'Thích', color: '#2563eb' },
  { type: 'LOVE', emoji: '❤️', label: 'Yêu thích', color: '#e11d48' },
  { type: 'BOOKWORM', emoji: '🤓', label: 'Mọt sách', color: '#7c3aed' },
  { type: 'INSIGHTFUL', emoji: '💡', label: 'Sâu sắc', color: '#d97706' },
];

export const REACTION_BY_TYPE = Object.fromEntries(REACTIONS.map((reaction) => [reaction.type, reaction]));

export function topReactions(reactionCounts = {}, limit = 3) {
  return REACTIONS
    .filter(({ type }) => Number(reactionCounts[type] || 0) > 0)
    .sort((a, b) => Number(reactionCounts[b.type] || 0) - Number(reactionCounts[a.type] || 0))
    .slice(0, limit);
}
