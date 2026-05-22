import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CameraCapture } from './CameraCapture';

export function MobileUpload({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'uploading' | 'done' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'markSessions', sessionId));
        if (!alive) return;
        if (!snap.exists()) setStatus('invalid');
        else setStatus('ready');
      } catch {
        if (alive) setStatus('invalid');
      }
    })();
    return () => { alive = false; };
  }, [sessionId]);

  const handleSubmit = async (photos: string[]) => {
    setError(null);
    setStatus('uploading');
    try {
      await updateDoc(doc(db, 'markSessions', sessionId), {
        workImages: photos,
        status: 'ready',
        uploadedAt: serverTimestamp(),
      });
      setStatus('done');
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
      setStatus('error');
    }
  };

  if (status === 'invalid') {
    return (
      <Overlay>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Session expired</h2>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0, maxWidth: 320, textAlign: 'center' }}>
          Go back to your computer and generate a fresh QR code.
        </p>
      </Overlay>
    );
  }

  if (status === 'done') {
    return (
      <Overlay>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>Sent</h2>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0, maxWidth: 320, textAlign: 'center' }}>
          Look at your computer — the AI is marking your work now.
        </p>
      </Overlay>
    );
  }

  return (
    <>
      <CameraCapture
        onSubmit={handleSubmit}
        submitLabel="Send"
        submittingLabel="Sending…"
        isSubmitting={status === 'uploading'}
      />
      {error && (
        <div style={{
          position: 'fixed', top: 12, left: 12, right: 12,
          padding: '10px 14px', background: '#FEE2E2', color: '#991B1B',
          borderRadius: 10, fontSize: 13, zIndex: 1000,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {error}
        </div>
      )}
    </>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#111',
    }}>
      {children}
    </div>
  );
}
