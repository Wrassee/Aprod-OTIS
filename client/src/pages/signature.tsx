import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SimpleSignatureCanvas } from '@/components/simple-signature-canvas';
import { MegaStableInput } from '@/components/mega-stable-input';
import { useLanguageContext } from '@/components/language-provider';
import { ArrowLeft, Check, Calendar } from 'lucide-react';

interface SignatureProps {
  signature: string;
  onSignatureChange: (signature: string) => void;
  signatureName: string;
  onSignatureNameChange: (name: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function Signature({
  signature,
  onSignatureChange,
  signatureName,
  onSignatureNameChange,
  onBack,
  onComplete,
}: SignatureProps) {
  const { t } = useLanguageContext();
  const currentDate = new Date().toLocaleDateString();
  const inputRef = useRef<HTMLInputElement>(null);

  const canComplete = signature.length > 0;

  // Setup direct DOM event listener to bypass React - only run once
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // Only set initial value on first mount
    if (!input.hasAttribute('data-initialized')) {
      input.value = signatureName || '';
      input.setAttribute('data-initialized', 'true');
    }

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const newValue = target.value;
      console.log(`Signature name typing: ${newValue}`);
      
      // Store globally without React updates
      (window as any).signatureNameValue = newValue;
      
      // Debounced parent callback
      clearTimeout((window as any).signatureNameTimeout);
      (window as any).signatureNameTimeout = setTimeout(() => {
        onSignatureNameChange(newValue);
      }, 1000);
    };

    // Add native DOM event listener
    input.addEventListener('input', handleInput);
    
    return () => {
      input.removeEventListener('input', handleInput);
    };
  }, []); // Empty deps array - only run once

  return (
    <div className="min-h-screen bg-light-surface">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <div className="h-8 w-12 bg-otis-blue rounded flex items-center justify-center mr-4">
              <span className="text-white font-bold text-sm">OTIS</span>
            </div>
            <span className="text-lg font-medium text-gray-800">{t.signatureTitle}</span>
          </div>
        </div>
      </header>

      {/* Signature Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            {t.signatureInstruction}
          </h2>
          
          {/* Signature Canvas */}
          <div className="mb-6">
            <SimpleSignatureCanvas 
              onSignatureChange={onSignatureChange} 
              initialSignature={signature}
            />
          </div>
          
          {/* Optional Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nyomtatott név (opcionális):
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Teljes név"
                key="signature-name-stable"
                className="w-full h-12 px-4 text-lg border-2 border-gray-300 rounded-lg focus:border-otis-blue focus:outline-none bg-white"
                style={{ 
                  fontSize: '18px',
                  minHeight: '48px'
                }}
              />
            </div>
          </div>
          
          {/* Date Stamp */}
          <div className="flex items-center text-sm text-gray-600 mb-8">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{t.signatureDate}</span>
            <span className="font-medium">{currentDate}</span>
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            
            <Button
              onClick={() => {
                // Sync signature name from global storage before completing
                const signatureName = (window as any).signatureNameValue || '';
                if (signatureName) {
                  onSignatureNameChange(signatureName);
                }
                
                // Small delay to ensure state updates
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
