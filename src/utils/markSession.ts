import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface MarkSession {
  id: string;
  url: string;
  unsubscribe: () => void;
}

function makeId(): string {
  // 16 random bytes → 32 hex chars. Unguessable enough for a 10-minute window.
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Creates a Firestore session doc and subscribes for the phone's photos.
// `onPhotos` fires once with the array of uploaded image data URLs when the phone writes them.
export async function createMarkSession(onPhotos: (workImages: string[]) => void): Promise<MarkSession> {
  const id = makeId();
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 min

  // Fail fast if Firestore isn't reachable / enabled / permitted. Without this the
  // promise hangs forever and the UI gets stuck on "Preparing secure session…".
  const write = setDoc(doc(db, 'markSessions', id), {
    status: 'waiting',
    createdAt: Timestamp.now(),
    expiresAt,
  });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(
      'Could not reach Firestore. Make sure the Firestore database exists in the Firebase project and that the rules in firestore.rules are deployed (run `firebase deploy --only firestore:rules`).'
    )), 10_000)
  );
  await Promise.race([write, timeout]);

  let fired = false;
  const unsubscribe = onSnapshot(doc(db, 'markSessions', id), (snap) => {
    if (fired) return;
    const data = snap.data();
    if (data?.status !== 'ready') return;
    const images: string[] = Array.isArray(data.workImages)
      ? data.workImages.filter((s: unknown): s is string => typeof s === 'string')
      : typeof data.workImage === 'string'
        ? [data.workImage]
        : [];
    if (images.length > 0) {
      fired = true;
      onPhotos(images);
    }
  });

  const url = `${window.location.origin}/?mobile=upload&session=${id}`;
  return { id, url, unsubscribe };
}
