import type { LevelFilter, CalculatorFilter } from '../types/index';

interface FilterModalProps {
  levelFilter: LevelFilter;
  setLevelFilter: (filter: LevelFilter) => void;
  calculatorFilter: CalculatorFilter;
  setCalculatorFilter: (filter: CalculatorFilter) => void;
  numMatches: number;
  setNumMatches: (num: number) => void;
  onClose: () => void;
  onApply: () => void;
}

export function FilterModal({
  levelFilter,
  setLevelFilter,
  calculatorFilter,
  setCalculatorFilter,
  numMatches,
  setNumMatches,
  onClose,
  onApply
}: FilterModalProps) {
  const selectStyle: React.CSSProperties = {
    padding: '11px 14px',
    border: '1px solid transparent',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    background: 'var(--color-bg)',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-text)',
    outline: 'none',
    width: '100%',
    transition: 'all var(--transition-fast)',
  };

  return (
    <div
      className="animate-fade-in"
      data-testid="filter-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-scale-in"
        data-testid="filter-modal"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '28px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text)', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>Filters</h3>
          <button
            data-testid="filter-modal-close"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'var(--color-bg)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontSize: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Level</label>
            <select data-testid="filter-level-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as LevelFilter)} style={selectStyle}>
              <option value="all">All levels</option>
              <option value="h">Higher (H)</option>
              <option value="f">Foundation (F)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Calculator</label>
            <select data-testid="filter-calculator-select" value={calculatorFilter} onChange={(e) => setCalculatorFilter(e.target.value as CalculatorFilter)} style={selectStyle}>
              <option value="all">All papers</option>
              <option value="non-calculator">Non-Calculator (Paper 1)</option>
              <option value="calculator">Calculator (Papers 2 &amp; 3)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Number of Matches (max 50)</label>
            <input
              data-testid="filter-num-matches-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={numMatches}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setNumMatches('' as any);
                  return;
                }
                const digits = value.replace(/\D/g, '');
                if (digits) {
                  const num = parseInt(digits, 10);
                  if (num >= 1 && num <= 50) {
                    setNumMatches(num);
                  }
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value === '') { setNumMatches(25); return; }
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 1) setNumMatches(1);
                else if (num > 50) setNumMatches(50);
                else setNumMatches(num);
              }}
              style={selectStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              data-testid="filter-clear-all-btn"
              type="button"
              onClick={() => { setLevelFilter('all'); setCalculatorFilter('all'); }}
              style={{
                flex: 1,
                height: '44px',
                padding: '0 16px',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all var(--transition-fast)',
              }}
            >
              Clear All
            </button>
            <button
              data-testid="filter-apply-btn"
              type="button"
              onClick={onApply}
              style={{
                flex: 1,
                height: '44px',
                padding: '0 16px',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all var(--transition-fast)',
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
