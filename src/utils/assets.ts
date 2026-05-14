import type { Qualification } from '../types/index';

const base = import.meta.env.VITE_R2_PUBLIC_URL?.replace(/\/+$/, '') ?? '';

export type AssetKind = 'papers' | 'markschemes' | 'questions' | 'answers';

export function assetUrl(qualification: Qualification, kind: AssetKind, filename: string): string {
  const cleanName = filename.replace(/^\/+/, '');
  return `${base}/edexcel-${qualification}-maths-${kind}/${cleanName}`;
}
