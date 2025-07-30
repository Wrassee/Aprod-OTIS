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
    console.log('🌍 App.tsx - Language selected:', selectedLanguage);
    setLanguage(selectedLanguage);
    // Save language to localStorage so LanguageProvider can use it
    localStorage.setItem('otis-protocol-language', selectedLanguage);
    console.log('🌍 App.tsx - Language saved to localStorage:', localStorage.getItem('otis-protocol-language'));
    setCurrentScreen('questionnaire');
    // Clear navigation state for new session - reset to page 0
    localStorage.setItem('questionnaire-current-page', '0');
    
    // Force LanguageProvider to update by triggering a manual check
    window.dispatchEvent(new Event('storage'));
  };

  const handleSaveProgress = useCallback(() => {
    console.log('🔧 ISOLATED save - no form data access');
    // Do absolutely nothing that could trigger re-renders
    // Save functionality is handled directly in questionnaire component
  }, []);

  const handleQuestionnaireNext = () => {
    setCurrentScreen('signature');
  };

  const handleSignatureBack = () => {
    console.log('🔙 Signature Back button clicked - returning to questionnaire');
    
    // Restore questionnaire page to the last page
    const lastPage = localStorage.getItem('questionnaire-current-page');
    if (lastPage) {
      console.log('🔙 Restoring questionnaire page:', lastPage);
    }
    
    setCurrentScreen('questionnaire');
  };

  const handleSignatureComplete = async () => {
    try {
      // Sync all cached values before creating protocol
      const cachedRadioValues = (window as any).radioCache?.getAll?.() || {};
      const cachedTrueFalseValues = (window as any).trueFalseCache || new Map();
      const cachedInputValues = (window as any).stableInputValues || {};
      
      // Convert Map to object if needed
      const trueFalseAnswers: Record<string, string> = {};
      if (cachedTrueFalseValues instanceof Map) {
        cachedTrueFalseValues.forEach((value, key) => {
          trueFalseAnswers[key] = value;
        });
      } else {
        Object.assign(trueFalseAnswers, cachedTrueFalseValues);
      }
      
      // Combine all answers
      const combinedAnswers = {
        ...formData.answers,
        ...cachedRadioValues,
        ...trueFalseAnswers,
        ...cachedInputValues,
      };
      
      // Ensure we have a valid receptionDate
      const receptionDate = formData.receptionDate || new Date().toISOString().split('T')[0];
      
      const protocolData = {
        receptionDate,
        language,
        answers: combinedAnswers,
        errors: formData.errors || [],
        signature: formData.signature || '',
        signatureName: formData.signatureName || '',
        completed: true,
      };
      
      console.log('Creating protocol with data:', protocolData);
      console.log('Combined answers count:', Object.keys(combinedAnswers).length);
      console.log('Reception date:', receptionDate);
      
      // Submit the protocol data to backend
      const response = await fetch('/api/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(protocolData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Protocol created successfully:', result);
        setCurrentScreen('completion');
        // Clear saved data after successful completion
        localStorage.removeItem('otis-protocol-form-data');
      } else {
        const errorText = await response.text();
        console.error('Protocol creation failed:', errorText);
        throw new Error(`Failed to save protocol: ${errorText}`);
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
        
        // Get Otis Lift ID from all sources (cache + formData)
        const cachedInputValues = (window as any).stableInputValues || {};
        const otisLiftId = cachedInputValues['7'] || formData.answers['7'] || 'Unknown';
        a.download = `AP_${otisLiftId}.pdf`;
        
        console.log('PDF download filename:', `AP_${otisLiftId}.pdf`);
        
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
        
        // Get Otis Lift ID from all sources (cache + formData)
        const cachedInputValues = (window as any).stableInputValues || {};
        const otisLiftId = cachedInputValues['7'] || formData.answers['7'] || 'Unknown';
        a.download = `AP_${otisLiftId}.xlsx`;
        
        console.log('Excel download filename:', `AP_${otisLiftId}.xlsx`);
        
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

  function Router() {
    return (
      <Switch>
        <Route path="/" component={() => {
          console.log('🏠 Route component function called - currentScreen:', currentScreen);
          
          if (currentScreen === 'questionnaire') {
            return (
              <Questionnaire
                key="stable-questionnaire-key"
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
