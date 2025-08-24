import React, { useState, useCallback, useEffect } from 'react';
import { Mistral } from '@mistralai/mistralai';
import guyLabels from './guy_labels.json';

// Function to calculate string similarity using Levenshtein distance
const calculateSimilarity = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
};

// Function to find the top 10 closest matches in guy_labels
const findTopMatches = (extractedText: string): Array<{ labelId: string; text: string; similarity: number }> => {
  const matches: Array<{ labelId: string; text: string; similarity: number }> = [];
  
  Object.entries(guyLabels).forEach(([labelId, text]) => {
    const similarity = calculateSimilarity(extractedText.toLowerCase(), text.toLowerCase());
    matches.push({ labelId, text, similarity });
  });
  
  // Sort by similarity (highest first) and take top 10
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);
};

function App() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [client, setClient] = useState<Mistral | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [topMatches, setTopMatches] = useState<Array<{ labelId: string; text: string; similarity: number }>>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

  useEffect(() => {
    const mistralApiKey = import.meta.env.VITE_MISTRAL_API_KEY;
    
    if (mistralApiKey) {
      setClient(new Mistral({ apiKey: mistralApiKey }));
    }
  }, []);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processImageWithOCR = useCallback(async (file: File) => {
    if (!client) {
      console.error('Mistral client not initialized');
      return;
    }

    setIsProcessing(true);
    try {
      const base64Image = await convertFileToBase64(file);
      
      const ocrResponse = await client.ocr.process({
        model: "mistral-ocr-latest",
        document: {
          type: "image_url",
          imageUrl: "data:image/jpeg;base64," + base64Image
        },
        includeImageBase64: true
      });
      
      console.log(ocrResponse);
      const extractedText = ocrResponse.pages?.[0]?.markdown || 'No text found';
      setOcrResult(extractedText);
      
      // Find the top 10 matches in guy_labels
      const matches = findTopMatches(extractedText);
      setTopMatches(matches);
      setCurrentMatchIndex(0); // Start with the closest match
      console.log('Top matches:', matches);
    } catch (error) {
      console.error("Error processing OCR:", error);
      setOcrResult('Error processing image');
      setTopMatches([]);
      setCurrentMatchIndex(0);
    } finally {
      setIsProcessing(false);
    }
  }, [client]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      
      // Process the image with OCR
      await processImageWithOCR(file);
    }
  };

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            console.log('Image pasted:', file.name);
            const url = URL.createObjectURL(file);
            setImageUrl(url);
            
            // Process the image with OCR
            processImageWithOCR(file);
          }
          break;
        }
      }
    }
  }, [processImageWithOCR]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const nextMatch = () => {
    if (topMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % topMatches.length);
    }
  };

  const prevMatch = () => {
    if (topMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + topMatches.length) % topMatches.length);
    }
  };

  const currentMatch = topMatches[currentMatchIndex];

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Title at the top center */}
      <h1 style={{ 
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        margin: 0,
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center'
      }}>
        Find Similar GCSE Maths Questions
      </h1>

      {/* Upload controls in top left */}
      <div style={{ 
        position: 'absolute', 
        margin: '5px',
        top: '20px',
        left: '20px',
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '5px',
        border: '2px solid #333'
      }}>
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt="Uploaded" 
            style={{ maxWidth: '200px', height: 'auto', marginBottom: '10px' }} 
          />
        )}
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileUpload}
          style={{
            color: 'transparent',
            width: '100px'
          }}
        />
        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Or paste an image with Ctrl+V
        </p>
        
        {/* OCR Results */}
        {isProcessing && (
          <p style={{ fontSize: '12px', color: '#007bff', marginTop: '10px' }}>
            Processing image with OCR...
          </p>
        )}

        {/* Navigation controls */}
        {topMatches.length > 0 && (
          <div style={{ 
            marginTop: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={prevMatch}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Previous
              </button>
              <button 
                onClick={nextMatch}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Large label image positioned to avoid overlap */}
      {currentMatch && !isProcessing && (
        <div style={{ 
          position: 'absolute',
          top: '50%',
          left: '250px', // Start after the small image area
          right: '20px', // Leave some margin from right edge
          transform: 'translateY(-50%)',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img 
            src={`/src/qs/${currentMatch.labelId}.png`}
            alt={currentMatch.labelId}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '85vh', 
              width: 'auto', 
              height: 'auto',
              objectFit: 'contain',
              border: '2px solid #333'
            }} 
          />
        </div>
      )}

      {/* Loading text when processing */}
      {isProcessing && (
        <div style={{ 
          position: 'absolute',
          top: '50%',
          left: '250px', // Start after the small image area
          right: '20px', // Leave some margin from right edge
          transform: 'translateY(-50%)',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '10px'
        }}>
          <div style={{ 
            textAlign: 'center',
            padding: '40px',
            fontSize: '18px',
            color: '#007bff',
            fontWeight: 'bold'
          }}>
            Processing image with OCR...
            <br />
            <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
              Finding similar questions...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;