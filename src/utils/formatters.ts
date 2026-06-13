import type { Qualification, ExamBoard } from '../types/index';

const QUALIFICATION_LABEL: Record<Qualification, string> = {
  gcse: 'GCSE',
  igcse: 'IGCSE',
  alevel: 'A-Level',
};

export const formatLabelId = (labelId: string | undefined, qualification?: Qualification, board?: ExamBoard): string => {
  if (!labelId) return '';
  const cleaned = labelId.replace(/\.png$/i, '');
  const parts = cleaned.split('-');
  // Right-anchored: <date tokens...>-<level>-<paper>-q<N>. The date can be one
  // token ('specimen') or several ('2015-sample1', '2017-june').
  if (parts.length < 4) return cleaned;
  const questionRaw = parts[parts.length - 1];
  const paperRaw = parts[parts.length - 2];
  const levelRaw = parts[parts.length - 3];
  const date = parts
    .slice(0, parts.length - 3)
    .map((token) => {
      const specialMatch = token.toLowerCase().match(/^(specimen|sample)(\d+)$/);
      return specialMatch
        ? `${specialMatch[1].charAt(0).toUpperCase()}${specialMatch[1].slice(1)} Set ${specialMatch[2]}`
        : token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(' ');
  const levelLower = levelRaw.toLowerCase();
  // Cambridge IGCSE tiers are named Core/Extended but share the f/h letters.
  const level =
    levelLower === 'h' ? (board === 'cam' ? 'Extended' : 'Higher')
    : levelLower === 'f' ? (board === 'cam' ? 'Core' : 'Foundation')
    : levelLower === 'a' || levelLower === 'al' ? 'A-Level'
    : levelLower === 'as' ? 'AS-Level'
    : levelRaw;
  // Keep variant letters (Edexcel IGCSE regional papers: 1r -> "Paper 1R").
  const paperNumber = paperRaw.replace(/[^0-9a-z]/gi, '').toUpperCase() || paperRaw;
  const paper = `Paper ${paperNumber}`;
  const questionMatch = questionRaw.match(/q(\d+)/i);
  const question = questionMatch ? `Question ${questionMatch[1]}` : questionRaw;
  const prefix = qualification ? `${QUALIFICATION_LABEL[qualification]} • ` : '';
  return `${prefix}${date} ${level} • ${paper} • ${question}`;
};

export const getDocumentBaseFromLabel = (labelId: string | undefined): string | null => {
  if (!labelId) return null;
  const withoutExtension = labelId.replace(/\.[^/.]+$/, '');
  return withoutExtension.replace(/-q\d+$/i, '');
};
