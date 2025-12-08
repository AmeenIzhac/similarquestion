import { useState, useCallback, useEffect } from 'react';
import { Mistral } from '@mistralai/mistralai';
import { searchPinecone, convertFileToBase64 } from '../utils/api';
import type { Match, LevelFilter, CalculatorFilter, SearchMethod } from '../types/index';

interface UseSearchProps {
  levelFilter: LevelFilter;
  calculatorFilter: CalculatorFilter;
  numMatches: number;
  searchMethod: SearchMethod;
}

const ERROR_MATCH: Match = {
  labelId: 'error',
  text: 'Sorry, the search service is broken today. Please try again later.',
  similarity: 0
};

export function useSearch({ levelFilter, calculatorFilter, numMatches, searchMethod }: UseSearchProps) {
  const [client, setClient] = useState<Mistral | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const mistralApiKey = import.meta.env.VITE_MISTRAL_API_KEY;
    if (mistralApiKey) {
      setClient(new Mistral({ apiKey: mistralApiKey }));
    }
  }, []);

  const currentMatch = topMatches[currentMatchIndex];

  const nextMatch = useCallback(() => {
    if (topMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % topMatches.length);
    }
  }, [topMatches.length]);

  const prevMatch = useCallback(() => {
    if (topMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + topMatches.length) % topMatches.length);
    }
  }, [topMatches.length]);

  const searchByText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    try {
      const pineconeResults = await searchPinecone(text, numMatches, levelFilter, calculatorFilter, searchMethod);
      
      if (pineconeResults && pineconeResults.result && pineconeResults.result.hits) {
        const matches: Match[] = pineconeResults.result.hits.map((hit: { _id: string; fields?: { chunk_text?: string }; _score: number }) => ({
          labelId: hit._id,
          text: hit.fields?.chunk_text || 'No text found',
          similarity: hit._score
        }));
        setTopMatches(matches);
        setCurrentMatchIndex(0);
      } else {
        setTopMatches([ERROR_MATCH]);
        setCurrentMatchIndex(0);
      }
    } catch (error) {
      console.error("Error searching by text:", error);
      setTopMatches([ERROR_MATCH]);
      setCurrentMatchIndex(0);
    } finally {
      setIsProcessing(false);
    }
  }, [levelFilter, calculatorFilter, numMatches, searchMethod]);

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
      
      const pineconeResults = await searchPinecone(extractedText, numMatches, levelFilter, calculatorFilter, searchMethod);
      
      if (pineconeResults && pineconeResults.result && pineconeResults.result.hits) {
        const matches: Match[] = pineconeResults.result.hits.map((hit: { _id: string; fields?: { chunk_text?: string }; _score: number }) => ({
          labelId: hit._id,
          text: hit.fields?.chunk_text || 'No text found',
          similarity: hit._score
        }));
        setTopMatches(matches);
        setCurrentMatchIndex(0);
      } else {
        setTopMatches([ERROR_MATCH]);
        setCurrentMatchIndex(0);
      }
    } catch (error) {
      console.error("Error processing OCR:", error);
      setTopMatches([ERROR_MATCH]);
      setCurrentMatchIndex(0);
    } finally {
      setIsProcessing(false);
    }
  }, [client, levelFilter, calculatorFilter, numMatches, searchMethod]);

  return {
    isProcessing,
    topMatches,
    currentMatch,
    currentMatchIndex,
    hasStarted,
    setHasStarted,
    nextMatch,
    prevMatch,
    searchByText,
    processImageWithOCR
  };
}
