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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [topMatches, setTopMatches] = useState<Array<{ labelId: string; text: string; similarity: number }>>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [emailSubmitted, setEmailSubmitted] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [showMarkScheme, setShowMarkScheme] = useState<boolean>(false);


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

  const sidebarWidth = sidebarOpen ? 300 : 50;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '300px' : '50px',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        borderRight: '2px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'relative'
      }}>
        {/* Header with Title and Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 15px',
          borderBottom: '1px solid #ddd'
        }}>
          {sidebarOpen && (
            <h1 style={{ 
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              flex: 1,
              textAlign: 'center'
            }}>
              Find Similar GCSE Maths Questions
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'transparent',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              marginLeft: sidebarOpen ? '10px' : '0'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
            </svg>
          </button>
        </div>

        {/* Sidebar Content */}
        {sidebarOpen && (
          <div style={{ padding: '15px', overflowY: 'auto' }}>

            {/* Image upload section */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Upload Image:</h3>
              {imageUrl && (
                <img 
                  src={imageUrl} 
                  alt="Uploaded" 
                  style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px', borderRadius: '4px' }} 
                />
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload}
                style={{
                  color: 'transparent',
                  width: '100%',
                  marginBottom: '5px'
                }}
              />
              <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
                Or paste an image with Ctrl+V
              </p>
            </div>

            {/* Text search section */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Or Search by Text:</h3>
              <form onSubmit={handleTextSearch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Describe the type of question... (e.g., 'hard quadratic equations', 'trigonometry')"
                  style={{
                    width: '100%',
                    height: '60px',
                    padding: '8px',
                    border: '2px solid #333',
                    borderRadius: '4px',
                    fontSize: '12px',
                    resize: 'none',
                    boxSizing: 'border-box'
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

            {/* Email Signup Form */}
            <div style={{ 
              backgroundColor: '#fff',
              padding: '15px',
              borderRadius: '8px',
              border: '2px solid #333',
              marginBottom: '20px'
            }}>
              {!emailSubmitted ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    color: '#007bff', 
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    Enter email for access to Premium Version! 🔥
                  </p>
                  
                  {/* Premium Features List */}
                  <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                    <div>• Mark scheme answers</div>
                    <div>• More GCSE subjects</div>
                    <div>• AI tutor</div>
                  </div>
                  
                  <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email for updates"
                      style={{
                        padding: '8px 12px',
                        border: '2px solid #333',
                        borderRadius: '4px',
                        fontSize: '12px',
                        width: '100%',
                        boxSizing: 'border-box'
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
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                      disabled={!email.trim()}
                    >
                      Submit
                    </button>
                  </form>
                  {emailError && (
                    <p style={{ color: 'red', fontSize: '11px', margin: 0, textAlign: 'center' }}>
                      {emailError}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ color: '#28a745', fontSize: '12px', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
                  Thank you for signing up! ✓
                </p>
              )}
            </div>

            {/* OCR Results */}
            {isProcessing && (
              <p style={{ fontSize: '12px', color: '#007bff', marginBottom: '15px' }}>
                Processing...
              </p>
            )}

          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1,
        position: 'relative',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {currentMatch && !isProcessing && currentMatch.labelId !== 'error' && (
          <>
            <div style={{
              flex: 'none',
              height: showMarkScheme ? '50vh' : '100vh',
              padding: '20px',
              boxSizing: 'border-box',
              overflowY: 'scroll'
            }}>
              <img
                src={`/edexcel-gcse-maths-questions/${currentMatch.labelId}`}
                alt={currentMatch.labelId}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
            </div>
            <button
              onClick={() => setShowMarkScheme((prev) => !prev)}
              style={{
                position: 'fixed',
                bottom: '20px',
                left: `${sidebarWidth + 20}px`,
                padding: '10px 14px',
                backgroundColor: showMarkScheme ? '#dc3545' : '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                zIndex: 10
              }}
            >
              {showMarkScheme ? 'Hide mark scheme' : 'View mark scheme'}
            </button>
            {showMarkScheme && (
              <div style={{
                flex: 'none',
                height: '50vh',
                padding: '20px',
                boxSizing: 'border-box',
                borderTop: '2px solid #ddd',
                backgroundColor: '#ffffff',
                overflowY: 'scroll'
              }}>
                <img
                  src={`/edexcel-gcse-maths-answers/${currentMatch.labelId}`}
                  alt={`${currentMatch.labelId} mark scheme`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
            )}
          </>
        )}

        {currentMatch && !isProcessing && currentMatch.labelId === 'error' && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center',
            color: '#555',
            fontSize: '16px'
          }}>
            {currentMatch.text}
          </div>
        )}

        {isProcessing && (
          <div style={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '10px',
            padding: '40px'
          }}>
            <div style={{ 
              textAlign: 'center',
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
    </div>
  );
}

export default App;