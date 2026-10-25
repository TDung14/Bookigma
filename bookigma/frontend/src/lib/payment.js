/**
 * Tài khoản nhận tiền cho đơn chuyển khoản / MoMo. Mã VietQR theo chuẩn NAPAS 247 nên quét được
 * bằng mọi app ngân hàng và cả app MoMo (MoMo chuyển thẳng vào tài khoản ngân hàng này).
 * Có thể đổi tài khoản nhận tiền trong frontend/.env.local rồi khởi động lại Vite.
 */
const env = import.meta.env;

export const PAYEE = {
  bankBin: String(env.VITE_PAYEE_BANK_BIN || '970415').trim(),
  bankName: String(env.VITE_PAYEE_BANK_NAME || 'VietinBank').trim(),
  accountNo: String(env.VITE_PAYEE_ACCOUNT_NO || '102883675211').trim(),
  accountName: String(env.VITE_PAYEE_ACCOUNT_NAME || 'DO DUC ANH').trim(),
};

/** Chuyển khoản và MoMo phải trả trước (quét mã QR); COD trả khi nhận hàng. */
export const isPrepaid = (payment) => payment === 'bank' || payment === 'momo';

/** Ảnh mã VietQR đã điền sẵn số tiền và nội dung chuyển khoản (mã đơn để shop đối chiếu). */
export function vietQrUrl(amount, content) {
  const params = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: content,
    accountName: PAYEE.accountName,
  });
  return `https://img.vietqr.io/image/${PAYEE.bankBin}-${PAYEE.accountNo}-compact2.png?${params}`;
}
