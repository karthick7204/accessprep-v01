/**
 * ACCESSPREP-X — Modular Application Root
 */

import React from 'react';
import { AccessibilityProvider } from '../context/AccessibilityContext.tsx';
import { PortalLayout } from './layouts/PortalLayout.tsx';
import { ScreenRouter } from './routes/ScreenRouter.tsx';

export function App() {
  return (
    <AccessibilityProvider>
      <PortalLayout>
        <ScreenRouter />
      </PortalLayout>
    </AccessibilityProvider>
  );
}

export default App;
