import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SimpleSignatureCanvas } from '@/components/simple-signature-canvas';
import { useLanguageContext } from '@/components/language-provider';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Check, Calendar } from 'lucide-react';

interface UltimateSignatureProps {
  signature: string;
  signatureName: string;
  onSignatureChange: (signature: string) => void;
  onSignatureNameChange: (name: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

export default function UltimateSignature({
  signature,
  signatureName,
  onSignatureChange,
  onSignatureNameChange,
  onBack,
  onComplete
}: UltimateSignatureProps) {
  const { language, t } = useLanguageContext();
  const currentDate = formatDate(new Date(), language);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const canComplete = true;

  // Completely isolated name state
  const [nameValue, setNameValue] = useState(signatureName || '');

  useEffect(() => {
    setNameValue(signatureName || '');
  }, [signatureName]);

  // Force DOM styling for name input
  useEffect(() => {
    if (nameInputRef.current) {
      const input = nameInputRef.current;
      
      // Force styles using DOM manipulation
      input.style.setProperty('width', '100%', 'important');
      input.style.setProperty('height', '60px', 'important');
      input.style.setProperty('font-size', '20px', 'important');
      input.style.setProperty('padding', '0 20px', 'important');
      input.style.setProperty('border', '3px solid #3b82f6', 'important');
      input.style.setProperty('border-radius', '10px', 'important');
      input.style.setProperty('outline', 'none', 'important');
      input.style.setProperty('background-color', '#ffffff', 'important');
      input.style.setProperty('font-family', 'inherit', 'important');
      input.style.setProperty('box-sizing', 'border-box', 'important');
      input.style.setProperty('color', '#1f2937', 'important');
      
      // Override any existing classes
      input.className = '';
      
      console.log('ULTIMATE SIGNATURE: Name input force styled');
    }
  }, []);

  console.log('Ultimate Signature initialized');

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: "#ffffff", 
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", 
        borderBottom: "1px solid #e5e7eb",
        padding: "16px 0"
      }}>
        <div style={{ 
          maxWidth: "64rem", 
          margin: "0 auto", 
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <h1 style={{ 
            fontSize: "24px", 
            fontWeight: "700", 
            color: "#111827" 
          }}>
            {t.title}
          </h1>
          <div style={{ 
            fontSize: "16px", 
            color: "#6b7280",
            display: "flex",
            alignItems: "center"
          }}>
            <Calendar style={{ 
              width: "18px", 
              height: "18px", 
              marginRight: "6px",
              display: "inline"
            }} />
            {currentDate}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        maxWidth: "64rem", 
        margin: "0 auto", 
        padding: "40px 24px" 
      }}>
        <div style={{ 
          backgroundColor: "#ffffff", 
          borderRadius: "16px", 
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", 
          border: "1px solid #e5e7eb", 
          padding: "40px" 
        }}>
          <h2 style={{ 
            fontSize: "28px", 
            fontWeight: "700", 
            color: "#1f2937", 
            marginBottom: "32px",
            textAlign: "center"
          }}>
            {t.signatureInstruction}
          </h2>
          
          {/* Name Input - FORCED STYLING */}
          <div style={{ 
            marginBottom: "40px", 
            padding: "24px", 
            backgroundColor: "#f9fafb", 
            borderRadius: "12px",
            border: "2px solid #e5e7eb"
          }}>
            <label style={{ 
              display: "block", 
              fontSize: "18px", 
              fontWeight: "600", 
              color: "#374151",
              marginBottom: "12px",
              textAlign: "center"
            }}>
              {t.printedName}:
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={(e) => {
                const newValue = e.target.value;
                console.log(`Ultimate signature name changed: ${newValue}`);
                setNameValue(newValue);
                (window as any).signatureNameValue = newValue;
                onSignatureNameChange(newValue);
              }}
              placeholder={t.printedName}
              autoComplete="off"
              onFocus={(e) => {
                e.target.style.setProperty('border', '3px solid #10b981', 'important');
              }}
              onBlur={(e) => {
                e.target.style.setProperty('border', '3px solid #3b82f6', 'important');
              }}
            />
          </div>

          {/* Signature Canvas */}
          <div style={{ marginBottom: "40px" }}>
            <SimpleSignatureCanvas 
              onSignatureChange={onSignatureChange} 
              initialSignature={signature}
            />
          </div>
          
          {/* Date Stamp */}
          <div style={{ 
            display: "flex", 
            justifyContent: "center",
            alignItems: "center", 
            fontSize: "16px", 
            color: "#6b7280", 
            marginBottom: "40px",
            padding: "16px",
            backgroundColor: "#f3f4f6",
            borderRadius: "8px"
          }}>
            <Calendar style={{ 
              width: "18px", 
              height: "18px", 
              marginRight: "8px" 
            }} />
            <span>{t.signatureDate}</span>
            <span style={{ 
              fontWeight: "600", 
              marginLeft: "6px" 
            }}>{currentDate}</span>
          </div>
          
          {/* Navigation */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 24px",
                border: "2px solid #d1d5db",
                borderRadius: "10px",
                backgroundColor: "#ffffff",
                color: "#374151",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "500"
              }}
              type="button"
              onClick={() => {
                console.log('🔙 Ultimate Signature Back button clicked');
                onBack();
              }}
            >
              <ArrowLeft style={{ 
                width: "18px", 
                height: "18px", 
                marginRight: "8px" 
              }} />
              {t.back}
            </button>
            
            <Button
              onClick={() => {
                // Sync signature name from local state
                const finalName = nameValue || (window as any).signatureNameValue || '';
                if (finalName) {
                  onSignatureNameChange(finalName);
                }
                
                setTimeout(() => {
                  onComplete();
                }, 100);
              }}
              disabled={!canComplete}
              className="bg-otis-blue hover:bg-blue-700 text-white flex items-center px-12 py-3 text-lg"
            >
              <Check className="h-5 w-5 mr-2" />
              {t.complete}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}