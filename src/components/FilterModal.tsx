import type { LevelFilter, CalculatorFilter, SearchMethod } from '../types/index';

interface FilterModalProps {
  levelFilter: LevelFilter;
  setLevelFilter: (filter: LevelFilter) => void;
  calculatorFilter: CalculatorFilter;
  setCalculatorFilter: (filter: CalculatorFilter) => void;
  numMatches: number;
  setNumMatches: (num: number) => void;
  searchMethod: SearchMethod;
  setSearchMethod: (method: SearchMethod) => void;
  hasSearchMethod2: boolean;
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
  searchMethod,
  setSearchMethod,
  hasSearchMethod2,
  onClose,
  onApply
}: FilterModalProps) {
  const selectStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '16px',
    background: 'var(--color-surface)',
    fontFamily: 'var(--font-family)',
    color: 'var(--color-text)',
    outline: 'none',
    width: '100%',
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)', fontWeight: 700 }}>Filters</h3>
          <button
            onClick={onClose}
            style={{
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontSize: '16px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background var(--transition-fast)',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>Level</label>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as LevelFilter)} style={selectStyle}>
              <option value="all">All levels</option>
              <option value="h">Higher (H)</option>
              <option value="f">Foundation (F)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>Calculator</label>
            <select value={calculatorFilter} onChange={(e) => setCalculatorFilter(e.target.value as CalculatorFilter)} style={selectStyle}>
              <option value="all">All papers</option>
              <option value="non-calculator">Non-Calculator (Paper 1)</option>
              <option value="calculator">Calculator (Papers 2 &amp; 3)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>Number of Matches (max 50)</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={numMatches}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') return;
                const digits = value.replace(/\D/g, '');
                if (digits) {
                  const num = parseInt(digits, 10);
                  if (num >= 1 && num <= 50) setNumMatches(num);
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
              style={{ ...selectStyle }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>Search Method</label>
            <select value={searchMethod} onChange={(e) => setSearchMethod(e.target.value as SearchMethod)} style={selectStyle}>
              <option value="method1">Method 1</option>
              <option value="method2" disabled={!hasSearchMethod2}>Method 2</option>
            </select>
            {!hasSearchMethod2 && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Method 2 requires Host 2 configuration.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => { setLevelFilter('all'); setCalculatorFilter('all'); }}
              style={{
                flex: 1,
                height: '42px',
                padding: '0 12px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                transition: 'background var(--transition-fast)',
              }}
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={onApply}
              style={{
                flex: 1,
                height: '42px',
                padding: '0 12px',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                transition: 'background var(--transition-fast)',
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
