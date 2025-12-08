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
  return (
    <div
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.35)', 
        zIndex: 50, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '16px' 
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ 
          width: '100%', 
          maxWidth: '560px', 
          background: '#fff', 
          border: '1px solid #eaeaea', 
          borderRadius: '12px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)', 
          padding: '20px' 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#111', fontWeight: 600 }}>Filters</h3>
          <button
            onClick={onClose}
            style={{ 
              border: '1px solid #e5e5e5', 
              background: '#fff', 
              cursor: 'pointer', 
              color: '#333', 
              fontSize: '16px', 
              width: '28px', 
              height: '28px', 
              borderRadius: '9999px', 
              lineHeight: 1 
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#111', fontWeight: 600 }}>Level</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}
              style={{ padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
            >
              <option value="all">All levels</option>
              <option value="h">Higher (H)</option>
              <option value="f">Foundation (F)</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#111', fontWeight: 600 }}>Calculator</label>
            <select
              value={calculatorFilter}
              onChange={(e) => setCalculatorFilter(e.target.value as CalculatorFilter)}
              style={{ padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
            >
              <option value="all">All papers</option>
              <option value="non-calculator">Non-Calculator (Paper 1)</option>
              <option value="calculator">Calculator (Papers 2 & 3)</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#111', fontWeight: 600 }}>Number of Matches (max 50)</label>
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
                  if (num >= 1 && num <= 50) {
                    setNumMatches(num);
                  }
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setNumMatches(25);
                  return;
                }
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 1) setNumMatches(1);
                else if (num > 50) setNumMatches(50);
                else setNumMatches(num);
              }}
              style={{ padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#111', fontWeight: 600 }}>Search Method</label>
            <select
              value={searchMethod}
              onChange={(e) => setSearchMethod(e.target.value as SearchMethod)}
              style={{ padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
            >
              <option value="method1">Method 1</option>
              <option value="method2" disabled={!hasSearchMethod2}>Method 2</option>
            </select>
            {!hasSearchMethod2 && (
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Method 2 requires Host 2 configuration.
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => { setLevelFilter('all'); setCalculatorFilter('all'); }}
              style={{ 
                flex: 1, 
                height: '40px', 
                padding: '0 12px', 
                background: '#f5f5f6', 
                color: '#111', 
                border: '1px solid #e5e5e5', 
                borderRadius: '8px', 
                fontSize: '14px', 
                fontWeight: 600, 
                cursor: 'pointer' 
              }}
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={onApply}
              style={{ 
                flex: 1, 
                height: '40px', 
                padding: '0 12px', 
                background: '#10a37f', 
                color: '#fff', 
                border: '1px solid #109e7b', 
                borderRadius: '8px', 
                fontSize: '14px', 
                fontWeight: 600, 
                cursor: 'pointer' 
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
