import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { pwaService } from './services/pwa-service'
import { indexedDBService } from './services/indexeddb-service'

// Initialize PWA and offline services
async function initializeServices() {
  try {
    // Initialize IndexedDB first
    await indexedDBService.initialize();
    console.log('IndexedDB service initialized');

    // Initialize PWA service
    if (pwaService.isSupported()) {
      await pwaService.initialize();
      console.log('PWA service initialized');
    } else {
      console.warn('PWA features not supported in this browser');
    }
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
}

// Initialize services and render app
initializeServices().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}).catch(error => {
  console.error('Failed to start application:', error);

  // Render app anyway, but without PWA features
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
