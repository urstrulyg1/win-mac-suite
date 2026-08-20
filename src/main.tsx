import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import './index.css';
import App from './App';
import { ToastProvider } from './components/Toast';
import { easeOut } from './motion';

import ErrorBoundary from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: easeOut }}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
);
