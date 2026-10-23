import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AiModelProvider } from './context/AiModelContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AiModelProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AiModelProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
