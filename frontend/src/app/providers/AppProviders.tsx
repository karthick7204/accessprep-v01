/**
 * ACCESSPREP-X — Application Providers
 */

import React from 'react';
import { AccessibilityProvider } from '../../context/AccessibilityContext.tsx';
import { ErrorBoundary } from '../../components/common/ErrorBoundary.tsx';

export interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>{children}</AccessibilityProvider>
    </ErrorBoundary>
  );
}
