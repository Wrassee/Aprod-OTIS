import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguageContext } from './language-provider';

interface SimpleSignatureCanvasProps {
  onSignatureChange: (signature: string) => void;
  initialSignature?: string;
}

export function SimpleSignatureCanvas({ onSignatureChange, initialSignature }: SimpleSignatureCanvasProps) {
  const { t } = useLanguageContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number, y: number } | null>(null);

  // Local refs for this component only
  const initializedRef = useRef(false);
  const canvasInitialized = useRef(false);
  const initialCallbackSent = useRef(false);

  // Canvas initialization - runs ONLY ONCE per component mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('Setting up signature canvas...');

    // Set canvas size
    canvas.width = 600;
    canvas.height = 200;

    // Set white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    
    canvasInitialized.current = true;
    
    // Load initial signature if provided, otherwise send empty canvas
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        // Restore canvas settings after loading image
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Restore drawing settings
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        
        console.log('Signature loaded from initial data');
      };
      img.src = initialSignature;
    } else if (!initialCallbackSent.current) {
      // Send initial empty signature callback
      initialCallbackSent.current = true;
      setTimeout(() => {
        onSignatureChange(canvas.toDataURL());
        console.log('Clean canvas ready');
      }, 50);
    }
  }, []); // Only run once per mount
  
  // NO SEPARATE EFFECT FOR INITIAL SIGNATURE - handled in main init

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
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas || !canvasInitialized.current) {
      console.log('Canvas not ready for drawing');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Ensure drawing settings are applied
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    
    const pos = getEventPos(e, canvas);
    setIsDrawing(true);
    setLastPoint(pos);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    
    console.log('Started drawing at:', pos);
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasInitialized.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getEventPos(e, canvas);
    const ctx = canvas.getContext('2d');

    if (ctx && lastPoint) {
      // Continuous line drawing
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setLastPoint(pos);
    }
  };

  const stopDrawing = (e?: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!isDrawing) return;
    
    setIsDrawing(false);
    setLastPoint(null);

    // CRITICAL: Only update signature if canvas is initialized and has content
    const canvas = canvasRef.current;
    if (canvas && canvasInitialized.current) {
      // Small delay to ensure drawing is complete before capturing
      setTimeout(() => {
        const dataURL = canvas.toDataURL();
        onSignatureChange(dataURL);
        console.log('Signature saved - canvas ready');
      }, 50);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasInitialized.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and reset canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset drawing settings
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    
    // Update signature immediately
    onSignatureChange(canvas.toDataURL());
    console.log('Signature cleared');
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600 mb-4">{t.signaturePrompt}</p>
        
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
          {t.clear}
        </Button>
      </div>
    </div>
  );
}