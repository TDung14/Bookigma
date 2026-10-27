/**
 * Quy tắc tính tiền giỏ hàng — khớp với backend (OrderPricing.java). Backend luôn tính lại khi đặt hàng,
 * phần này chỉ để hiển thị trước cho người mua.
 */

/** Phí ship cho mỗi đơn. Khi thanh toán, giỏ được tách: mỗi shop một đơn, mỗi hộp Blind Book một đơn. */
export const SHIPPING_FEE = 25000;

/** Hộp Blind Book tính theo giá hộp, không theo giá cuốn sách được giấu bên trong. */
export const linePrice = (line) => (line.blind ? line.blind.price : line.book.price);

export const cartSubtotal = (lines) => lines.reduce((sum, line) => sum + linePrice(line) * line.qty, 0);

/** Số đơn sẽ được tạo từ giỏ hàng = số shop khác nhau + số hộp Blind Book. */
export function countParcels(lines) {
  const shops = new Set(lines.filter((line) => !line.blind).map((line) => line.book.shopId));
  return shops.size + lines.filter((line) => line.blind).length;
}

/** Gom dòng sách thường theo shop; các hộp Blind Book đứng thành nhóm riêng ở cuối. */
export function groupCartLines(lines) {
  const groups = new Map();
  lines.filter((line) => !line.blind).forEach((line) => {
    const key = line.book.shopId ?? 'none';
    if (!groups.has(key)) groups.set(key, { key, shopId: line.book.shopId, shopName: line.book.shopName, lines: [] });
    groups.get(key).lines.push(line);
  });
  const blindLines = lines.filter((line) => line.blind);
  if (blindLines.length) groups.set('blind', { key: 'blind', shopId: null, shopName: null, blind: true, lines: blindLines });
  return [...groups.values()];
}
