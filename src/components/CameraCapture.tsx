import { useEffect, useRef, useState } from 'react';

const MAX_PHOTOS = 6;
const TARGET_MAX_DIM = 1400;
const JPEG_QUALITY = 0.78;

async function downscaleToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  const maxDim = Math.max(canvas.width, canvas.height);
  if (maxDim <= TARGET_MAX_DIM) return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const scale = TARGET_MAX_DIM / maxDim;
  const out = document.createElement('canvas');
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  out.getContext('2d')!.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', JPEG_QUALITY);
}

export interface CameraCaptureProps {
  onSubmit: (photos: string[]) => void | Promise<void>;
  submitLabel?: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
}

export function CameraCapture({
  onSubmit,
  submitLabel = 'Send',
  submittingLabel = 'Sending…',
  isSubmitting = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<'starting' | 'live' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [snapping, setSnapping] = useState(false);

  const startCamera = async () => {
    setState('starting');
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not available in this browser');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Some iOS versions need an explicit play() after srcObject is set.
        videoRef.current.play().catch(() => { /* autoplay already kicked in */ });
      }
      setState('live');
    } catch (e: any) {
      const name = e?.name as string | undefined;
      const msg = name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? 'Camera access was blocked. In iOS Safari: tap "AA" in the address bar → Website Settings → Camera → Allow, then reload. Or use the gallery option below.'
        : name === 'NotFoundError' || name === 'OverconstrainedError'
          ? 'No usable camera was found on this device.'
          : e?.message || 'Could not start the camera.';
      setErrorMsg(msg);
      setState('error');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snap = async () => {
    if (state !== 'live' || photos.length >= MAX_PHOTOS || snapping) return;
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setSnapping(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0);
      const dataUrl = await downscaleToDataUrl(canvas);
      setPhotos((prev) => [...prev, dataUrl]);
    } finally {
      setTimeout(() => setSnapping(false), 120); // tiny shutter feedback window
    }
  };

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const addFromGallery = (file: File) => {
    if (photos.length >= MAX_PHOTOS) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const src = ev.target?.result as string;
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = src;
      });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      const compressed = await downscaleToDataUrl(c);
      setPhotos((prev) => [...prev, compressed]);
    };
    reader.readAsDataURL(file);
  };

  const canSnap = state === 'live' && photos.length < MAX_PHOTOS && !snapping && !isSubmitting;
  const canSend = photos.length > 0 && !isSubmitting;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000', color: '#fff',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      {/* Live preview */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            background: '#000',
            display: state === 'live' ? 'block' : 'none',
          }}
        />

        {state === 'starting' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: 'rgba(255,255,255,0.7)',
          }}>
            Starting camera…
          </div>
        )}

        {state === 'error' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px 24px', textAlign: 'center', gap: 16,
          }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, color: '#fde68a', maxWidth: 360 }}>
              {errorMsg}
            </p>
            <button
              onClick={startCamera}
              style={{
                padding: '10px 18px', borderRadius: 999, background: '#fff', color: '#000',
                border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              }}
            >
              Try again
            </button>
            <button
              onClick={() => fallbackInputRef.current?.click()}
              style={{
                padding: '10px 18px', borderRadius: 999, background: 'transparent', color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.6)', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}
            >
              Pick from gallery instead
            </button>
            <input
              ref={fallbackInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) addFromGallery(f);
                if (e.target) e.target.value = '';
              }}
            />
          </div>
        )}

        {/* Shutter flash */}
        {snapping && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)',
            animation: 'none', pointerEvents: 'none',
          }} />
        )}

        {/* Top tally */}
        <div style={{
          position: 'absolute', top: 14, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', fontSize: 12, fontWeight: 600,
            padding: '5px 12px', borderRadius: 999,
          }}>
            {photos.length} of {MAX_PHOTOS}
          </span>
        </div>
      </div>

      {/* Thumbnail strip */}
      {photos.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, padding: '10px 12px',
          overflowX: 'auto',
          background: '#000',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={src}
                alt={`photo ${i + 1}`}
                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, display: 'block' }}
              />
              <button
                onClick={() => removePhoto(i)}
                aria-label={`remove photo ${i + 1}`}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#fff', color: '#000', border: 'none',
                  cursor: 'pointer', fontSize: 14, fontWeight: 700, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom control bar: gallery | shutter | send */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '14px 18px calc(14px + env(safe-area-inset-bottom, 0px))',
        background: '#000',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={() => fallbackInputRef.current?.click()}
            aria-label="Pick from gallery"
            disabled={photos.length >= MAX_PHOTOS || isSubmitting}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: photos.length >= MAX_PHOTOS || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: photos.length >= MAX_PHOTOS || isSubmitting ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <input
            ref={fallbackInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) addFromGallery(f);
              if (e.target) e.target.value = '';
            }}
          />
        </div>

        <button
          onClick={snap}
          disabled={!canSnap}
          aria-label="Take photo"
          style={{
            width: 78, height: 78, borderRadius: '50%',
            background: canSnap ? '#fff' : 'rgba(255,255,255,0.35)',
            border: '4px solid rgba(255,255,255,0.5)',
            boxShadow: 'inset 0 0 0 4px #000',
            cursor: canSnap ? 'pointer' : 'not-allowed',
            outline: 'none',
            transition: 'transform 80ms',
            transform: snapping ? 'scale(0.92)' : 'scale(1)',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onSubmit(photos)}
            disabled={!canSend}
            style={{
              padding: '10px 16px',
              background: canSend ? '#fff' : 'rgba(255,255,255,0.15)',
              color: canSend ? '#000' : 'rgba(255,255,255,0.45)',
              border: 'none', borderRadius: 999,
              cursor: canSend ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
            }}
          >
            {isSubmitting ? submittingLabel : photos.length > 0 ? `${submitLabel} (${photos.length})` : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
