import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useSignature } from '@/hooks/use-signature';
import { useLanguageContext } from './language-provider';

interface SignatureCanvasProps {
  onSignatureChange: (signature: string) => void;
}

export function SignatureCanvas({ onSignatureChange }: SignatureCanvasProps) {
  const { t } = useLanguageContext();
  const {
    canvasRef,
    signature,
    startDrawing,
    draw,
    stopDrawing,
    clearSignature,
    initializeCanvas,
  } = useSignature();

  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  useEffect(() => {
    onSignatureChange(signature);
  }, [signature, onSignatureChange]);

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
      <div className="text-center">
        <div className="mb-4">
          <svg className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <p className="text-gray-600 mb-4">{t.signaturePrompt}</p>
        
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="border-2 border-gray-300 rounded bg-white cursor-crosshair mx-auto touch-none max-w-full"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startDrawing(e);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
            draw(e);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            stopDrawing();
          }}
        />
        
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={clearSignature}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t.clear}
          </Button>
        </div>
      </div>
    </div>
  );
}
