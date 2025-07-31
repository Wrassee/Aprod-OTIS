import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SimpleSignatureCanvas } from '@/components/simple-signature-canvas';
import { useLanguageContext } from '@/components/language-provider';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Check, Calendar } from 'lucide-react';

interface SignaturePageProps {
  signature: string;
  signatureName: string;
  onSignatureChange: (signature: string) => void;
  onSignatureNameChange: (name: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

export default function SignaturePage({
  signature,
  signatureName,
  onSignatureChange,
  onSignatureNameChange,
  onBack,
  onComplete
}: SignaturePageProps) {
  const { language, t } = useLanguageContext();
  const currentDate = formatDate(new Date(), language);

  const canComplete = true;

  // Completely isolated name state
  const [nameValue, setNameValue] = useState(signatureName || '');

  useEffect(() => {
    setNameValue(signatureName || '');
  }, [signatureName]);

  console.log('Signature initialized');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              {t.title}
            </h1>
            <div className="text-sm text-gray-600">
              <Calendar className="inline h-4 w-4 mr-1" />
              {currentDate}
            </div>
          </div>
        </div>
      </header>

      {/* Signature Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            {t.signatureInstruction}
          </h2>
          
          {/* Name Input - Completely Isolated */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ 
              display: "block", 
              fontSize: "14px", 
              fontWeight: "500", 
              color: "#374151", 
              marginBottom: "8px" 
            }}>
              {t.printedName}:
            </label>
            <input
              type="text"
              value={nameValue}
              onChange={(e) => {
                const newValue = e.target.value;
                console.log(`Name input changed: ${newValue}`);
                setNameValue(newValue);
                (window as any).signatureNameValue = newValue;
                onSignatureNameChange(newValue);
              }}
              placeholder={t.printedName}
              style={{
                width: "100%",
                height: "48px",
                padding: "0 16px",
                fontSize: "18px",
                border: "2px solid #d1d5db",
                borderRadius: "8px",
                outline: "none",
                backgroundColor: "#ffffff",
                fontFamily: "inherit"
              }}
              autoComplete="off"
              onFocus={(e) => {
                e.target.style.border = "2px solid #3b82f6";
              }}
              onBlur={(e) => {
                e.target.style.border = "2px solid #d1d5db";
              }}
            />
          </div>

          {/* Signature Canvas */}
          <div style={{ marginBottom: "24px" }}>
            <SimpleSignatureCanvas 
              onSignatureChange={onSignatureChange} 
              initialSignature={signature}
            />
          </div>
          
          {/* Date Stamp */}
          <div className="flex items-center text-sm text-gray-600 mb-8">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{t.signatureDate}</span>
            <span className="font-medium">{currentDate}</span>
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between">
            <button
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors"
              type="button"
              onClick={() => {
                console.log('🔙 Signature Back button clicked - direct call');
                onBack();
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
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