import React, { useRef, useState, useEffect } from 'react';
import { Paperclip, Loader2, X, Search } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface SearchBarProps {
  searchText: string;
  setSearchText: (text: string) => void;
  onSearch: (e?: React.FormEvent, text?: string) => void;
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
  placeholder: customPlaceholder
}: SearchBarProps) {
  const placeholder = customPlaceholder || (isMobile ? "Describe a question..." : "Describe the question you're looking for...");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalQuery = [searchText.trim(), ocrText].filter(Boolean).join('\n\n');
    if (finalQuery && !isProcessing && !isOCRProcessing) {
      onSearch(undefined, finalQuery);
    }
  };

  const processImage = async (file: File) => {
    try {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setIsOCRProcessing(true);
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text.trim();
      if (text) setOcrText(text);
    } catch (error) {
      console.error("OCR Error:", error);
    } finally {
      setIsOCRProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImage(file);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) { await processImage(file); break; }
      }
    }
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setOcrText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="search-form"
      style={{
        flex: 1,
        backgroundColor: 'var(--color-surface)',
        borderRadius: imagePreview ? 'var(--radius-lg)' : 'var(--radius-full)',
        padding: isMobile ? '4px 8px' : '6px 10px',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        transition: 'all var(--transition-fast)',
        border: '1px solid var(--color-border)',
      }}
    >
      {imagePreview && (
        <div style={{ padding: '8px 6px 4px 6px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{
                width: isMobile ? '48px' : '64px',
                height: isMobile ? '48px' : '64px',
                objectFit: 'cover',
                borderRadius: 'var(--radius-sm)',
              }}
            />
            <button
              data-testid="search-clear-image-btn"
              type="button"
              onClick={clearImage}
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: 'var(--color-text)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
              title="Remove image"
            >
              <X size={11} />
            </button>
            {isOCRProcessing && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
              }}>
                <Loader2 size={16} className="animate-spin" color="var(--color-primary)" />
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
        <Search size={18} style={{ flexShrink: 0, color: 'var(--color-text-muted)', marginLeft: '6px' }} />
        <textarea
          data-testid="search-input"
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
              handleSubmit();
            }
          }}
          onPaste={handlePaste}
          placeholder={isOCRProcessing ? "Reading image..." : placeholder}
          rows={1}
          style={{
            flex: 1,
            minWidth: 0,
            height: 'auto',
            minHeight: '42px',
            padding: '10px 6px',
            border: 'none',
            outline: 'none',
            fontSize: '15px',
            resize: 'none',
            boxSizing: 'border-box',
            background: 'transparent',
            overflow: 'hidden',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text)',
            lineHeight: 1.5,
          }}
        />
        <button
          data-testid="search-upload-btn"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing || isOCRProcessing}
          style={{
            background: 'none',
            border: 'none',
            cursor: (isProcessing || isOCRProcessing) ? 'not-allowed' : 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
            borderRadius: '50%',
            opacity: (isProcessing || isOCRProcessing) ? 0.4 : 1,
            transition: 'all var(--transition-fast)',
            flexShrink: 0,
          }}
          title="Upload image for OCR"
        >
          {isOCRProcessing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Paperclip size={18} />
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          style={{ display: 'none' }}
        />
      </div>
    </form>
  );
}
