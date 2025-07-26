import { useCallback, useRef } from 'react';

// Hook to isolate answer changes from parent re-renders
export function useIsolatedAnswerChange(onAnswerChange: (questionId: string, value: any) => void) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleAnswerChange = useCallback((questionId: string, value: any) => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Use a very short timeout to batch updates
    timeoutRef.current = setTimeout(() => {
      onAnswerChange(questionId, value);
    }, 10); // Very short delay, just to batch
  }, [onAnswerChange]);
  
  return handleAnswerChange;
}