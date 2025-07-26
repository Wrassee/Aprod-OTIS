import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguageContext } from './language-provider';

interface SimpleSignatureCanvasProps {
  onSignatureChange: (signature: string) => void;
}

export function SimpleSignatureCanvas({ onSignatureChange }: SimpleSignatureCanvasProps) {
  const { t } = useLanguageContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 600;
    canvas.height = 200;

    // Set white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getEventPos = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getEventPos(e, canvas);
    setIsDrawing(true);
    setLastPoint(pos);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: any) => {
    e.preventDefault();
    if (!isDrawing || !lastPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getEventPos(e, canvas);
    
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    setLastPoint(pos);
  };

  const stopDrawing = (e?: any) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
    setLastPoint(null);

    const canvas = canvasRef.current;
    if (canvas) {
      onSignatureChange(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onSignatureChange('');
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Kérjük, írja alá az alábbi mezőben</p>
        
        <div className="mb-4">
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-300 rounded bg-white mx-auto block cursor-crosshair"
            style={{ 
              maxWidth: '100%',
              height: 'auto',
              touchAction: 'none'
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        
        <Button
          variant="outline"
          onClick={clearSignature}
          className="text-gray-600 border-gray-300 hover:bg-gray-50"
        >
          Törlés
        </Button>
      </div>
    </div>
  );
}