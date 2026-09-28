import { useState } from 'react';
import Modal from './Modal';
import { Field } from './ui';
import { useApp, useAuth, useToast } from '../../hooks/useStore';

const REASONS = [
  'Nội dung không phù hợp / phản cảm',
  'Sách lậu, vi phạm bản quyền',
  'Spam / quảng cáo',
  'Lừa đảo, gian lận giao dịch',
  'Thông tin sai lệch',
  'Quấy rối, xúc phạm người khác',
  'Lý do khác',
];

/**
 * Hộp thoại báo cáo vi phạm dùng chung cho bài đăng, sản phẩm, người dùng, bình luận
 * và tin trao đổi. Báo cáo được đẩy thẳng vào hàng chờ của Admin.
 */
export default function ReportModal({ open, onClose, type, targetId, targetLabel }) {
  const { addReport } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState('');

  const submit = () => {
    addReport({ type, targetId, targetLabel, reporterId: user.id, reason, detail: detail.trim() });
    toast('Đã gửi báo cáo. Quản trị viên sẽ xem xét trong 24 giờ.');
    setDetail('');
    setReason(REASONS[0]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Báo cáo vi phạm"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-danger" onClick={submit}>Gửi báo cáo</button>
        </>
      }
    >
      <p className="small muted" style={{ marginTop: 0 }}>
        Bạn đang báo cáo: <b style={{ color: 'var(--text-main)' }}>{targetLabel}</b>
      </p>

      <div className="field">
        <label className="label">Lý do báo cáo</label>
        <div className="stack" style={{ gap: 8 }}>
          {REASONS.map((r) => (
            <label key={r} className="row" style={{ cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} />
              <span>{r}</span>
            </label>
          ))}
        </div>
      </div>

      <Field label="Mô tả chi tiết (không bắt buộc)" style={{ marginBottom: 0 }}>
        {(id) => (
          <textarea
            id={id}
            className="textarea"
            placeholder="Cung cấp thêm thông tin giúp quản trị viên xử lý nhanh hơn..."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        )}
      </Field>
    </Modal>
  );
}
