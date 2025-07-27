import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/language-provider";
import { StartScreen } from "@/pages/start-screen";
import Questionnaire from "@/pages/questionnaire";
import { Signature } from "@/pages/signature";
import { Completion } from "@/pages/completion";
import { Admin } from "@/pages/admin";
import { ProtocolPreview } from "@/pages/protocol-preview";
import { FormData } from "@/lib/types";
import { AnswerValue, ProtocolError } from "@shared/schema";
import NotFound from "@/pages/not-found";

function App() {
  const [currentScreen, setCurrentScreen] = useState<'start' | 'questionnaire' | 'signature' | 'completion' | 'admin' | 'protocol-preview'>('start');
  const [language, setLanguage] = useState<'hu' | 'de'>('hu');
  const [formData, setFormData] = useState<FormData>({
    receptionDate: new Date().toISOString().split('T')[0], // Always keep as ISO format for HTML date input
    answers: {},
    errors: [],
    signature: '',
    signatureName: '',
  });
  const formDataRef = useRef(formData);
  
  // Keep ref updated with latest formData
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Disabled auto-save to prevent component re-mounting during manual saves
  // Manual save through the Save button only

  // Load saved form data on initialization
  useEffect(() => {
    const saved = localStorage.getItem('otis-protocol-form-data');
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        setFormData(parsedData);
      } catch (e) {
        console.error('Error loading saved form data:', e);
      }
    }
  }, []);

  const handleLanguageSelect = (selectedLanguage: 'hu' | 'de') => {
    setLanguage(selectedLanguage);
    // Save language to localStorage so LanguageProvider can use it
    localStorage.setItem('otis-protocol-language', selectedLanguage);
    setCurrentScreen('questionnaire');
    // Clear navigation state for new session - reset to page 0
    localStorage.setItem('questionnaire-current-page', '0');
  };

  const handleSaveProgress = useCallback(() => {
    // Manual save to localStorage - use ref to get latest formData without dependency
    try {
      localStorage.setItem('otis-protocol-form-data', JSON.stringify(formDataRef.current));
      console.log('🔧 Progress saved - App.tsx handleSaveProgress (STABLE - no re-render)');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw error; // Re-throw so the save button can show error state
    }
  }, []); // No dependencies = stable reference

  const handleQuestionnaireNext = () => {
    setCurrentScreen('signature');
  };

  const handleSignatureBack = () => {
    setCurrentScreen('questionnaire');
  };

  const handleSignatureComplete = async () => {
    try {
      // Submit the protocol data to backend
      const response = await fetch('/api/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          language,
          completed: true,
        }),
      });

      if (response.ok) {
        setCurrentScreen('completion');
        // Clear saved data after successful completion
        localStorage.removeItem('otis-protocol-form-data');
      } else {
        throw new Error('Failed to save protocol');
      }
    } catch (error) {
      console.error('Error completing protocol:', error);
      // Handle error (show toast, etc.)
    }
  };

  const handleEmailPDF = async () => {
    try {
      const response = await fetch('/api/protocols/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, language }),
      });
      
      if (response.ok) {
        console.log('PDF emailed successfully');
      }
    } catch (error) {
      console.error('Error emailing PDF:', error);
    }
  };

  const handleSaveToCloud = async () => {
    try {
      const response = await fetch('/api/protocols/cloud-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, language }),
      });
      
      if (response.ok) {
        console.log('Saved to cloud successfully');
      }
    } catch (error) {
      console.error('Error saving to cloud:', error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('/api/protocols/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, language }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'acceptance-protocol.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const response = await fetch('/api/protocols/download-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, language }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'acceptance-protocol.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading Excel:', error);
    }
  };

  const handleViewProtocol = () => {
    setCurrentScreen('protocol-preview');
  };

  const handleStartNew = () => {
    setFormData({
      receptionDate: new Date().toISOString().split('T')[0],
      answers: {},
      errors: [],
      signature: '',
      signatureName: '',
    });
    setCurrentScreen('start');
    localStorage.removeItem('otis-protocol-form-data');
  };

  const handleGoHome = () => {
    setCurrentScreen('start');
  };

  const handleSettings = () => {
    setCurrentScreen('admin');
  };

  // Stable callbacks defined outside Router to prevent recreation
  const handleAnswerChange = useCallback((questionId: string, value: AnswerValue) => {
    setFormData(prev => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value }
    }));
  }, []);

  const handleReceptionDateChange = useCallback((date: string) => {
    setFormData(prev => ({ ...prev, receptionDate: date }));
  }, []);

  const handleErrorsChange = useCallback((errors: ProtocolError[]) => {
    setFormData(prev => ({ ...prev, errors }));
  }, []);

  const handleAdminAccess = useCallback(() => setCurrentScreen('admin'), []);
  const handleHome = useCallback(() => setCurrentScreen('start'), []);

  // Store questionnaire instance to prevent re-creation using useRef
  const persistentQuestionnaireRef = useRef<JSX.Element | null>(null);

  function Router() {
    return (
      <Switch>
        <Route path="/" component={() => {
          console.log('🏠 Route component function called - currentScreen:', currentScreen);
          
          // Create questionnaire only once and reuse it
          if (currentScreen === 'questionnaire') {
            if (!persistentQuestionnaireRef.current) {
              console.log('🆕 Creating TRULY persistent questionnaire instance with useRef');
              persistentQuestionnaireRef.current = (
                <Questionnaire
                  key="truly-persistent-questionnaire"
                  receptionDate={formData.receptionDate}
                  onReceptionDateChange={handleReceptionDateChange}
                  answers={formData.answers}
                  onAnswerChange={handleAnswerChange}
                  errors={formData.errors}
                  onErrorsChange={handleErrorsChange}
                  onNext={handleQuestionnaireNext}
                  onSave={handleSaveProgress}
                  language={language}
                  onAdminAccess={handleAdminAccess}
                  onHome={handleHome}
                />
              );
            } else {
              console.log('♻️ Reusing existing questionnaire instance - NO re-mount!');
            }
            return persistentQuestionnaireRef.current;
          }
          
          switch (currentScreen) {
            case 'start':
              return <StartScreen onLanguageSelect={handleLanguageSelect} />;
            case 'signature':
              return (
                <Signature
                  signature={formData.signature || ''}
                  onSignatureChange={(signature) => setFormData(prev => ({ ...prev, signature }))}
                  signatureName={formData.signatureName || ''}
                  onSignatureNameChange={(signatureName) => setFormData(prev => ({ ...prev, signatureName }))}
                  onBack={handleSignatureBack}
                  onComplete={handleSignatureComplete}
                />
              );
            case 'completion':
              return (
                <Completion
                  onEmailPDF={handleEmailPDF}
                  onSaveToCloud={handleSaveToCloud}
                  onDownloadPDF={handleDownloadPDF}
                  onDownloadExcel={handleDownloadExcel}
                  onViewProtocol={handleViewProtocol}
                  onStartNew={handleStartNew}
                  onGoHome={handleGoHome}
                  onSettings={handleSettings}
                />
              );
            case 'admin':
              return <Admin onBack={() => setCurrentScreen('questionnaire')} onHome={() => setCurrentScreen('start')} />;
            case 'protocol-preview':
              return <ProtocolPreview onBack={() => setCurrentScreen('completion')} />;
            default:
              return <StartScreen onLanguageSelect={handleLanguageSelect} />;
          }
        }} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
