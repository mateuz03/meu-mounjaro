import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App';
import { registerPwa } from './lib/pwa';
import { registerNativeAuthBridge } from './lib/nativeAuth';

registerPwa();
registerNativeAuthBridge();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
