import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  MailCheck,
  XCircle,
} from 'lucide-react';

import { useAuth } from '../../hooks/useStore';
import { resolvePostAuthPath } from '../../context/AuthProvider';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') || '').trim();

  const { verifyEmail } = useAuth();
  const navigate = useNavigate();

  // StrictMode chạy effect hai lần; token chỉ được dùng một lần nên chặn lần thứ hai.
  const startedRef = useRef(false);
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    if (!token) {
      setStatus('error');
      setMessage('Link xác thực thiếu mã token.');
      return;
    }

    verifyEmail(token).then((result) => {
      if (result.ok) {
        setStatus('success');
        setVerifiedUser(result.user);
      } else {
        setStatus('error');
        setMessage(result.error);
      }
    });
  }, [token, verifyEmail]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'var(--bg-primary)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 460,
          padding: 28,
          textAlign: 'center',
        }}
      >
        <img
          src="/logo.png"
          alt="Bookigma"
          width={72}
          height={72}
          style={{ borderRadius: 16, marginBottom: 12 }}
        />

        {status === 'verifying' && (
          <>
            <Loader2 size={40} color="#16a34a" style={{ marginBottom: 8 }} />
            <h2 style={{ margin: '0 0 8px' }}>Đang xác thực email...</h2>
            <p className="small muted" style={{ margin: 0 }}>
              Vui lòng chờ trong giây lát.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={44} color="#16a34a" style={{ marginBottom: 8 }} />
            <h2 style={{ margin: '0 0 8px' }}>Xác thực email thành công</h2>
            <p className="small muted" style={{ margin: '0 0 16px', lineHeight: 1.6 }}>
              Tài khoản <strong>{verifiedUser?.email}</strong> đã được kích hoạt.
              Bạn có thể sử dụng Bookigma ngay bây giờ.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-block btn-lg"
              onClick={() => navigate(resolvePostAuthPath(verifiedUser), { replace: true })}
            >
              Vào Bookigma
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-block"
              style={{ marginTop: 8 }}
              onClick={() => navigate('/login', { replace: true })}
            >
              Đi tới trang đăng nhập
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={44} color="#dc2626" style={{ marginBottom: 8 }} />
            <h2 style={{ margin: '0 0 8px' }}>Không thể xác thực email</h2>
            <p className="small muted" style={{ margin: '0 0 16px', lineHeight: 1.6 }}>
              {message || 'Link xác thực không hợp lệ hoặc đã hết hạn.'}
            </p>

            <div
              className="badge badge-amber"
              style={{ display: 'block', padding: 10, marginBottom: 16, textAlign: 'left' }}
            >
              <MailCheck size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Bạn có thể vào trang đăng nhập và chọn “Gửi lại email xác thực”
              để nhận link mới.
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block btn-lg"
              onClick={() => navigate('/login', { replace: true })}
            >
              Về trang đăng nhập
            </button>
          </>
        )}
      </div>
    </div>
  );
}
