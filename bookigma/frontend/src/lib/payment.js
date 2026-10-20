/**
 * Tài khoản nhận tiền cho đơn chuyển khoản / MoMo. Mã VietQR theo chuẩn NAPAS 247 nên quét được
 * bằng mọi app ngân hàng và cả app MoMo (MoMo chuyển thẳng vào tài khoản ngân hàng này).
 */
export const PAYEE = {
  bankBin: '970415', // VietinBank
  bankName: 'VietinBank',
  accountNo: '103879398170',
  accountName: 'TRAN TRUNG DUNG',
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
