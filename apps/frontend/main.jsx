import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App.jsx';
import ErrorBoundary from './src/components/ErrorBoundary.jsx';
import { AuthProvider } from './src/contexts/AuthContext.jsx';
import './src/styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
