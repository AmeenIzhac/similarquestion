import { useRef, useState } from 'react';

const MAX_PHOTOS = 6;

// Downscale + JPEG-compress so multiple photos fit within Firestore's 1 MiB doc limit.
async function compressImage(dataUrl: string, maxDim = 1200, quality = 0.72): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export interface PhotoCaptureProps {
  onSubmit: (photos: string[]) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
  helperText?: string;
  // If true, use a compact light-on-light layout (for inline desktop modal use).
  // If false, full-screen-style layout (for the dedicated mobile-upload page).
  compact?: boolean;
}

export function PhotoCapture({
  onSubmit,
  onCancel,
  submitLabel = 'Send',
  submittingLabel = 'Sending…',
  isSubmitting = false,
  helperText,
  compact = false,
}: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addPhoto = async (file: File) => {
    if (photos.length >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos`);
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const raw = await readFileAsDataURL(file);
      const compressed = await compressImage(raw);
      setPhotos((prev) => [...prev, compressed]);
    } catch (e: any) {
      setError(e?.message || 'Could not process that photo');
    } finally {
      setAdding(false);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const canAddMore = photos.length < MAX_PHOTOS;
  const busy = adding || isSubmitting;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {helperText && (
        <p style={{ fontSize: compact ? '13px' : '14px', color: '#6b7280', margin: 0 }}>
          {helperText}
        </p>
      )}

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <img src={src} alt={`page ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{
                position: 'absolute', top: 4, left: 4,
                background: 'rgba(17,17,17,0.78)', color: '#fff',
                fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
              }}>{i + 1}</span>
              <button
                aria-label={`remove photo ${i + 1}`}
                disabled={busy}
                onClick={() => removePhoto(i)}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 24, height: 24, borderRadius: '50%', border: 'none',
                  background: 'rgba(17,17,17,0.78)', color: '#fff',
                  cursor: busy ? 'default' : 'pointer', fontSize: 14, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) addPhoto(f);
          // Reset so picking the same file twice still fires onChange
          if (e.target) e.target.value = '';
        }}
      />

      <div style={{ display: 'flex', gap: '8px', flexDirection: compact ? 'row' : 'column' }}>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={!canAddMore || busy}
          style={{
            flex: 1,
            padding: compact ? '10px 14px' : '14px',
            fontSize: compact ? '13px' : '15px',
            fontWeight: 600,
            background: '#fff',
            color: '#111',
            border: '1.5px solid #111',
            borderRadius: '12px',
            cursor: (!canAddMore || busy) ? 'not-allowed' : 'pointer',
            opacity: (!canAddMore || busy) ? 0.5 : 1,
          }}
        >
          {photos.length === 0 ? 'Take photo' : adding ? 'Adding…' : canAddMore ? `Add another (${photos.length}/${MAX_PHOTOS})` : `Max ${MAX_PHOTOS} reached`}
        </button>
        <button
          onClick={() => onSubmit(photos)}
          disabled={photos.length === 0 || busy}
          style={{
            flex: 1,
            padding: compact ? '10px 14px' : '14px',
            fontSize: compact ? '13px' : '15px',
            fontWeight: 600,
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: (photos.length === 0 || busy) ? 'not-allowed' : 'pointer',
            opacity: (photos.length === 0 || busy) ? 0.5 : 1,
          }}
        >
          {isSubmitting ? submittingLabel : photos.length > 0 ? `${submitLabel} ${photos.length} photo${photos.length > 1 ? 's' : ''}` : submitLabel}
        </button>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          disabled={busy}
          style={{
            background: 'transparent', border: 'none', color: '#6b7280',
            fontSize: '13px', cursor: busy ? 'default' : 'pointer', padding: '4px',
          }}
        >
          Cancel
        </button>
      )}

      {error && (
        <div style={{ padding: '10px 12px', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}
    </div>
  );
}
