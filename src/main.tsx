import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './lib/query-client';
import { AuthProvider } from './features/auth/AuthContext';
import App from './App';
import './index.css';

const redirecionamento = new URLSearchParams(window.location.search).get('redirect');
if (redirecionamento?.startsWith('/') && !redirecionamento.startsWith('//')) {
  window.history.replaceState(null, '', redirecionamento);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
