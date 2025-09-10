import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SimpleSignatureCanvas } from '@/components/simple-signature-canvas';
import { MegaStableInput } from '@/components/mega-stable-input';
import { useLanguageContext } from '@/components/language-provider';
import { formatDate } from '@/lib/utils';
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
  const { t, language } = useLanguageContext();
  const currentDate = formatDate(new Date(), language);
  const inputRef = useRef<HTMLInputElement>(null);

  const canComplete = true; // Allow completion with or without signature, printed name allowed independently

  // Stable input handling - prevent cursor jumping
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // Set initial value only if empty
    if (!input.value) {
      input.value = signatureName || '';
    }

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const newValue = target.value;
      console.log(`Signature name typing: ${newValue}`);
      
      // Store globally without triggering React updates
      (window as any).signatureNameValue = newValue;
      
      // Debounced update to prevent cursor jumping
      clearTimeout((window as any).signatureNameTimeout);
      (window as any).signatureNameTimeout = setTimeout(() => {
        onSignatureNameChange(newValue);
      }, 500);
    };

    // Only use input event to prevent focus loss
    input.addEventListener('input', handleInput);
    
    return () => {
      input.removeEventListener('input', handleInput);
      clearTimeout((window as any).signatureNameTimeout);
    };
  }, []); // Only run once on mount

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
              {t.printedName}:
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder={t.printedName}
                className="w-full h-12 px-4 text-lg border-2 border-gray-300 rounded-lg focus:border-otis-blue focus:outline-none bg-white"
                autoComplete="off"
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
              onClick={(e) => {
                console.log('🔘 Protocol completion button clicked');
                
                // Prevent default behavior and stop propagation
                e.preventDefault();
                e.stopPropagation();
                
                // Sync signature name from global storage before completing
                const signatureName = (window as any).signatureNameValue || '';
                if (signatureName) {
                  console.log('📝 Syncing signature name:', signatureName);
                  onSignatureNameChange(signatureName);
                }
                
                // Small delay to ensure state updates
                setTimeout(() => {
                  console.log('⏰ Calling onComplete after sync delay');
                  onComplete();
                }, 100);
              }}
              disabled={!canComplete}
              className="bg-otis-blue hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white flex items-center px-8"
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
