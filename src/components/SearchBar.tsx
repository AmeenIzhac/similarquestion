import React from 'react';

interface SearchBarProps {
  searchText: string;
  setSearchText: (text: string) => void;
  onSearch: () => void;
  isProcessing: boolean;
  isMobile: boolean;
  placeholder?: string;
}

export function SearchBar({ 
  searchText, 
  setSearchText, 
  onSearch, 
  isProcessing, 
  isMobile,
  placeholder = "Describe the question of your dreams"
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim() && !isProcessing) {
      onSearch();
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      style={{ 
        flex: 1,
        backgroundColor: '#ffffff', 
        border: '1px solid #e5e5e5', 
        borderRadius: '9999px', 
        padding: '6px 12px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)' 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <textarea
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onInput={(e) => {
            const t = e.currentTarget as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = t.scrollHeight + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (searchText.trim() && !isProcessing) {
                onSearch();
              }
            }
          }}
          placeholder={placeholder}
          rows={1}
          style={{ 
            flex: 1, 
            height: 'auto', 
            minHeight: '44px', 
            padding: '10px 12px', 
            border: 'none', 
            outline: 'none', 
            fontSize: isMobile ? '14px' : '16px', 
            resize: 'none', 
            boxSizing: 'border-box', 
            background: 'transparent', 
            overflow: 'hidden' 
          }}
        />
      </div>
    </form>
  );
}
