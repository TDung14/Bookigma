import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './contexts';
import { load, save } from '../lib/storage';
import * as seed from '../data/seed';
import { apiCall, getApiErrorMessage } from '../services/api';
import { useApp } from '../hooks/useStore';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?img=12';

const AUTH_STORAGE_KEY = 'authUser';

export const ROLES = Object.freeze({
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
});

function normalizeRole(role) {
  const value = String(role || '').trim().toUpperCase();

  if (value === 'ADMIN') {
    return ROLES.ADMIN;
  }

  if (value === 'MODERATOR' || value === 'SHOP') {
    return ROLES.MODERATOR;
  }

  return ROLES.USER;
}

function normalizeUser(apiUser) {
  if (!apiUser || !Number.isFinite(Number(apiUser.id))) {
    return null;
  }

  return {
    ...apiUser,

    id: Number(apiUser.id),

    name: apiUser.fullName || apiUser.username,

    avatar: apiUser.avatarUrl || DEFAULT_AVATAR,

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
   * Đăng nhập
   */
  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);

      const apiUser = await apiCall(
        '/auth/login',
        'POST',
        {
          username,
          password,
        }
      );

      const normalized = normalizeUser(apiUser);

      if (!normalized) {
        return {
          ok: false,
          error: 'Dữ liệu tài khoản từ server không hợp lệ.',
        };
      }

      /*
       * Lưu ngay vào React state.
       *
       * useEffect phía trên sẽ tự động lưu
       * vào localStorage.
       */
      setUser(normalized);

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
  }, []);

  /*
   * Đăng ký
   */
  const register = useCallback(async (data) => {
    try {
      setLoading(true);

      const apiUser = await apiCall(
        '/auth/register',
        'POST',
        {
          username: data.username,
          email: data.email,
          password: data.password,
          fullName: data.fullName,
        }
      );

      const normalized = normalizeUser(apiUser);

      if (!normalized) {
        return {
          ok: false,
          error: 'Dữ liệu tài khoản từ server không hợp lệ.',
        };
      }

      /*
       * Sau khi đăng ký thành công,
       * tài khoản cũng được đăng nhập luôn.
       */
      setUser(normalized);

      return {
        ok: true,
        user: normalized,
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
          }
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
        user?.role === ROLES.MODERATOR,

      loading,

      login,

      register,

      updateProfile,

      loginAs,

      logout,
    }),
    [
      user,
      loading,
      login,
      register,
      updateProfile,
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