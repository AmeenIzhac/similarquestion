export const formatLabelId = (labelId: string | undefined): string => {
  if (!labelId) return '';
  const cleaned = labelId.replace(/\.png$/i, '');
  const parts = cleaned.split('-');
  if (parts.length < 5) return cleaned;
  const [year, monthRaw, levelRaw, paperRaw, questionRaw] = parts;
  const monthLower = monthRaw.toLowerCase();
  const specialMonthMatch = monthLower.match(/^(specimen|sample)(\d+)$/);
  const month = specialMonthMatch
    ? `${specialMonthMatch[1].charAt(0).toUpperCase()}${specialMonthMatch[1].slice(1)} Set ${specialMonthMatch[2]}`
    : monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const levelLower = levelRaw.toLowerCase();
  const level = levelLower === 'h' ? 'Higher' : levelLower === 'f' ? 'Foundation' : levelRaw;
  const paperNumber = paperRaw.replace(/[^0-9]/g, '') || paperRaw;
  const paper = `Paper ${paperNumber}`;
  const questionMatch = questionRaw.match(/q(\d+)/i);
  const question = questionMatch ? `Question ${questionMatch[1]}` : questionRaw;
  return `${year} ${month} ${level} • ${paper} • ${question}`;
};

export const getDocumentBaseFromLabel = (labelId: string | undefined): string | null => {
  if (!labelId) return null;
  const withoutExtension = labelId.replace(/\.[^/.]+$/, '');
  return withoutExtension.replace(/-q\d+$/i, '');
};
