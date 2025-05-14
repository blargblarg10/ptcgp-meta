import '@styles/custom.css';
import '@styles/tailwind.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import App from './App';
import { AppAuthProvider } from './features/auth/context/AppAuthProvider';

// Get the base path from the import.meta.env, defaulting to '/' for development
const basePath = import.meta.env.BASE_URL || '/';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AppAuthProvider>
        <App />
      </AppAuthProvider>
    </HashRouter>
  </StrictMode>
);
