import type { LevelFilter, CalculatorFilter, Qualification, Board } from '../types/index';

export const searchPinecone = async (
  query: string,
  topK: number = 25,
  levelFilter: LevelFilter = 'all',
  calculatorFilter: CalculatorFilter = 'all',
  qualification: Qualification = 'gcse',
  board: Board = 'all'
) => {
  try {
    const pineconeApiKey = import.meta.env.VITE_PINECONE_API_KEY;
    const indexHost = qualification === 'alevel'
      ? import.meta.env.VITE_PINECONE_INDEX_HOST_ALEVEL
      : qualification === 'igcse'
        ? import.meta.env.VITE_PINECONE_INDEX_HOST_IGCSE
        : import.meta.env.VITE_PINECONE_INDEX_HOST;
    const namespace = qualification === 'alevel'
      ? (import.meta.env.VITE_PINECONE_NAMESPACE_ALEVEL || '__default__')
      : qualification === 'igcse'
        ? (import.meta.env.VITE_PINECONE_NAMESPACE_IGCSE || '__default__')
        : (import.meta.env.VITE_PINECONE_NAMESPACE || 'example-namespace');
    
    if (!pineconeApiKey) {
      console.error('Pinecone API key not configured');
      return null;
    }

    if (!indexHost) {
      console.error(`Pinecone index host not configured`);
      return null;
    }

    // Build filter object
    let filter: Record<string, unknown> = {};
    
    if (levelFilter !== 'all') {
      filter.level = levelFilter;
    }
    
    // Every record carries exam_board ('edexcel' | 'aqa' | 'ocr').
    if (board !== 'all') {
      filter.exam_board = board;
    }

    if (qualification === 'gcse' && calculatorFilter !== 'all') {
      // Edexcel/AQA GCSE: paper 1 is non-calculator, papers 2-3 calculator.
      // OCR (J560): papers 2 and 5 are non-calculator, the rest calculator.
      const wantCalc = calculatorFilter === 'calculator';
      if (board === 'ocr') {
        filter.paper_number = wantCalc ? { $in: ['1', '3', '4', '6'] } : { $in: ['2', '5'] };
      } else if (board === 'all') {
        filter.$or = [
          { exam_board: { $in: ['edexcel', 'aqa'] }, paper_number: wantCalc ? { $in: ['2', '3'] } : '1' },
          { exam_board: 'ocr', paper_number: wantCalc ? { $in: ['1', '3', '4', '6'] } : { $in: ['2', '5'] } },
        ];
      } else {
        filter.paper_number = wantCalc ? { $in: ['2', '3'] } : '1';
      }
    }

    // If no filters applied, set to undefined
    const finalFilter = Object.keys(filter).length === 0 ? undefined : filter;

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
          top_k: topK,
          filter: finalFilter
        },
        fields: ["text", "exam_board", "file"]
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

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
