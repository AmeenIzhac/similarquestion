import type { LevelFilter, CalculatorFilter } from '../types/index';

export const searchPinecone = async (
  query: string,
  topK: number = 25,
  levelFilter: LevelFilter = 'all',
  calculatorFilter: CalculatorFilter = 'all'
) => {
  try {
    const pineconeApiKey = import.meta.env.VITE_PINECONE_API_KEY;
    const indexHost = import.meta.env.VITE_PINECONE_INDEX_HOST;
    const namespace = import.meta.env.VITE_PINECONE_NAMESPACE || 'example-namespace';
    
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
    
    if (calculatorFilter === 'calculator') {
      filter.paper_number = { $in: ['2', '3'] };
    } else if (calculatorFilter === 'non-calculator') {
      filter.paper_number = '1';
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
