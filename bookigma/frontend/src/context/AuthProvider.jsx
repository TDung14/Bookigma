import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './contexts';
import { load, save } from '../lib/storage';
import { AUTH_EXPIRED_EVENT, clearAuthToken, getAuthToken, setAuthToken } from '../lib/authToken';
import { apiCall } from '../services/api';
import { getVipMe } from '../services/vipApi';
import { syncVipFromServer } from '../lib/vip';
import { avatarSrc } from '../lib/avatar';

const AUTH_STORAGE_KEY = 'authUser';

export const ROLES = Object.freeze({
  USER: 'user',
  SHOP: 'shop',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
});

function normalizeRole(role) {
  const value = String(role || '').trim().toUpperCase();

  if (value === 'ADMIN') {
    return ROLES.ADMIN;
  }

  if (value === 'MODERATOR') {
    return ROLES.MODERATOR;
  }

  if (value === 'SHOP') {
    return ROLES.SHOP;
  }

  return ROLES.USER;
}

export function homePathForRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === ROLES.ADMIN) return '/admin';
  if (normalized === ROLES.MODERATOR || normalized === ROLES.SHOP) return '/shop-admin';
  return '/';
}

/** Sau login/register: ưu tiên trang theo role, chỉ quay lại URL cũ nếu đó không phải trang chủ của role khác. */
export function resolvePostAuthPath(user, from) {
  const roleTarget = homePathForRole(user?.role);
  const requestedPath = from && from !== '/login' ? from : null;
  const isRoleHome =
    requestedPath === '/' ||
    requestedPath === '/shop-admin' ||
    requestedPath === '/admin';
  return !requestedPath || isRoleHome ? roleTarget : requestedPath;
}

function normalizeUser(apiUser) {
  if (!apiUser || !Number.isFinite(Number(apiUser.id))) {
    return null;
  }

  return {
    ...apiUser,

    id: Number(apiUser.id),

    name: apiUser.fullName || apiUser.username,

    avatar: avatarSrc(apiUser.avatarUrl),

    status:
      apiUser.active === false
        ? 'suspended'
        : 'active',

    role: normalizeRole(apiUser.role),

    points: Number(apiUser.points || 0),

    badge: apiUser.badge || 'Thành viên',

    booksRead: Number(apiUser.booksRead || 0),

    joinedAt:
      apiUser.createdAt ||
      new Date().toISOString(),
  };
}

