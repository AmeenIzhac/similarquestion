import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PhotoCapture } from './PhotoCapture';

export function MobileUpload({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<'idle' | 'invalid' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'markSessions', sessionId));
        if (!alive) return;
        if (!snap.exists()) setStatus('invalid');
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

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 18px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#111',
    }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 4px' }}>Snap your work</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px' }}>
          Take one or more photos of your written answer. Tap "Send" when you're ready — they'll appear on your computer for AI marking.
        </p>

        {status === 'invalid' && (
          <div style={{ padding: '14px', background: '#FEF3C7', borderRadius: '10px', color: '#92400E', fontSize: '14px' }}>
            This session has expired or doesn't exist. Go back to your computer and generate a fresh QR code.
          </div>
        )}

        {status !== 'invalid' && status !== 'done' && (
          <PhotoCapture
            onSubmit={handleSubmit}
            submitLabel="Send"
            submittingLabel="Sending to your computer…"
            isSubmitting={status === 'uploading'}
          />
        )}

        {status === 'done' && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#ECFDF5', borderRadius: '10px', color: '#065F46', fontSize: '14px', textAlign: 'center' }}>
            ✓ Sent! Look at your computer — the AI is marking your work now.
          </div>
        )}

        {error && (
          <div style={{ marginTop: '16px', padding: '12px 14px', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px', fontSize: '13px' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
