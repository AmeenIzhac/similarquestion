const base = import.meta.env.VITE_R2_PUBLIC_URL?.replace(/\/+$/, '') ?? '';

export function assetUrl(path: string): string {
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
