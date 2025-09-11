import React, { useState, useCallback, useEffect } from 'react';
import { Mistral } from '@mistralai/mistralai';



// Function to search Pinecone using REST API
const searchPinecone = async (query: string, topK: number = 10) => {
  try {
    const pineconeApiKey = import.meta.env.VITE_PINECONE_API_KEY;
    const indexHost = import.meta.env.VITE_PINECONE_INDEX_HOST;
    const namespace = import.meta.env.VITE_PINECONE_NAMESPACE || 'example-namespace';
    
    if (!pineconeApiKey || !indexHost) {
      console.error('Pinecone API key or index host not configured');
      return null;
    }

    const response = await fetch(`https://${indexHost}/records/namespaces/${namespace}/search`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Api-Key': pineconeApiKey,
        'X-Pinecone-API-Version': 'unstable',
      },
      body: JSON.stringify({
        query: {
          inputs: { text: query },
          top_k: topK
        },
        fields: ["category", "chunk_text"]
      })
    });

    if (!response.ok) {
      throw new Error(`Pinecone API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error searching Pinecone:', error);
    return null;
  }
};

function App() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [client, setClient] = useState<Mistral | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [topMatches, setTopMatches] = useState<Array<{ labelId: string; text: string; similarity: number }>>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [emailSubmitted, setEmailSubmitted] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');


  useEffect(() => {
    const mistralApiKey = import.meta.env.VITE_MISTRAL_API_KEY;
    
    if (mistralApiKey) {
      setClient(new Mistral({ apiKey: mistralApiKey }));
    }
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    if (!email.trim()) {
      setEmailError('Please enter your email');
      return;
    }
    
    try {
      const response = await fetch('https://formspree.io/f/mnnblgob', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        })
      });
      
      if (response.ok) {
        setEmailSubmitted(true);
        setEmail('');
      } else {
        setEmailError('Failed to submit email. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      setEmailError('Failed to submit email. Please try again.');
    }
  };

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
      
      // Find similar questions using Pinecone with extracted text
      const pineconeResults = await searchPinecone(extractedText);
      
      if (pineconeResults && pineconeResults.result && pineconeResults.result.hits) {
        const matches = pineconeResults.result.hits.map((hit: any) => ({
          labelId: hit._id,
          text: hit.fields?.chunk_text || 'No text found',
          similarity: hit._score
        }));
        setTopMatches(matches);
        setCurrentMatchIndex(0); // Start with the closest match
      } else {
        // Pinecone failed - show error message
        console.log("Pinecone failed");
        setTopMatches([{
          labelId: 'error',
          text: 'Sorry, the search service is broken today. Please try again later.',
          similarity: 0
        }]);
        setCurrentMatchIndex(0);
      }
    } catch (error) {
      console.error("Error processing OCR:", error);
      setOcrResult('Error processing image');
      setTopMatches([{
        labelId: 'error',
        text: 'Sorry, the search service is broken today. Please try again later.',
        similarity: 0
      }]);
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
            
            // Clear text search when image is pasted
            setSearchText('');
            
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

  const searchByText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    try {
      // Try Pinecone first
      const pineconeResults = await searchPinecone(text);
      
      if (pineconeResults && pineconeResults.result && pineconeResults.result.hits) {
        const matches = pineconeResults.result.hits.map((hit: any) => ({
          labelId: hit._id,
          text: hit.fields?.chunk_text || 'No text found',
          similarity: hit._score
        }));
        setTopMatches(matches);
        setCurrentMatchIndex(0);
      } else {
        // Pinecone failed - show error message
        console.log("Pinecone failed");
        setTopMatches([{
          labelId: 'error',
          text: 'Sorry, the search service is broken today. Please try again later.',
          similarity: 0
        }]);
        setCurrentMatchIndex(0);
      }
    } catch (error) {
      console.error("Error searching by text:", error);
      setTopMatches([{
        labelId: 'error',
        text: 'Sorry, the search service is broken today. Please try again later.',
        similarity: 0
      }]);
      setCurrentMatchIndex(0);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleTextSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      searchByText(searchText);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Title */}
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

      {/* Email Signup Form */}
      <div style={{ 
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 10,
        backgroundColor: '#f8f9fa',
        padding: '10px',
        borderRadius: '8px',
        border: '2px solid #333'
      }}>
        {!emailSubmitted ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <p style={{ 
              margin: 0, 
              fontSize: '16px', 
              color: '#007bff', 
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              Enter email for access to Premium Version! 🔥
            </p>
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email for updates"
                style={{
                  padding: '8px 12px',
                  border: '2px solid #333',
                  borderRadius: '4px',
                  fontSize: '14px',
                  width: '280px'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: email.trim() ? '#28a745' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: email.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
                disabled={!email.trim()}
              >
                Submit
              </button>
            </form>
            {emailError && (
              <p style={{ color: 'red', fontSize: '12px', margin: 0, textAlign: 'center' }}>
                {emailError}
              </p>
            )}
          </div>
        ) : (
          <p style={{ color: '#28a745', fontSize: '14px', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
            Thank you for signing up! ✓
          </p>
        )}
      </div>

      {/* Upload controls in top left */}
      <div style={{ 
        position: 'absolute', 
        margin: '5px',
        top: '80px', // Adjusted position
        left: '20px',
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '5px',
        border: '2px solid #333',
        minWidth: '220px'
      }}>
        {/* Image upload section */}
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Upload Image:</h3>
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
        </div>

        {/* Text search section */}
        <div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Or Search by Text:</h3>
          <form onSubmit={handleTextSearch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Describe the type of question... (e.g., 'hard quadratic equations', 'trigonometry')"
              style={{
                width: '200px',
                height: '60px',
                padding: '8px',
                border: '2px solid #333',
                borderRadius: '4px',
                fontSize: '12px',
                resize: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!searchText.trim() || isProcessing}
              style={{
                padding: '8px 12px',
                backgroundColor: searchText.trim() && !isProcessing ? '#28a745' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: searchText.trim() && !isProcessing ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {isProcessing ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* OCR Results */}
        {isProcessing && (
          <p style={{ fontSize: '12px', color: '#007bff', marginTop: '10px' }}>
            Processing...
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

        {/* Premium Features */}
        <div style={{ 
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '5px',
          border: '1px solid #ddd'
        }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '13px', 
            color: '#007bff',
            fontWeight: 'bold'
          }}>
            Premium Version Features:
          </h4>
          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
            <div>• More GCSE subjects</div>
            <div>• Mark scheme answers</div>
            <div>• AI tutor</div>
          </div>
        </div>
      </div>

      {/* Large label image positioned to avoid overlap */}
      {currentMatch && !isProcessing && (
        <div style={{ 
          position: 'absolute',
          top: '120px', // Moved down to start under email input
          left: '250px', // Start after the small image area
          right: '20px', // Leave some margin from right edge
          bottom: '20px', // Add bottom margin
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img 
            src={`/qs/${currentMatch.labelId}.png`}
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
            Processing...
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