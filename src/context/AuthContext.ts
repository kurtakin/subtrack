import { createContext } from 'react';
import { AuthContextType } from '../types';

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
  toggleDarkMode: () => {},
  darkMode: false,
  openAuthModal: () => {},
  signInWithLocalEmail: () => {},
});
