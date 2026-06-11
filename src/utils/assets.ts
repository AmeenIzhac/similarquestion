import type { Qualification, ExamBoard } from '../types/index';

const base = import.meta.env.VITE_R2_PUBLIC_URL?.replace(/\/+$/, '') ?? '';

export type AssetKind = 'papers' | 'markschemes' | 'questions' | 'answers';

export function assetUrl(
  qualification: Qualification,
  kind: AssetKind,
  filename: string,
  board: ExamBoard = 'edexcel'
): string {
  const cleanName = filename.replace(/^\/+/, '');
  return `${base}/${board}-${qualification}-maths-${kind}/${cleanName}`;
}
