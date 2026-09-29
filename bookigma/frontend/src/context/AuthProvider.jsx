import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './contexts';
import { load, save } from '../lib/storage';
import { apiCall } from '../services/api';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?img=12';

function normalizeUser(apiUser) {
  if (!apiUser || !Number.isFinite(Number(apiUser.id))) return null;

  return {
    ...apiUser,
    id: apiUser.id,
    name: apiUser.fullName || apiUser.username,
    avatar: apiUser.avatarUrl || DEFAULT_AVATAR,
    status: apiUser.active === false ? 'suspended' : 'active',
    role: (apiUser.role || 'user').toLowerCase(),
    points: 0,
    badge: 'Thành viên',
    booksRead: 0,
    joinedAt: apiUser.createdAt || new Date().toISOString(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => normalizeUser(load('authUser', null)));
  const [loading, setLoading] = useState(false);

  useEffect(() => save('authUser', user), [user]);

  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);
      const apiUser = await apiCall('/auth/login', 'POST', { username, password });
      const normalized = normalizeUser(apiUser);
      setUser(normalized);
      return { ok: true, user: normalized };
    } catch (error) {
      return { ok: false, error: error.message || 'Đăng nhập thất bại.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data) => {
    try {
      setLoading(true);
      const apiUser = await apiCall('/auth/register', 'POST', {
        username: data.username,
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });
      const normalized = normalizeUser(apiUser);
      setUser(normalized);
      return { ok: true, user: normalized };
    } catch (error) {
      return { ok: false, error: error.message || 'Đăng ký thất bại.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    if (!user?.id) return { ok: false, error: 'Bạn chưa đăng nhập.' };

    try {
      setLoading(true);
      const apiUser = await apiCall(`/users/${user.id}/profile`, 'PUT', {
        email: data.email,
        fullName: data.fullName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      });
      const normalized = normalizeUser(apiUser);
      setUser(normalized);
      return { ok: true, user: normalized };
    } catch (error) {
      return { ok: false, error: error.message || 'Không thể cập nhật hồ sơ.' };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loginAs = useCallback((id) => {
    // Giữ API cũ để các màn hình demo không bị crash.
    setUser((current) => current && current.id === id ? current : current);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    save('authUser', null);
  }, []);

  const value = useMemo(() => ({
    user,
    userId: user?.id ?? null,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    isShop: user?.role === 'shop',
    loading,
    login,
    register,
    updateProfile,
    loginAs,
    logout,
  }), [user, loading, login, register, updateProfile, loginAs, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
