import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import PwaBar from './PwaBar';
import { initPwa } from './pwa';
import './index.css';

initPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PwaBar />
  </StrictMode>
);
