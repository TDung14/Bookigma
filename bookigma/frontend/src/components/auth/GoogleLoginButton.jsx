import { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let googleScriptPromise = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => {
        googleScriptPromise = null;
        reject(new Error('Không tải được Google Login.'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleScriptPromise = null;
      reject(new Error('Không tải được Google Login.'));
    };
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

/** Nút đăng nhập Google Identity Services; chỉ hiển thị khi đã cấu hình Client ID. */
export default function GoogleLoginButton({ onCredential }) {
  const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const containerRef = useRef(null);
  const credentialHandlerRef = useRef(onCredential);
  const [error, setError] = useState('');

  useEffect(() => {
    credentialHandlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || !containerRef.current) {
      return undefined;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) {
          return;
        }

        if (!window.google?.accounts?.id) {
          setError('Không tải được Google Login. Vui lòng thử lại.');
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: (response) => {
            const credential = response?.credential;
            if (!credential) {
              setError('Không nhận được thông tin xác thực từ Google.');
              return;
            }
            setError('');
            credentialHandlerRef.current?.(credential);
          },
        });

        const container = containerRef.current;
        container.innerHTML = '';
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: document.documentElement.getAttribute('data-theme') === 'dark'
            ? 'filled_black'
            : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'vi',
          width: Math.max(200, Math.min(container.clientWidth || 320, 400)),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError('Không tải được Google Login. Vui lòng thử lại.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) {
    return null;
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--text-sub)',
          fontSize: 12,
          marginBottom: 10,
        }}
      >
        <span style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
        hoặc
        <span style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
      </div>

      <div
        ref={containerRef}
        style={{ display: 'flex', justifyContent: 'center', minHeight: 40 }}
      />

      {error && (
        <p style={{ color: '#dc2626', fontSize: 13, margin: '8px 0 0', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
