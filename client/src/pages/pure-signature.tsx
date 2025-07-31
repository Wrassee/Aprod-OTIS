import { useState, useEffect, useRef } from 'react';
import { SimpleSignatureCanvas } from '@/components/simple-signature-canvas';
import { useLanguageContext } from '@/components/language-provider';
import { formatDate } from '@/lib/utils';

interface PureSignatureProps {
  signature: string;
  signatureName: string;
  onSignatureChange: (signature: string) => void;
  onSignatureNameChange: (name: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

export default function PureSignature({
  signature,
  signatureName,
  onSignatureChange,
  onSignatureNameChange,
  onBack,
  onComplete
}: PureSignatureProps) {
  const { language, t } = useLanguageContext();
  const currentDate = formatDate(new Date(), language);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const canComplete = true;

  // Completely isolated name state
  const [nameValue, setNameValue] = useState(signatureName || '');

  useEffect(() => {
    setNameValue(signatureName || '');
  }, [signatureName]);

  // EXTREME DOM FORCE for name input - raw HTML attribute styling
  useEffect(() => {
    if (nameInputRef.current) {
      const input = nameInputRef.current;
      
      // Clear all classes
      input.className = '';
      input.removeAttribute('class');
      
      // Apply raw inline styles with maximum priority
      const styles = `
        width: 100% !important;
        height: 80px !important;
        font-size: 24px !important;
        padding: 0 30px !important;
        border: 4px solid #3b82f6 !important;
        border-radius: 12px !important;
        outline: none !important;
        background-color: #ffffff !important;
        font-family: Arial, sans-serif !important;
        box-sizing: border-box !important;
        color: #1f2937 !important;
        font-weight: 600 !important;
        display: block !important;
      `;
      
      input.setAttribute('style', styles);
      
      console.log('PURE SIGNATURE: Name input force styled with raw HTML');
    }
  }, []);

  console.log('Pure Signature initialized');

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f3f4f6"
    }}>
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
            📅 {currentDate}
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
            fontSize: "32px",
            fontWeight: "700",
            color: "#1f2937",
            marginBottom: "40px",
            textAlign: "center"
          }}>
            {t.signatureInstruction}
          </h2>
          
          {/* Name Input - PURE HTML STYLING */}
          <div style={{
            marginBottom: "50px",
            padding: "30px",
            backgroundColor: "#f9fafb",
            borderRadius: "16px",
            border: "3px solid #e5e7eb"
          }}>
            <label style={{
              display: "block",
              fontSize: "22px",
              fontWeight: "700",
              color: "#374151",
              marginBottom: "20px",
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
                console.log(`Pure signature name changed: ${newValue}`);
                setNameValue(newValue);
                (window as any).signatureNameValue = newValue;
                onSignatureNameChange(newValue);
              }}
              placeholder={t.printedName}
              autoComplete="off"
              onFocus={(e) => {
                const currentStyle = e.target.getAttribute('style') || '';
                const newStyle = currentStyle.replace(/border:\s*[^;]+;/, 'border: 4px solid #10b981 !important;');
                e.target.setAttribute('style', newStyle);
              }}
              onBlur={(e) => {
                const currentStyle = e.target.getAttribute('style') || '';
                const newStyle = currentStyle.replace(/border:\s*[^;]+;/, 'border: 4px solid #3b82f6 !important;');
                e.target.setAttribute('style', newStyle);
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
            fontSize: "18px",
            color: "#6b7280",
            marginBottom: "50px",
            padding: "20px",
            backgroundColor: "#f3f4f6",
            borderRadius: "12px"
          }}>
            📅 <span style={{ marginLeft: "8px" }}>{t.signatureDate}</span>
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
                padding: "16px 32px",
                border: "3px solid #d1d5db",
                borderRadius: "12px",
                backgroundColor: "#ffffff",
                color: "#374151",
                cursor: "pointer",
                fontSize: "20px",
                fontWeight: "600"
              }}
              type="button"
              onClick={() => {
                console.log('🔙 Pure Signature Back button clicked');
                onBack();
              }}
            >
              ← {t.back}
            </button>
            
            <button
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
              style={{
                display: "flex",
                alignItems: "center",
                padding: "16px 48px",
                border: "none",
                borderRadius: "12px",
                backgroundColor: canComplete ? "#1d4ed8" : "#9ca3af",
                color: "#ffffff",
                cursor: canComplete ? "pointer" : "not-allowed",
                fontSize: "20px",
                fontWeight: "600"
              }}
            >
              ✓ {t.complete}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}