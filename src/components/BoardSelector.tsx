import type { Board } from '../types/index';

interface BoardSelectorProps {
  board: Board;
  setBoard: (b: Board) => void;
}

type Option = { value: Board; label: string; badge?: string; color?: string };

// Badge colours echo each board's brand: AQA blue, Edexcel red, OCR green.
const OPTIONS: Option[] = [
  { value: 'all', label: 'All boards' },
  { value: 'aqa', label: 'AQA', badge: 'A', color: '#2563EB' },
  { value: 'edexcel', label: 'Edexcel', badge: 'E', color: '#B23A48' },
  { value: 'ocr', label: 'OCR', badge: 'O', color: '#2E7D52' },
];

export function BoardSelector({ board, setBoard }: BoardSelectorProps) {
  return (
    <div
      data-testid="board-selector"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '4px',
        background: 'rgba(0,0,0,0.05)',
        borderRadius: '999px',
      }}
    >
      {OPTIONS.map((opt) => {
        const active = board === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            data-testid={`board-option-${opt.value}`}
            onClick={() => setBoard(opt.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              height: '36px',
              padding: opt.badge ? '0 16px 0 8px' : '0 18px',
              border: 'none',
              borderRadius: '999px',
              cursor: 'pointer',
              background: active ? '#fff' : 'transparent',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: active ? 700 : 500,
              color: active ? '#111' : '#6B6B6B',
              transition: 'background var(--transition-fast), color var(--transition-fast)',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.badge && (
              <span
                aria-hidden
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: opt.color,
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {opt.badge}
              </span>
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
