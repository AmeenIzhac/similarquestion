import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Mistral } from '@mistralai/mistralai';
import jsPDF from 'jspdf';
import emailjs from '@emailjs/browser';

// Function to search Pinecone using REST API
const searchPinecone = async (
  query: string, 
  topK: number = 25, 
  levelFilter: 'all' | 'h' | 'f' = 'all',
  calculatorFilter: 'all' | 'calculator' | 'non-calculator' = 'all'
) => {
  try {
    const pineconeApiKey = import.meta.env.VITE_PINECONE_API_KEY;
    const indexHost1 = import.meta.env.VITE_PINECONE_INDEX_HOST1;
    const indexHost2 = import.meta.env.VITE_PINECONE_INDEX_HOST2;
    const namespace = import.meta.env.VITE_PINECONE_NAMESPACE || 'example-namespace';
    
    if (!pineconeApiKey || !indexHost2) {
      console.error('Pinecone API key or index host not configured');
      return null;
    }

    // Build filter object
    let filter: any = {};
    
    if (levelFilter !== 'all') {
      filter.level = levelFilter;
    }
    
    if (calculatorFilter === 'calculator') {
      filter.paper_number = { $in: ['2', '3'] };
    } else if (calculatorFilter === 'non-calculator') {
      filter.paper_number = '1';
    }
    
    // If no filters applied, set to undefined
    const finalFilter = Object.keys(filter).length === 0 ? undefined : filter;

    const response = await fetch(`https://${indexHost2}/records/namespaces/${namespace}/search`, {
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
          top_k: topK,
          filter: finalFilter
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

const formatLabelId = (labelId: string | undefined) => {
  if (!labelId) return '';
  const cleaned = labelId.replace(/\.png$/i, '');
  const parts = cleaned.split('-');
  if (parts.length < 5) return cleaned;
  const [year, monthRaw, levelRaw, paperRaw, questionRaw] = parts;
  const monthLower = monthRaw.toLowerCase();
  const specialMonthMatch = monthLower.match(/^(specimen|sample)(\d+)$/);
  const month = specialMonthMatch
    ? `${specialMonthMatch[1].charAt(0).toUpperCase()}${specialMonthMatch[1].slice(1)} Set ${specialMonthMatch[2]}`
    : monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const levelLower = levelRaw.toLowerCase();
  const level = levelLower === 'h' ? 'Higher' : levelLower === 'f' ? 'Foundation' : levelRaw;
  const paperNumber = paperRaw.replace(/[^0-9]/g, '') || paperRaw;
  const paper = `Paper ${paperNumber}`;
  const questionMatch = questionRaw.match(/q(\d+)/i);
  const question = questionMatch ? `Question ${questionMatch[1]}` : questionRaw;
  return `${year} ${month} ${level} • ${paper} • ${question}`;
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
  const [levelFilter, setLevelFilter] = useState<'all' | 'h' | 'f'>('all');
  const [calculatorFilter, setCalculatorFilter] = useState<'all' | 'calculator' | 'non-calculator'>('all');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isSavingPdf, setIsSavingPdf] = useState<boolean>(false);
  const [hoveredSelected, setHoveredSelected] = useState<string | null>(null);
  const [pdfMode, setPdfMode] = useState<'questions' | 'answers' | 'interleaved'>('questions');
  const [showWorksheet, setShowWorksheet] = useState<boolean>(false);
  const [showFilterPopup, setShowFilterPopup] = useState<boolean>(false);
  const [numMatches, setNumMatches] = useState<number>(25);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [showCenterFilter, setShowCenterFilter] = useState<boolean>(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    email: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({
    isSubmitting: false,
    isSuccess: false,
    isError: false,
    message: ''
  });

  const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_oek5h8g';
  const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_1zfstkg';
  const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'qek1xidpKLDofXa4z';

  React.useEffect(() => {
    if (EMAILJS_PUBLIC_KEY !== 'qek1xidpKLDofXa4z') {
      emailjs.init(EMAILJS_PUBLIC_KEY);
    }
  }, [EMAILJS_PUBLIC_KEY]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.message.trim()) {
      setFormStatus({
        isSubmitting: false,
        isSuccess: false,
        isError: true,
        message: 'Please let us know how we can help.'
      });
      return;
    }

    if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'qrpDqd4BYagZAeDXk') {
      setFormStatus({
        isSubmitting: false,
        isSuccess: false,
        isError: true,
        message: 'EmailJS is not configured. Please contact the administrator.'
      });
      return;
    }

    setFormStatus({
      isSubmitting: true,
      isSuccess: false,
      isError: false,
      message: ''
    });

    try {
      const templateParams = {
        from_name: 'Website Visitor',
        from_email: formData.email || 'Not provided',
        message: formData.message,
        to_email: 'start@oasissummerschool.com' // Your email address
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      setFormStatus({
        isSubmitting: false,
        isSuccess: true,
        isError: false,
        message: 'Message sent successfully! We\'ll get back to you soon, God willing.'
      });

      // Reset form
      setFormData({
        email: '',
        message: ''
      });

    } catch (error) {
      console.error('EmailJS error:', error);
      setFormStatus({
        isSubmitting: false,
        isSuccess: false,
        isError: true,
        message: 'Failed to send message. Please try again or contact us directly.'
      });
    }
  };

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
      
      const extractedText = ocrResponse.pages?.[0]?.markdown || 'No text found';
      
      // Find similar questions using Pinecone with extracted text
      const pineconeResults = await searchPinecone(extractedText, numMatches, levelFilter, calculatorFilter);
      
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
  }, [client, levelFilter, calculatorFilter, numMatches]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setHasStarted(true);
      
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
            setHasStarted(true);
            
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

  const isCurrentSelected = useMemo(() => {
    if (!currentMatch || currentMatch.labelId === 'error') return false;
    return selectedQuestions.includes(currentMatch.labelId);
  }, [currentMatch, selectedQuestions]);

  const toggleCurrentQuestionSelection = useCallback(() => {
    if (!currentMatch || currentMatch.labelId === 'error') return;
    setSelectedQuestions((prev) => {
      const exists = prev.includes(currentMatch.labelId);
      const next = exists
        ? prev.filter((item) => item !== currentMatch.labelId)
        : [...prev, currentMatch.labelId];
      if (!exists && !showWorksheet) {
        setShowWorksheet(true);
      }
      return next;
    });
  }, [currentMatch, showWorksheet]);

  const removeSelectedQuestion = useCallback((labelId: string) => {
    setSelectedQuestions((prev) => prev.filter((item) => item !== labelId));
  }, []);

  const handleDownloadSelected = useCallback(async () => {
    if (selectedQuestions.length === 0 || isSavingPdf) {
      return;
    }

    setIsSavingPdf(true);
    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      let currentY = margin;
      let atPageStart = true;

      const renderItems = selectedQuestions.flatMap((labelId) => {
        const questionPath = `/edexcel-gcse-maths-questions/${labelId}`;
        const answerPath = `/edexcel-gcse-maths-answers/${labelId}`;

        if (pdfMode === 'questions') {
          return [{ labelId, path: questionPath, type: 'question' as const }];
        }

        if (pdfMode === 'answers') {
          return [{ labelId, path: answerPath, type: 'answer' as const }];
        }

        return [
          { labelId, path: questionPath, type: 'question' as const },
          { labelId, path: answerPath, type: 'answer' as const }
        ];
      });

      for (let index = 0; index < renderItems.length; index += 1) {
        const { labelId, path, type } = renderItems[index];

        if (type === 'question') {
          if (!atPageStart) {
            pdf.addPage();
            currentY = margin;
            atPageStart = true;
          }
        }

        const response = await fetch(path);

        if (!response.ok) {
          throw new Error(`Failed to load ${type} image: ${labelId}`);
        }

        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const { width: imageWidth, height: imageHeight } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = reject;
          img.src = dataUrl;
        });

        let renderWidth = maxWidth;
        let renderHeight = (imageHeight * renderWidth) / imageWidth;

        if (renderHeight > maxHeight) {
          renderHeight = maxHeight;
          renderWidth = (imageWidth * renderHeight) / imageHeight;
        }

        if (currentY + renderHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        const x = (pageWidth - renderWidth) / 2;
        const imageType = labelId.toLowerCase().endsWith('.jpg') || labelId.toLowerCase().endsWith('.jpeg') ? 'JPEG' : 'PNG';

        pdf.addImage(dataUrl, imageType as 'PNG' | 'JPEG', x, currentY, renderWidth, renderHeight);
        atPageStart = false;

        currentY += renderHeight + 5;

        if (index < renderItems.length - 1 && currentY > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
          atPageStart = true;
        }
      }

      const fileSuffix = pdfMode === 'questions' ? 'questions' : pdfMode === 'answers' ? 'answers' : 'interleaved';
      pdf.save(`selected-${fileSuffix}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsSavingPdf(false);
    }
  }, [isSavingPdf, selectedQuestions, pdfMode]);

  const searchByText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    try {
      // Try Pinecone first
      const pineconeResults = await searchPinecone(text, numMatches, levelFilter, calculatorFilter);
      
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
  }, [levelFilter, calculatorFilter, numMatches]);

  const handleTextSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      setHasStarted(true);
      searchByText(searchText);
    }
  };

  const sidebarWidth = sidebarOpen ? 300 : 50;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f7f7f8' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '300px' : '50px',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e5e5',
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
          borderBottom: 'none'
        }}>
          {sidebarOpen && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
              <span style={{ fontWeight: 700, color: '#666', fontSize: '20px' }}>SQ</span>
            </div>
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
            <div style={{ marginBottom: '20px' }}>
              {/* Intentionally left blank */}
              <button
                onClick={() => setShowCenterFilter(true)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: '#10a37f',
                  color: '#fff',
                  border: '1px solid #10a37f',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '15px'
                }}
              >
                Filters
              </button>
              <button
                onClick={() => {
                  setShowWorksheet((prev) => {
                    if (prev) {
                      const dropdown = document.getElementById('downloadDropdown');
                      if (dropdown) {
                        dropdown.style.display = 'none';
                      }
                    }
                    return !prev;
                  });
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: '#10a37f',
                  color: '#fff',
                  border: '1px solid #10a37f',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '15px'
                }}
              >
                {showWorksheet ? 'Hide Worksheet' : 'Make Worksheet'}
              </button>

              <button
                onClick={() => {
                  setShowFeedbackForm((prev) => {
                    const next = !prev;
                    if (!next) {
                      setFormStatus({
                        isSubmitting: false,
                        isSuccess: false,
                        isError: false,
                        message: ''
                      });
                    }
                    return next;
                  });
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: showFeedbackForm ? '#0e8d6d' : '#10a37f',
                  color: '#fff',
                  border: '1px solid #10a37f',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '12px'
                }}
              >
                {showFeedbackForm ? 'Hide Feedback' : 'Request Features'}
              </button>

              {showFeedbackForm && (
                <form
                  onSubmit={handleSubmit}
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ fontSize: '13px', color: 'black', lineHeight: 1.4, fontWeight: 600 }}>
                    Share feedback, report bugs, or suggest features you'd like to see.
                  </div>
                  <textarea
                    name="message"
                    placeholder="What needs fixing?"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      resize: 'vertical'
                    }}
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email (optional for a reply)"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    Leave your email if you would like us to follow up.
                  </div>
                  {formStatus.message && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: formStatus.isError ? '#b91c1c' : '#047857'
                      }}
                    >
                      {formStatus.message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={formStatus.isSubmitting}
                    style={{
                      alignSelf: 'flex-end',
                      padding: '8px 16px',
                      backgroundColor: formStatus.isSubmitting ? '#9ca3af' : '#10a37f',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: formStatus.isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    {formStatus.isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}

              {showWorksheet && (
                <div style={{
                  marginTop: '15px',
                  padding: '12px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0, fontSize: '13px', color: '#333', fontWeight: 'bold' }}>Worksheet</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setShowWorksheet(false);
                            const dropdown = document.getElementById('downloadDropdown');
                            if (dropdown) {
                              dropdown.style.display = 'none';
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 8px'
                          }}
                          aria-label="Hide worksheet"
                        >
                          Hide
                        </button>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            onClick={() => {
                              const dropdown = document.getElementById('downloadDropdown');
                              if (dropdown) {
                                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                              }
                            }}
                            disabled={selectedQuestions.length === 0 || isSavingPdf}
                            style={{
                              backgroundColor: selectedQuestions.length === 0 || isSavingPdf ? '#c9c9c9' : '#10a37f',
                              color: '#fff',
                              border: selectedQuestions.length === 0 || isSavingPdf ? '1px solid #c9c9c9' : '1px solid #10a37f',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: selectedQuestions.length === 0 || isSavingPdf ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              minWidth: '120px',
                              justifyContent: 'space-between'
                            }}
                          >
                            {isSavingPdf ? 'Saving...' : `Download ${pdfMode === 'questions' ? 'Questions' : pdfMode === 'answers' ? 'Answers' : 'Q&A'}`}
                            <span style={{ fontSize: '10px', marginLeft: '4px' }}>▼</span>
                          </button>
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              backgroundColor: '#ffffff',
                              borderRadius: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              zIndex: 10,
                              marginTop: '4px',
                              minWidth: '160px',
                              display: 'none',
                              border: '1px solid #e5e5e5'
                            }}
                            id="downloadDropdown"
                          >
                            {[
                              { mode: 'questions', label: 'Questions Only' },
                              { mode: 'answers', label: 'Answers Only' },
                              { mode: 'interleaved', label: 'Questions & Answers' }
                            ].map(({ mode, label }) => (
                              <div
                                key={mode}
                                style={{
                                  padding: '8px 16px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: '#111',
                                  backgroundColor: 'transparent',
                                  transition: 'all 0.2s',
                                  borderBottom: '1px solid #f5f5f5',
                                  ...(mode === 'interleaved' && {
                                    borderBottom: 'none',
                                    borderBottomLeftRadius: '4px',
                                    borderBottomRightRadius: '4px'
                                  }),
                                  ...(mode === 'questions' && {
                                    borderTopLeftRadius: '4px',
                                    borderTopRightRadius: '4px'
                                  })
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f2f2f3';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                onClick={() => {
                                  setPdfMode(mode as 'questions' | 'answers' | 'interleaved');
                                  document.getElementById('downloadDropdown')!.style.display = 'none';
                                  handleDownloadSelected();
                                }}
                              >
                                {label}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <script
                      dangerouslySetInnerHTML={{
                        __html: `
                          document.addEventListener('click', function(event) {
                            const dropdown = document.getElementById('downloadDropdown');
                            const button = event.target.closest('button');
                            if (dropdown) {
                              if (button && button.textContent.includes('Download')) {
                                event.stopPropagation();
                                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                              } else if (!event.target.closest('#downloadDropdown')) {
                                dropdown.style.display = 'none';
                              }
                            }
                          });
                        `
                      }}
                    />
                    
                    <div style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      border: '1px dashed #e5e5e5',
                      padding: '16px',
                      textAlign: 'center',
                      marginBottom: '10px',
                      minHeight: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      {selectedQuestions.length > 0 ? (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '10px',
                          justifyContent: 'center',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          padding: '5px'
                        }}>
                          {selectedQuestions.map((labelId) => (
                            <div
                              key={labelId}
                              style={{
                                position: 'relative',
                                width: '60px',
                                height: '60px',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: '1px solid #e8e8e8',
                                backgroundColor: '#fafafa'
                              }}
                              onMouseEnter={() => setHoveredSelected(labelId)}
                              onMouseLeave={() => setHoveredSelected(null)}
                            >
                              <img
                                src={`/edexcel-gcse-maths-questions/${labelId}`}
                                alt={labelId}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  opacity: hoveredSelected === labelId ? 0.7 : 1,
                                  transition: 'opacity 0.2s'
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSelectedQuestion(labelId);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '2px',
                                  right: '2px',
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  backgroundColor: 'rgba(255, 77, 79, 0.9)',
                                  color: '#fff',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0,
                                  opacity: hoveredSelected === labelId ? 1 : 0,
                                  transition: 'opacity 0.2s',
                                  lineHeight: 1
                                }}
                                aria-label={`Remove ${formatLabelId(labelId)}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '13px', color: '#8c8c8c' }}>
                          Once you select questions for the worksheet they'll appear here
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {false && (
              <div style={{ 
                backgroundColor: '#ffffff',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #e5e5e5',
                marginBottom: '20px'
              }}>
                {!emailSubmitted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px', 
                      color: '#333', 
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}>
                      Like the product? Drop your email below for more! 🔥
                    </p>
                    {/* Premium Features List */}
                    <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                      <div>• Example Solutions</div>
                      <div>• A Levels</div>
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
                          border: '1px solid #e5e5e5',
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
                          backgroundColor: email.trim() ? '#10a37f' : '#e5e5e5',
                          color: email.trim() ? '#fff' : '#333',
                          border: '1px solid',
                          borderColor: email.trim() ? '#10a37f' : '#e5e5e5',
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
            )}

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
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#ffffff'
      }}>
        {!hasStarted && !isProcessing && (!currentMatch || currentMatch.labelId === 'error') && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#111' }}>Find Similar GCSE Maths Questions</h1>
              </div>
              <form onSubmit={handleTextSearch} style={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '9999px', padding: '6px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
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
                        setHasStarted(true);
                        searchByText(searchText);
                      }
                    }
                  }}
                  placeholder="Describe the question of your dreams"
                  rows={1}
                  style={{
                    flex: 1,
                    height: 'auto',
                    minHeight: '44px',
                    padding: '10px 12px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '16px',
                    resize: 'none',
                    boxSizing: 'border-box',
                    background: 'transparent',
                    overflow: 'hidden'
                  }}
                />
                </div>
              </form>
            </div>
            <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, textAlign: 'center', color: '#8e8ea0', fontSize: '11px' }}>
              Similar Question 2025.
            </div>
          </div>
        )}
        {currentMatch && !isProcessing && currentMatch.labelId !== 'error' && (
          <>
            <div style={{
              flex: 'none',
              padding: '8px 16px',
              borderBottom: '1px solid #e5e5e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#333', flex: 1, marginRight: '10px' }}>
                {formatLabelId(currentMatch.labelId)}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#555' }}>
                  Match {currentMatchIndex + 1} of {topMatches.length}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={prevMatch}
                    style={{ padding: '6px 10px', backgroundColor: '#f2f2f3', color: '#111', border: '1px solid #e5e5e5', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextMatch}
                    style={{ padding: '6px 10px', backgroundColor: '#f2f2f3', color: '#111', border: '1px solid #e5e5e5', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    Next
                  </button>
                </div>
                <button
                  onClick={toggleCurrentQuestionSelection}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: isCurrentSelected ? '#ef4444' : '#10a37f',
                    color: '#fff',
                    border: '1px solid',
                    borderColor: isCurrentSelected ? '#ef4444' : '#10a37f',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  {isCurrentSelected ? 'Remove from list' : 'Add to worksheet'}
                </button>
              </div>
            </div>
            <div style={{
              flex: 1,
              padding: '0px',
              boxSizing: 'border-box',
              overflowY: 'auto'
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
                backgroundColor: showMarkScheme ? '#6b7280' : '#10a37f',
                color: '#fff',
                border: '1px solid',
                borderColor: showMarkScheme ? '#6b7280' : '#10a37f',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                zIndex: 10
              }}
            >
              {showMarkScheme ? 'Hide mark scheme' : 'Show mark scheme'}
            </button>
            {showMarkScheme && (
              <div style={{
                flex: 1,
                padding: '20px 20px 96px 20px',
                boxSizing: 'border-box',
                borderTop: '1px solid #e5e5e5',
                backgroundColor: '#ffffff',
                overflowY: 'auto'
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
                <div style={{ height: '120px' }} />
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
              color: '#10a37f',
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

        {hasStarted && !isProcessing && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 0', background: 'linear-gradient(180deg, rgba(247,247,248,0) 0%, rgba(247,247,248,1) 40%)' }}>
            <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
              <form onSubmit={handleTextSearch} style={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '9999px', padding: '6px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
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
                          searchByText(searchText);
                        }
                      }
                    }}
                    placeholder="Describe the question of your dreams"
                    rows={1}
                    style={{ flex: 1, height: 'auto', minHeight: '44px', padding: '10px 12px', border: 'none', outline: 'none', fontSize: '16px', resize: 'none', boxSizing: 'border-box', background: 'transparent', overflow: 'hidden' }}
                  />
                </div>
              </form>
            </div>
          </div>
        )}

        {showCenterFilter && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCenterFilter(false); }}
          >
            <div
              style={{ width: '100%', maxWidth: '560px', background: '#fff', border: '1px solid #eaeaea', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', padding: '20px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#111', fontWeight: 600 }}>Filters</h3>
                <button
                  onClick={() => setShowCenterFilter(false)}
                  style={{ border: '1px solid #e5e5e5', background: '#fff', cursor: 'pointer', color: '#333', fontSize: '16px', width: '28px', height: '28px', borderRadius: '9999px', lineHeight: 1 }}
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
                    onChange={(e) => setLevelFilter(e.target.value as 'all' | 'h' | 'f')}
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
                    onChange={(e) => setCalculatorFilter(e.target.value as 'all' | 'calculator' | 'non-calculator')}
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
                    value={numMatches as any}
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
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => { setLevelFilter('all'); setCalculatorFilter('all'); }}
                    style={{ flex: 1, height: '40px', padding: '0 12px', background: '#f5f5f6', color: '#111', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCenterFilter(false)}
                    style={{ flex: 1, height: '40px', padding: '0 12px', background: '#10a37f', color: '#fff', border: '1px solid #109e7b', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;