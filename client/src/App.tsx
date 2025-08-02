import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// Removed Wouter routing to prevent re-mounting issues with focus stability
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/language-provider";
// Temporarily disabled PWA components for stability
// import { PWAInstallBanner, OfflineIndicator } from "@/components/pwa-install-banner";
import { StartScreen } from "@/pages/start-screen";
import Questionnaire from "@/pages/questionnaire";
import { NiedervoltMeasurements } from "@/pages/niedervolt-measurements";
import { Signature } from "@/pages/signature";
import { Completion } from "@/pages/completion";
import { Admin } from "@/pages/admin";
import { ProtocolPreview } from "@/pages/protocol-preview";
import { FormData, MeasurementRow } from "@/lib/types";
import { AnswerValue, ProtocolError } from "@shared/schema";
import NotFound from "@/pages/not-found";

function App() {
  const [currentScreen, setCurrentScreen] = useState<'start' | 'questionnaire' | 'niedervolt' | 'signature' | 'completion' | 'admin' | 'protocol-preview'>('start');
  const [language, setLanguage] = useState<'hu' | 'de'>('hu');
  const [formData, setFormData] = useState<FormData>({
    receptionDate: new Date().toISOString().split('T')[0], // Always keep as ISO format for HTML date input
    answers: {},
    errors: [],
    signature: '',
    signatureName: '',
    niedervoltMeasurements: [],
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
        // If no receptionDate is saved or it's empty, use today's date
        if (!parsedData.receptionDate || parsedData.receptionDate === '') {
          parsedData.receptionDate = new Date().toISOString().split('T')[0];
        }
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
    
    // Clear error list when starting new protocol
    localStorage.removeItem('protocol-errors');
    window.dispatchEvent(new CustomEvent('protocol-errors-cleared'));
    
    // Force LanguageProvider to update by triggering a manual check
    window.dispatchEvent(new Event('storage'));
  };

  const handleSaveProgress = useCallback(() => {
    console.log('🔧 ISOLATED save - no form data access');
    // Do absolutely nothing that could trigger re-renders
    // Save functionality is handled directly in questionnaire component
  }, []);

  const handleQuestionnaireNext = () => {
    setCurrentScreen('niedervolt');
  };

  const handleNiedervoltBack = () => {
    console.log('🔙 Niedervolt Back button clicked - returning to questionnaire');
    
    // Restore questionnaire page to the last page
    const lastPage = localStorage.getItem('questionnaire-current-page');
    if (lastPage) {
      console.log('🔙 Restoring questionnaire page:', lastPage);
    }
    
    setCurrentScreen('questionnaire');
  };

  const handleNiedervoltNext = () => {
    setCurrentScreen('signature');
  };

  const handleSignatureBack = () => {
    console.log('🔙 Signature Back button clicked - returning to niedervolt');
    setCurrentScreen('niedervolt');
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
      console.log('Starting Excel download...');
      
      // Sync all cached values before sending data
      const cachedRadioValues = (window as any).radioCache?.getAll?.() || {};
      const cachedTrueFalseValues = (window as any).trueFalseCache || new Map();
      const cachedInputValues = (window as any).stableInputValues || {};
      const cachedMeasurementValues = (window as any).measurementCache?.getAll?.() || {};
      const cachedCalculatedValues = (window as any).calculatedCache?.getAll?.() || {};
      
      // Convert Map to object if needed
      const trueFalseAnswers: Record<string, string> = {};
      if (cachedTrueFalseValues instanceof Map) {
        cachedTrueFalseValues.forEach((value, key) => {
          trueFalseAnswers[key] = value;
        });
      } else {
        Object.assign(trueFalseAnswers, cachedTrueFalseValues);
      }
      
      // Combine all answers including measurements
      const combinedAnswers = {
        ...formData.answers,
        ...cachedRadioValues,
        ...trueFalseAnswers,
        ...cachedInputValues,
        ...cachedMeasurementValues,
        ...cachedCalculatedValues,
      };
      
      const fullFormData = {
        ...formData,
        answers: combinedAnswers,
      };
      
      console.log('Sending Excel generation request with', Object.keys(combinedAnswers).length, 'answers');
      
      const response = await fetch('/api/protocols/download-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: fullFormData, language }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Excel generation failed:', response.status, errorText);
        throw new Error(`Excel generation failed: ${response.status} - ${errorText}`);
      }
      
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Generated Excel file is empty');
      }
      
      // Get Otis Lift ID from all sources (cache + formData)
      const otisLiftId = cachedInputValues['7'] || formData.answers['7'] || 'Unknown';
      const filename = `AP_${otisLiftId}.xlsx`;
      
      console.log('Excel download filename:', filename);
      console.log('Excel file size:', blob.size, 'bytes');
      
      // More robust download approach using different methods
      try {
        // Method 1: Try modern download API
        if ('showSaveFilePicker' in window) {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Excel files',
              accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
            }]
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log('Excel download completed successfully (File API)');
          return;
        }
      } catch (fileApiError) {
        console.log('File API not available, falling back to blob URL');
      }
      
      // Method 2: Traditional blob URL approach with better error handling
      let url: string | null = null;
      let a: HTMLAnchorElement | null = null;
      
      try {
        url = URL.createObjectURL(blob);
        a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        // Add to DOM, click, and immediately remove
        document.body.appendChild(a);
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          if (a) {
            a.click();
            console.log('Excel download completed successfully (Blob URL)');
          }
        }, 10);
        
      } catch (downloadError) {
        console.error('Error during blob download:', downloadError);
        
        // Method 3: Fallback - direct blob download
        try {
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          console.log('Excel download completed successfully (Window open)');
        } catch (fallbackError) {
          console.error('All download methods failed:', fallbackError);
          throw new Error('Excel letöltés sikertelen. Kérjük próbálja újra.');
        }
      }
      
      // Clean up - delayed to ensure download completes
      setTimeout(() => {
        try {
          if (url) {
            URL.revokeObjectURL(url);
          }
          if (a && document.body && document.body.contains(a)) {
            document.body.removeChild(a);
          }
        } catch (cleanupError) {
          // Silent cleanup - not critical
          console.warn('Cleanup warning:', cleanupError);
        }
      }, 2000);
      
      console.log('Excel download completed successfully');
      
    } catch (error) {
      console.error('Error downloading Excel:', error);
      
      // Detailed error logging for debugging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // User-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Excel letöltési hiba: ${errorMessage}\n\nKérjük, próbálja újra vagy lépjen kapcsolatba a támogatással.`);
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
      niedervoltMeasurements: [],
    });
    setCurrentScreen('start');
    // Clear all localStorage data for new protocol
    localStorage.removeItem('otis-protocol-form-data');
    localStorage.removeItem('protocol-errors');
    
    // Trigger event to notify error list component of the clear
    window.dispatchEvent(new CustomEvent('protocol-errors-cleared'));
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

  // Memoized measurement change handler to prevent re-renders
  const handleMeasurementsChange = useCallback((measurements: MeasurementRow[]) => {
    setFormData(prev => ({ ...prev, niedervoltMeasurements: measurements }));
  }, []);

  // Conditional render without Wouter to prevent re-mounting
  const renderCurrentScreen = () => {
    console.log('🏠 Route component function called - currentScreen:', currentScreen);
    
    switch (currentScreen) {
      case 'start':
        return <StartScreen onLanguageSelect={handleLanguageSelect} />;
      case 'questionnaire':
        return (
          <Questionnaire
            key="stable-questionnaire"
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
            onStartNew={handleStartNew}
          />
        );
      case 'niedervolt':
        return (
          <NiedervoltMeasurements
            key="stable-niedervolt"
            measurements={formData.niedervoltMeasurements || []}
            onMeasurementsChange={handleMeasurementsChange}
            onBack={handleNiedervoltBack}
            onNext={handleNiedervoltNext}
            receptionDate={formData.receptionDate}
            onReceptionDateChange={handleReceptionDateChange}
            onAdminAccess={handleAdminAccess}
            onHome={handleGoHome}
            onStartNew={handleStartNew}
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
            onDownloadExcel={handleDownloadExcel}
            onViewProtocol={handleViewProtocol}
            onStartNew={handleStartNew}
            onGoHome={handleGoHome}
            onSettings={handleSettings}
            errors={formData.errors}
            protocolData={{
              buildingAddress: formData.answers['1'] as string || '',
              liftId: formData.answers['7'] as string || '',
              inspectorName: formData.answers['4'] as string || '',
              inspectionDate: formData.receptionDate
            }}
          />
        );
      case 'admin':
        return <Admin onBack={() => setCurrentScreen('questionnaire')} onHome={() => setCurrentScreen('start')} />;
      case 'protocol-preview':
        return <ProtocolPreview onBack={() => setCurrentScreen('completion')} />;
      default:
        return <StartScreen onLanguageSelect={handleLanguageSelect} />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          {/* PWA components temporarily disabled for stability */}
          {renderCurrentScreen()}
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
