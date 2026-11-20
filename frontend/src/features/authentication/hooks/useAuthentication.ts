/**
 * ACCESSPREP-X — useAuthentication Hook
 */

import { useCallback } from 'react';
import { useAccessibility } from '../../../context/AccessibilityContext.tsx';
import {
  fetchVerificationChallenge,
  verifySpokenChallenge,
  loginCandidate,
  registerCandidate
} from '../services/auth.service.ts';

export function useAuthentication() {
  const { user, setUser, logout, navigateTo, speakText, announce } = useAccessibility();

  const handleLogout = useCallback(() => {
    logout();
    announce('Logged out successfully.', 'polite');
  }, [logout, announce]);

  return {
    user,
    setUser,
    logout: handleLogout,
    navigateTo,
    speakText,
    announce,
    fetchVerificationChallenge,
    verifySpokenChallenge,
    loginCandidate,
    registerCandidate
  };
}
