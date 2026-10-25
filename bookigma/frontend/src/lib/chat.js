const normalizeId = (value) => String(value ?? '');

/** Tên hiển thị của hội thoại: chat 1-1 dùng tên người còn lại, nhóm dùng tên nhóm. */
export function conversationTitle(conv, currentUserId, userById) {
  if (!conv) return 'Trò chuyện';
  if (conv.type !== 'DIRECT') return conv.name || 'Trò chuyện';

  const partnerId = (conv.participants || []).find((id) => normalizeId(id) !== normalizeId(currentUserId));
  const partner = partnerId ? userById(partnerId) : null;
  return partner?.name || 'Trò chuyện';
}
