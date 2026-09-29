import { useState } from 'react';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  BookOpen,
  LogIn,
  UserPlus,
} from 'lucide-react';

import {
  useAuth,
  useToast,
} from '../../hooks/useStore';

export default function LoginPage() {

  const {
    login,
    register,
    loading,
  } = useAuth();

  const toast = useToast();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const from =
    location.state?.from || '/';

  const [mode, setMode] =
    useState('login');

  const [loginUsername, setLoginUsername] =
    useState('');

  const [loginPassword, setLoginPassword] =
    useState('');

  const [regFullName, setRegFullName] =
    useState('');

  const [regUsername, setRegUsername] =
    useState('');

  const [regEmail, setRegEmail] =
    useState('');

  const [regPassword, setRegPassword] =
    useState('');

  const [regConfirmPassword, setRegConfirmPassword] =
    useState('');

  const [error, setError] =
    useState('');

  const switchMode = (nextMode) => {

    setMode(nextMode);

    setError('');
  };

  const handleLoginSubmit =
    async (event) => {

      event.preventDefault();

      setError('');

      if (!loginUsername.trim()) {

        setError(
          'Vui lòng nhập tên đăng nhập hoặc email.'
        );

        return;
      }

      if (!loginPassword) {

        setError(
          'Vui lòng nhập mật khẩu.'
        );

        return;
      }

      const result =
        await login(
          loginUsername,
          loginPassword
        );

      if (!result.ok) {

        setError(result.error);

        return;
      }

      toast(
        `Xin chào ${
          result.user.fullName ||
          result.user.username
        }!`
      );

      navigate(
        from,
        { replace: true }
      );
    };

  const handleRegisterSubmit =
    async (event) => {

      event.preventDefault();

      setError('');

      if (
        regPassword.length < 6
      ) {

        setError(
          'Mật khẩu phải có ít nhất 6 ký tự.'
        );

        return;
      }

      if (
        regPassword !==
        regConfirmPassword
      ) {

        setError(
          'Mật khẩu nhập lại không khớp.'
        );

        return;
      }

      const result =
        await register({
          fullName:
            regFullName,

          username:
            regUsername,

          email:
            regEmail,

          password:
            regPassword,
        });

      if (!result.ok) {

        setError(result.error);

        return;
      }

      toast(
        'Đăng ký tài khoản thành công!'
      );

      navigate(
        '/',
        { replace: true }
      );
    };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns:
          '1fr 1fr',
      }}
    >

      <div
        className="hide-lg"
        style={{
          background:
            'linear-gradient(140deg, #16a34a 0%, #15803d 55%, #064e3b 100%)',

          color: '#fff',

          padding:
            '56px 48px',

          display: 'flex',

          flexDirection:
            'column',

          justifyContent:
            'center',
        }}
      >

        <div
          className="row"
          style={{
            gap: 12,
            fontSize: 30,
            fontWeight: 800,
            marginBottom: 20,
          }}
        >

          <BookOpen size={38} />

          Bookigma

        </div>

        <h2
          style={{
            color: '#fff',
            fontSize: 30,
            lineHeight: 1.25,
            margin:
              '0 0 14px',
            maxWidth: 460,
          }}
        >
          Nơi người yêu sách mua,
          đọc, trao đổi và kết nối
          với nhau
        </h2>

        <p
          style={{
            opacity: 0.9,
            maxWidth: 460,
            lineHeight: 1.65,
            margin:
              '0 0 28px',
          }}
        >
          Tạo tài khoản Bookigma
          để lưu thông tin cá nhân,
          đăng bài và kết nối với
          cộng đồng.
        </p>

      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background:
            'var(--bg-primary)',
        }}
      >

        <div
          style={{
            width: '100%',
            maxWidth: 420,
          }}
        >

          <div
            style={{
              display: 'flex',
              marginBottom: 20,
              borderBottom:
                '1px solid var(--border-color)',
            }}
          >

            <button
              type="button"
              onClick={() =>
                switchMode('login')
              }
              style={{
                flex: 1,
                padding:
                  '10px 0',
                background:
                  'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight:
                  mode === 'login'
                    ? 'bold'
                    : 'normal',
                color:
                  mode === 'login'
                    ? '#16a34a'
                    : 'inherit',
                borderBottom:
                  mode === 'login'
                    ? '2px solid #16a34a'
                    : 'none',
              }}
            >
              Đăng nhập
            </button>

            <button
              type="button"
              onClick={() =>
                switchMode('register')
              }
              style={{
                flex: 1,
                padding:
                  '10px 0',
                background:
                  'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight:
                  mode === 'register'
                    ? 'bold'
                    : 'normal',
                color:
                  mode === 'register'
                    ? '#16a34a'
                    : 'inherit',
                borderBottom:
                  mode === 'register'
                    ? '2px solid #16a34a'
                    : 'none',
              }}
            >
              Đăng ký
            </button>

          </div>

          {mode === 'login' ? (

            <form
              onSubmit={
                handleLoginSubmit
              }
              className="card"
              style={{
                padding: 20,
              }}
            >

              <h2
                style={{
                  margin:
                    '0 0 16px',
                }}
              >
                Đăng nhập hệ thống
              </h2>

              <div
                className="field"
                style={{
                  marginBottom: 12,
                }}
              >

                <label className="label">
                  Tên đăng nhập hoặc Email
                </label>

                <input
                  className="input"
                  type="text"
                  value={
                    loginUsername
                  }
                  onChange={(event) =>
                    setLoginUsername(
                      event.target.value
                    )
                  }
                  autoComplete="username"
                  required
                />

              </div>

              <div
                className="field"
                style={{
                  marginBottom: 12,
                }}
              >

                <label className="label">
                  Mật khẩu
                </label>

                <input
                  className="input"
                  type="password"
                  value={
                    loginPassword
                  }
                  onChange={(event) =>
                    setLoginPassword(
                      event.target.value
                    )
                  }
                  autoComplete="current-password"
                  required
                />

              </div>

              {error && (
                <div
                  className="badge badge-red"
                  style={{
                    marginBottom: 12,
                    padding: 8,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={loading}
              >
                <LogIn size={17} />

                {loading
                  ? 'Đang đăng nhập...'
                  : 'Đăng nhập'}
              </button>

            </form>

          ) : (

            <form
              onSubmit={
                handleRegisterSubmit
              }
              className="card"
              style={{
                padding: 20,
              }}
            >

              <h2
                style={{
                  margin:
                    '0 0 16px',
                }}
              >
                Tạo tài khoản mới
              </h2>

              <div
                className="field"
                style={{
                  marginBottom: 10,
                }}
              >

                <label className="label">
                  Họ và tên
                </label>

                <input
                  className="input"
                  type="text"
                  value={
                    regFullName
                  }
                  onChange={(event) =>
                    setRegFullName(
                      event.target.value
                    )
                  }
                  required
                />

              </div>

              <div
                className="field"
                style={{
                  marginBottom: 10,
                }}
              >

                <label className="label">
                  Tên đăng nhập
                </label>

                <input
                  className="input"
                  type="text"
                  value={
                    regUsername
                  }
                  onChange={(event) =>
                    setRegUsername(
                      event.target.value
                    )
                  }
                  autoComplete="username"
                  required
                />

              </div>

              <div
                className="field"
                style={{
                  marginBottom: 10,
                }}
              >

                <label className="label">
                  Email
                </label>

                <input
                  className="input"
                  type="email"
                  value={
                    regEmail
                  }
                  onChange={(event) =>
                    setRegEmail(
                      event.target.value
                    )
                  }
                  autoComplete="email"
                  required
                />

              </div>

              <div
                className="field"
                style={{
                  marginBottom: 10,
                }}
              >

                <label className="label">
                  Mật khẩu
                </label>

                <input
                  className="input"
                  type="password"
                  value={
                    regPassword
                  }
                  onChange={(event) =>
                    setRegPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required
                />

              </div>

              <div
                className="field"
                style={{
                  marginBottom: 12,
                }}
              >

                <label className="label">
                  Xác nhận mật khẩu
                </label>

                <input
                  className="input"
                  type="password"
                  value={
                    regConfirmPassword
                  }
                  onChange={(event) =>
                    setRegConfirmPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required
                />

              </div>

              {error && (
                <div
                  className="badge badge-red"
                  style={{
                    marginBottom: 12,
                    padding: 8,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={loading}
              >

                <UserPlus size={17} />

                {loading
                  ? 'Đang đăng ký...'
                  : 'Đăng ký ngay'}

              </button>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}