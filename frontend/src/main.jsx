import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Global interceptors to prevent blocking browser popups/dialogs
window.alert = (msg) => {
  console.log(
    `%c⚠️ ALERT INTERCEPTED %c ${msg}`,
    'background: #fbbf24; color: #000; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    'color: #fbbf24; font-weight: 500;'
  );
};

window.confirm = (msg) => {
  console.log(
    `%c❓ CONFIRM INTERCEPTED (Auto-Approved) %c ${msg}`,
    'background: #a78bfa; color: #000; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    'color: #a78bfa; font-weight: 500;'
  );
  return true;
};


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

