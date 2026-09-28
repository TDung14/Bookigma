import { useId } from 'react';
import { Inbox, Star } from 'lucide-react';

/**
 * Gói nhãn + ô nhập vào một khối và tự nối chúng với nhau bằng id sinh tự động,
 * để bấm vào nhãn là focus đúng ô nhập và trình đọc màn hình đọc đúng tên trường.
 */
export function Field({ label, hint, children, style }) {
  const id = useId();
  return (
    <div className="field" style={style}>
      <label className="label" htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <div className="tiny muted" style={{ marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="empty">
      <Icon size={44} />
      <h4 style={{ margin: '0 0 6px' }}>{title}</h4>
      {hint && <p className="small" style={{ margin: '0 0 14px' }}>{hint}</p>}
      {action}
    </div>
  );
}

export function Rating({ value, count, size = 15 }) {
  return (
    <span className="row" style={{ gap: 4, color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
      <Star size={size} fill="#f59e0b" strokeWidth={0} />
      {value?.toFixed ? value.toFixed(1) : value}
      {count !== undefined && <span className="muted" style={{ fontWeight: 400 }}>({count.toLocaleString('vi-VN')})</span>}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, sub, color = 'var(--accent-green)', bg = 'var(--accent-soft)' }) {
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="stat-icon" style={{ background: bg }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color }}>{value}</div>
          {sub && <div className="tiny muted" style={{ marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({ percent, height = 6 }) {
  return (
    <div className="progress-track" style={{ height }}>
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

export function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div className="row-between" style={{ marginBottom: 14 }}>
      <h3 className="row" style={{ margin: 0, fontSize: 17, gap: 8 }}>
        {Icon && <Icon size={19} color="var(--accent-green)" />}
        {children}
      </h3>
      {right}
    </div>
  );
}
