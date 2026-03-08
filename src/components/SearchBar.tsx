import React, { useRef, useState, useEffect } from 'react';
import { Paperclip, Loader2, X } from 'lucide-react';
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
  placeholder = "Describe the question of your dreams"
}: SearchBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
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
      if (text) {
        setOcrText(text);
      }
    } catch (error) {
      console.error("OCR Error:", error);
    } finally {
      setIsOCRProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        e.preventDefault(); // Prevent default paste if we found an image
        const file = items[i].getAsFile();
        if (file) {
          await processImage(file);
          break; // Process only the first image
        }
      }
    }
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setOcrText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        border: '1px solid #e5e5e5',
        borderRadius: imagePreview ? '16px' : '9999px',
        padding: '6px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {imagePreview && (
        <div style={{ padding: '4px 8px 8px 8px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid #e5e5e5'
              }}
            />
            <button
              type="button"
              onClick={clearImage}
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: '#6e6e80',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0
              }}
              title="Remove image"
            >
              <X size={12} />
            </button>
            {isOCRProcessing && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px'
              }}>
                <Loader2 size={20} className="animate-spin" color="#10a37f" />
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing || isOCRProcessing}
          style={{
            background: 'none',
            border: 'none',
            cursor: (isProcessing || isOCRProcessing) ? 'not-allowed' : 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6e6e80',
            borderRadius: '50%',
            opacity: (isProcessing || isOCRProcessing) ? 0.5 : 1,
          }}
          title="Upload image for OCR"
        >
          {isOCRProcessing ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <Paperclip size={24} />
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          style={{ display: 'none' }}
        />
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
              handleSubmit();
            }
          }}
          onPaste={handlePaste}
          placeholder={isOCRProcessing ? "Reading image..." : placeholder}
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
