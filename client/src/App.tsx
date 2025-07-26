import { useState, useEffect } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/language-provider";
import { StartScreen } from "@/pages/start-screen";
import { Questionnaire } from "@/pages/questionnaire";
import { Signature } from "@/pages/signature";
import { Completion } from "@/pages/completion";
import { Admin } from "@/pages/admin";
import { FormData } from "@/lib/types";
import NotFound from "@/pages/not-found";

function App() {
  const [currentScreen, setCurrentScreen] = useState<'start' | 'questionnaire' | 'signature' | 'completion' | 'admin'>('start');
  const [language, setLanguage] = useState<'hu' | 'de'>('hu');
  const [formData, setFormData] = useState<FormData>({
    receptionDate: new Date().toISOString().split('T')[0],
    answers: {},
    errors: [],
    signature: '',
    signatureName: '',
  });

  // Auto-save form data to localStorage with debouncing - only save on real changes
  useEffect(() => {
    if (currentScreen === 'start') return;
    
    const timeoutId = setTimeout(() => {
      try {
        const currentSaved = localStorage.getItem('otis-protocol-form-data');
        const newData = JSON.stringify(formData);
        
        // Only save if data actually changed
        if (currentSaved !== newData) {
          localStorage.setItem('otis-protocol-form-data', newData);
          console.log('Form data saved to localStorage');
        }
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }, 3000); // Further increased to 3 seconds

    return () => clearTimeout(timeoutId);
  }, [formData, currentScreen]);

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
    setCurrentScreen('questionnaire');
    // Clear navigation state for new session
    localStorage.removeItem('questionnaire-current-page');
  };

  const handleSaveProgress = () => {
    // Form data is already auto-saved to localStorage
    console.log('Progress saved');
  };

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

  const handleViewProtocol = () => {
    // Open PDF in new tab for preview
    window.open('/api/protocols/preview', '_blank');
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

  function Router() {
    return (
      <Switch>
        <Route path="/" component={() => {
          switch (currentScreen) {
            case 'start':
              return <StartScreen onLanguageSelect={handleLanguageSelect} />;
            case 'questionnaire':
              return (
                <Questionnaire
                  receptionDate={formData.receptionDate}
                  onReceptionDateChange={(date) => setFormData(prev => ({ ...prev, receptionDate: date }))}
                  answers={formData.answers}
                  onAnswerChange={(questionId, value) => 
                    setFormData(prev => ({
                      ...prev,
                      answers: { ...prev.answers, [questionId]: value }
                    }))
                  }
                  errors={formData.errors}
                  onErrorsChange={(errors) => setFormData(prev => ({ ...prev, errors }))}
                  onNext={handleQuestionnaireNext}
                  onSave={handleSaveProgress}
                  language={language}
                  onAdminAccess={() => setCurrentScreen('admin')}
                  onHome={() => setCurrentScreen('start')}
                />
              );
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
                  onViewProtocol={handleViewProtocol}
                  onStartNew={handleStartNew}
                />
              );
            case 'admin':
              return <Admin onBack={() => setCurrentScreen('questionnaire')} onHome={() => setCurrentScreen('start')} />;
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
