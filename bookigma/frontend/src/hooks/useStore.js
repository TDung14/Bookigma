import { useContext } from 'react';
import { AppContext, AuthContext, ThemeContext, ToastContext } from '../context/contexts';

export const useApp = () => useContext(AppContext);
export const useAuth = () => useContext(AuthContext);
export const useTheme = () => useContext(ThemeContext);
export const useToast = () => useContext(ToastContext).toast;
