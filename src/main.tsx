// Ensure window.fetch has a getter and setter to prevent "Cannot set property fetch of #<Window> which has only a getter"
(() => {
  try {
    let currentFetch = window.fetch;
    if (currentFetch) {
      Object.defineProperty(window, 'fetch', {
        get() {
          return currentFetch;
        },
        set(newFetch) {
          if (typeof newFetch === 'function') {
            currentFetch = newFetch;
          }
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {
    try {
      const proto = Object.getPrototypeOf(window);
      let protoFetch = window.fetch;
      if (proto && protoFetch) {
        Object.defineProperty(proto, 'fetch', {
          get() {
            return protoFetch;
          },
          set(newFetch) {
            if (typeof newFetch === 'function') {
              protoFetch = newFetch;
            }
          },
          configurable: true,
          enumerable: true,
        });
      }
    } catch {}
  }
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
