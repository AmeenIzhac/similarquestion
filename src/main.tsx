import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { MobileUpload } from './components/MobileUpload';
import './index.css';
import './posthog';
import posthog from './posthog';

const params = new URLSearchParams(window.location.search);
const mobileMode = params.get('mobile');
const sessionId = params.get('session');

let root: React.ReactNode;
if (mobileMode === 'upload' && sessionId) {
  root = <MobileUpload sessionId={sessionId} />;
} else {
  posthog.startSessionRecording();
  root = <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{root}</StrictMode>
);
