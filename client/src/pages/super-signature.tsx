import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SimpleSignatureCanvas } from '@/components/simple-signature-canvas';
import { useLanguageContext } from '@/components/language-provider';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Check, Calendar } from 'lucide-react';

interface SuperSignatureProps {
  signature: string;
  signatureName: string;
  onSignatureChange: (signature: string) => void;
  onSignatureNameChange: (name: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

export default function SuperSignature({
  signature,
  signatureName,
  onSignatureChange,
  onSignatureNameChange,
  onBack,
  onComplete
}: SuperSignatureProps) {
  const { language, t } = useLanguageContext();
  const currentDate = formatDate(new Date(), language);

  const canComplete = true;

  // Completely isolated name state
  const [nameValue, setNameValue] = useState(signatureName || '');

  useEffect(() => {
    setNameValue(signatureName || '');
  }, [signatureName]);

  console.log('Super Signature initialized');

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: "#ffffff", 
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", 
        borderBottom: "1px solid #e5e7eb" 
      }}>
        <div style={{ 
          maxWidth: "64rem", 
          margin: "0 auto", 
          padding: "0 24px", 
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <h1 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            color: "#111827" 
          }}>
            {t.title}
          </h1>
          <div style={{ 
            fontSize: "14px", 
            color: "#6b7280",
            display: "flex",
            alignItems: "center"
          }}>
            <Calendar style={{ 
              width: "16px", 
              height: "16px", 
              marginRight: "4px",
              display: "inline"
            }} />
            {currentDate}
          </div>
        </div>
      </header>

      {/* Signature Content */}
      <main style={{ 
        maxWidth: "64rem", 
        margin: "0 auto", 
        padding: "32px 24px" 
      }}>
        <div style={{ 
          backgroundColor: "#ffffff", 
          borderRadius: "12px", 
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", 
          border: "1px solid #e5e7eb", 
          padding: "32px" 
        }}>
          <h2 style={{ 
            fontSize: "24px", 
            fontWeight: "600", 
            color: "#374151", 
            marginBottom: "24px" 
          }}>
            {t.signatureInstruction}
          </h2>
          
          {/* Name Input - TABLE LAYOUT FOR GUARANTEED WIDTH */}
          <table style={{ width: "100%", marginBottom: "32px" }}>
            <tbody>
              <tr>
                <td style={{ 
                  verticalAlign: "middle", 
                  paddingRight: "20px",
                  width: "200px"
                }}>
                  <label style={{ 
                    display: "block", 
                    fontSize: "16px", 
                    fontWeight: "500", 
                    color: "#374151"
                  }}>
                    {t.printedName}:
                  </label>
                </td>
                <td>
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      console.log(`Super signature name changed: ${newValue}`);
                      setNameValue(newValue);
                      (window as any).signatureNameValue = newValue;
                      onSignatureNameChange(newValue);
                    }}
                    placeholder={t.printedName}
                    style={{
                      width: "100%",
                      height: "56px",
                      padding: "0 20px",
                      fontSize: "18px",
                      border: "2px solid #d1d5db",
                      borderRadius: "8px",
                      outline: "none",
                      backgroundColor: "#ffffff",
                      fontFamily: "inherit",
                      boxSizing: "border-box"
                    }}
                    autoComplete="off"
                    onFocus={(e) => {
                      e.target.style.border = "2px solid #3b82f6";
                    }}
                    onBlur={(e) => {
                      e.target.style.border = "2px solid #d1d5db";
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature Canvas */}
          <div style={{ marginBottom: "32px" }}>
            <SimpleSignatureCanvas 
              onSignatureChange={onSignatureChange} 
              initialSignature={signature}
            />
          </div>
          
          {/* Date Stamp */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            fontSize: "14px", 
            color: "#6b7280", 
            marginBottom: "32px" 
          }}>
            <Calendar style={{ 
              width: "16px", 
              height: "16px", 
              marginRight: "8px" 
            }} />
            <span>{t.signatureDate}</span>
            <span style={{ 
              fontWeight: "500", 
              marginLeft: "4px" 
            }}>{currentDate}</span>
          </div>
          
          {/* Navigation */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between" 
          }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                color: "#374151",
                cursor: "pointer",
                fontSize: "16px"
              }}
              type="button"
              onClick={() => {
                console.log('🔙 Super Signature Back button clicked');
                onBack();
              }}
            >
              <ArrowLeft style={{ 
                width: "16px", 
                height: "16px", 
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
              className="bg-otis-blue hover:bg-blue-700 text-white flex items-center px-8"
            >
              <Check className="h-4 w-4 mr-2" />
              {t.complete}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}