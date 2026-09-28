import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext, AppContext } from './contexts';
import { load, save } from '../lib/storage';

export function AuthProvider({ children }) {
  const { users } = useContext(AppContext);
  const [userId, setUserId] = useState(() => load('session', 'u1'));

  useEffect(() => save('session', userId), [userId]);

  const user = useMemo(() => users.find((u) => u.id === userId) || null, [users, userId]);

  const login = useCallback(
    (email, password) => {
      const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!found) return { ok: false, error: 'Không tìm thấy tài khoản với email này.' };
      if (found.password !== password) return { ok: false, error: 'Mật khẩu không đúng.' };
      if (found.status === 'suspended') return { ok: false, error: 'Tài khoản đã bị khóa. Liên hệ quản trị viên.' };
      setUserId(found.id);
      return { ok: true, user: found };
    },
    [users]
  );

  const loginAs = useCallback((id) => setUserId(id), []);
  const logout = useCallback(() => setUserId(null), []);

  const value = useMemo(
    () => ({
      user,
      userId,
      isLoggedIn: !!user,
      isAdmin: user?.role === 'admin',
      isShop: user?.role === 'shop',
      login,
      loginAs,
      logout,
    }),
    [user, userId, login, loginAs, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