export function AuthProvider({ children }) {

  /*
   * QUAN TRỌNG:
   *
   * Khi mở/reload trang:
   * - lấy user đã đăng nhập trước đó từ localStorage
   * - nếu không có thì user = null
   *
   * Vì vậy F5 không làm mất phiên đăng nhập.
   */
  const [user, setUser] = useState(() => {
    if (!getAuthToken()) return null;
    const savedUser = load(AUTH_STORAGE_KEY, null);

    return normalizeUser(savedUser);
  });

  /*
   * loading chỉ dùng cho các thao tác:
   * login / register / update profile.
   *
   * Không đặt user = null khi reload.
   */
  const [loading, setLoading] = useState(false);

  /*
   * Mỗi khi user thay đổi:
   *
   * - login  -> lưu user
   * - update profile -> cập nhật user
   * - logout -> xóa user
   */
  useEffect(() => {
    if (user) {
      save(AUTH_STORAGE_KEY, user);
    } else {
      save(AUTH_STORAGE_KEY, null);
    }
    window.dispatchEvent(new CustomEvent('bookigma-auth-user-updated', {
      detail: user ? { id: user.id } : null,
    }));
  }, [user]);

  /*
   * Khôi phục phiên từ token khi mở lại trang: /auth/me xác nhận token còn hiệu lực
   * và trả hồ sơ mới nhất (role có thể đã thay đổi ở backend).
   */
  useEffect(() => {
    if (!getAuthToken()) return undefined;

    let cancelled = false;
    apiCall('/auth/me')
      .then((apiUser) => {
        if (cancelled) return;
        const normalized = normalizeUser(apiUser);
        if (normalized) {
          setUser(normalized);
        } else {
          clearAuthToken();
          setUser(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        clearAuthToken();
        setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* Backend đã từ chối token: xóa phiên ngay để route bảo vệ chuyển về đăng nhập. */
  useEffect(() => {
    const handleExpired = () => {
      clearAuthToken();
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  const startSession = useCallback((response) => {
    const token = response?.token;
    const normalized = normalizeUser(response?.user);

    if (!token || !normalized) {
      clearAuthToken();
      return null;
    }

    setAuthToken(token);
    setUser(normalized);
    return normalized;
  }, []);

  /*
   * Đăng nhập
   */
  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);

      const response = await apiCall(
        '/auth/login',
        'POST',
        {
          username: String(username || '').trim(),
          password: String(password || ''),
        }
      );

      const normalized = startSession(response);

      if (!normalized) {
        return {
          ok: false,
          error: 'Dữ liệu tài khoản từ server không hợp lệ.',
        };
      }

      return {
        ok: true,
        user: normalized,
      };

    } catch (error) {
      return {
        ok: false,
        error:
          error.message ||
          'Đăng nhập thất bại.',
      };

    } finally {
      setLoading(false);
    }
  }, [startSession]);

  /*
   * Đăng nhập bằng Google
   */
  const loginWithGoogle = useCallback(async (credential) => {
    if (!credential) {
      return {
        ok: false,
        error: 'Không nhận được thông tin xác thực từ Google.',
      };
    }

    try {
      setLoading(true);

      const response = await apiCall(
        '/auth/google',
        'POST',
        { credential }
      );

      const normalized = startSession(response);

      if (!normalized) {
        return {
          ok: false,
          error: 'Dữ liệu tài khoản từ server không hợp lệ.',
        };
      }

      return {
        ok: true,
        user: normalized,
      };

    } catch (error) {
      return {
        ok: false,
        error:
          error.message ||
          'Đăng nhập Google thất bại.',
      };

    } finally {
      setLoading(false);
    }
  }, [startSession]);

  /*
   * Đăng ký
   */
  const register = useCallback(async (data) => {
    try {
      setLoading(true);

      // Tài khoản mới chưa đăng nhập được cho tới khi bấm link xác thực email.
      const response = await apiCall(
        '/auth/register',
        'POST',
        {
          username: String(data.username || '').trim(),
          email: String(data.email || '').trim(),
          password: String(data.password || ''),
          fullName: String(data.fullName || '').trim(),
        }
      );

      return {
        ok: true,
        data: response,
      };

    } catch (error) {

      return {
        ok: false,
        error:
          error.message ||
          'Đăng ký thất bại.',
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * Xác thực email bằng token trong link; thành công thì đăng nhập luôn.
   */
  const verifyEmail = useCallback(async (token) => {
    if (!token) {
      return {
        ok: false,
        error: 'Thiếu mã xác thực trong link.',
      };
    }

    try {
      setLoading(true);

      const response = await apiCall(
        '/auth/verify-email',
        'POST',
        { token }
      );

      const normalized = startSession(response);

      if (!normalized) {
        return {
          ok: false,
          error: 'Dữ liệu tài khoản từ server không hợp lệ.',
        };
      }

      return {
        ok: true,
        user: normalized,
      };

    } catch (error) {
      return {
        ok: false,
        error:
          error.message ||
          'Không thể xác thực email.',
      };

    } finally {
      setLoading(false);
    }
  }, [startSession]);

  /*
   * Cập nhật profile
   */
  const updateProfile = useCallback(
    async (data) => {

      if (!user?.id) {
        return {
          ok: false,
          error: 'Bạn chưa đăng nhập.',
        };
      }

      try {
        setLoading(true);

        const apiUser = await apiCall(
          `/users/${user.id}/profile`,
          'PUT',
          {
            email: data.email,
            fullName: data.fullName,
            bio: data.bio,
            avatarUrl: data.avatarUrl,
          },
          { userId: user.id }
        );

        const normalized = normalizeUser(apiUser);

        if (!normalized) {
          return {
            ok: false,
            error:
              'Dữ liệu profile từ server không hợp lệ.',
          };
        }

        /*
         * Giữ lại các dữ liệu frontend
         * không có trong UserProfileDto.
         */
        const updatedUser = {
          ...user,
          ...normalized,

          id: user.id,

          role: normalized.role || user.role,

          points:
            user.points ?? 0,

          badge:
            user.badge || 'Thành viên',

          booksRead:
            user.booksRead ?? 0,
        };

        setUser(updatedUser);

        return {
          ok: true,
          user: updatedUser,
        };

      } catch (error) {

        return {
          ok: false,
          error:
            error.message ||
            'Không thể cập nhật hồ sơ.',
        };

      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /*
   * API cũ.
   *
   * Giữ lại để các component cũ không bị crash.
   */
  const loginAs = useCallback((id) => {

    setUser((current) => {

      if (!current) {
        return current;
      }

      if (current.id !== id) {
        return current;
      }

      return current;
    });

  }, []);

  /*
   * LOGOUT
   *
   * Đây là nơi DUY NHẤT làm mất phiên đăng nhập
   * trong flow bình thường.
   */
  const logout = useCallback(() => {

    // Token là nguồn xác thực duy nhất — xóa trước để mọi request sau đó là khách.
    clearAuthToken();

    // Xóa state React
    setUser(null);

    // Xóa phiên đăng nhập
    save(AUTH_STORAGE_KEY, null);

    /*
     * Xóa thêm key "user" cũ nếu phiên bản trước
     * từng sử dụng components/Auth.jsx.
     */
    try {
      localStorage.removeItem('user');
    } catch {
      // ignore
    }

  }, []);

  const updateUserFields = useCallback((fields) => {
    setUser((current) => (current ? { ...current, ...fields } : current));
  }, []);

  const vipUserId = user?.id ?? null;

  // VIP do backend quyết định; đồng bộ vào cache để các trang dùng chung useVip.
  useEffect(() => {
    if (!vipUserId) return undefined;
    let cancelled = false;
    getVipMe(vipUserId)
      .then((vip) => {
        if (!cancelled) syncVipFromServer(vipUserId, vip);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [vipUserId]);

  const value = useMemo(
    () => ({
      ROLES,

      user,

      userId:
        user?.id ?? null,

      isLoggedIn:
        !!user,

      isAdmin:
        user?.role === ROLES.ADMIN,

      isModerator:
        user?.role === ROLES.MODERATOR,

      isShop:
        user?.role === ROLES.SHOP,

      isSeller:
        user?.role === ROLES.SHOP ||
        user?.role === ROLES.MODERATOR,

      loading,

      login,

      loginWithGoogle,

      register,

      verifyEmail,

      updateProfile,

      updateUserFields,

      loginAs,

      logout,
    }),
    [
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      updateProfile,
      updateUserFields,
      loginAs,
      logout,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}