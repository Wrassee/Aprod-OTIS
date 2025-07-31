import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Question, AnswerValue, ProtocolError } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { IsolatedQuestion } from '@/components/isolated-question';
import { TrueFalseGroup } from '@/components/true-false-group';
import { ErrorList } from '@/components/error-list';
import { QuestionGroupHeader } from '@/components/question-group-header';
import { useLanguageContext } from '@/components/language-provider';
import { ArrowLeft, ArrowRight, Save, Settings, Home, Check, X, RotateCcw } from 'lucide-react';
import { getAllCachedValues } from '@/components/cache-radio';
import { getAllTrueFalseValues } from '@/components/true-false-radio';
import { getAllStableInputValues } from '@/components/stable-input';
import { getAllMeasurementValues } from '@/components/measurement-question';
import { CalculatedResult } from '@/components/calculated-result';
import { MeasurementBlock, getAllCalculatedValues } from '@/components/measurement-block';

interface QuestionnaireProps {
  receptionDate: string;
  onReceptionDateChange: (date: string) => void;
  answers: Record<string, AnswerValue>;
  onAnswerChange: (questionId: string, value: AnswerValue) => void;
  errors: ProtocolError[];
  onErrorsChange: (errors: ProtocolError[]) => void;
  onNext: () => void;
  onSave: () => void;
  language: 'hu' | 'de';
  onAdminAccess?: () => void;
  onHome?: () => void;
  onStartNew?: () => void;
}

const Questionnaire = memo(function Questionnaire({
  receptionDate,
  onReceptionDateChange,
  answers,
  onAnswerChange,
  errors,
  onErrorsChange,
  onNext,
  onSave,
  language,
  onAdminAccess,
  onHome,
  onStartNew,
}: QuestionnaireProps) {
  const { t, language: contextLanguage } = useLanguageContext();
  
  // Debug: Show current language and translations
  console.log('🌍 Questionnaire Language Debug:', {
    contextLanguage,
    propLanguage: language,
    titleTranslation: t.title,
    progressTranslation: t.progress
  });
  
  // Debug: Check if this is a real mount or just re-render
  const mountCountRef = useRef(0);
  mountCountRef.current += 1;
  console.log('🔄 Questionnaire component rendered/mounted - RENDER COUNT:', mountCountRef.current);
  
  // Use a stable ref for currentPage to prevent re-mounting
  const currentPageRef = useRef(0);
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('questionnaire-current-page');
    const initialPage = saved ? parseInt(saved, 10) : 0;
    currentPageRef.current = initialPage;
    return initialPage;
  });
  
  console.log('📁 Current page:', currentPage);

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [cacheUpdateTrigger, setCacheUpdateTrigger] = useState(0);
  const [measurementValues, setMeasurementValues] = useState<Record<string, number>>({});
  const [calculatedResults, setCalculatedResults] = useState<Record<string, any>>({});
  const [measurementErrors, setMeasurementErrors] = useState<ProtocolError[]>([]);

  // Save current page to localStorage - immediate with ref update
  useEffect(() => {
    currentPageRef.current = currentPage;
    localStorage.setItem('questionnaire-current-page', currentPage.toString());
  }, [currentPage]);

  // Load questions ONCE on mount only - no dependency array to prevent re-runs
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setQuestionsLoading(true);
        const response = await fetch(`/api/questions/${language}`);
        
        if (response.ok) {
          const questionsData = await response.json();
          console.log('Questions loaded for language:', language, 'count:', questionsData.length);
          setAllQuestions(questionsData);
        } else {
          console.warn('No active template found, using fallback questions');
          // Fallback static questions only if no template exists
          const fallbackQuestions = [
            {
              id: 'q1',
              title: language === 'hu' ? 'Átvevő neve' : 'Name des Empfängers',
              type: 'text' as const,
              required: true,
            },
            {
              id: 'q2',
              title: language === 'hu' ? 'Lift telepítés kész?' : 'Aufzuginstallation abgeschlossen?',
              type: 'yes_no_na' as const,
              required: true,
            },
            {
              id: 'q3',
              title: language === 'hu' ? 'Biztonsági rendszerek működnek?' : 'Sicherheitssysteme funktionsfähig?',
              type: 'yes_no_na' as const,
              required: true,
            },
            {
              id: 'q4',
              title: language === 'hu' ? 'Teherbírás (kg)' : 'Tragfähigkeit (kg)',
              type: 'number' as const,
              required: true,
              placeholder: 'Enter load capacity',
            },
            {
              id: 'q5',
              title: language === 'hu' ? 'További megjegyzések' : 'Zusätzliche Kommentare',
              type: 'text' as const,
              required: false,
              placeholder: 'Enter any additional comments or observations',
            },
          ];
          setAllQuestions(fallbackQuestions);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
        setAllQuestions([]);
      } finally {
        setQuestionsLoading(false);
      }
    };

    // Load questions only on mount
    loadQuestions();
  }, []); // Load questions only once on mount

  // Group questions by groupName and organize by groups
  const { questionGroups, totalPages, currentQuestions, progress, currentGroup } = useMemo(() => {
    // Group questions by groupName
    const groups = allQuestions.reduce((acc: Record<string, Question[]>, question: Question) => {
      const groupName = question.groupName || 'Egyéb';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(question);
      return acc;
    }, {} as Record<string, Question[]>);

    // Sort questions within each group by groupOrder
    Object.keys(groups).forEach(groupName => {
      groups[groupName].sort((a: Question, b: Question) => (a.groupOrder || 0) - (b.groupOrder || 0));
    });

    // Convert to array format for pagination
    const groupsArray = Object.entries(groups).map(([name, questions]) => ({
      name,
      questions,
      questionCount: questions.length
    }));

    // Calculate pagination based on groups (1 group per page)
    const total = groupsArray.length;
    const currentGroupData = groupsArray[currentPage] || { name: 'Egyéb', questions: [], questionCount: 0 };
    const prog = total > 0 ? ((currentPage + 1) / total) * 100 : 0;
    
    return { 
      questionGroups: groupsArray, 
      totalPages: total, 
      currentQuestions: currentGroupData.questions, 
      progress: prog,
      currentGroup: currentGroupData
    };
  }, [allQuestions, currentPage]);

  // Listen for cache changes to trigger re-calculation
  useEffect(() => {
    const handleCacheChange = () => {
      console.log('Cache change detected, checking can proceed...');
      setCacheUpdateTrigger(prev => prev + 1);
    };

    window.addEventListener('radio-change', handleCacheChange);
    window.addEventListener('button-check', handleCacheChange); // Button validation only
    window.addEventListener('measurement-change', handleCacheChange);

    return () => {
      window.removeEventListener('radio-change', handleCacheChange);
      window.removeEventListener('button-check', handleCacheChange);
      window.removeEventListener('measurement-change', handleCacheChange);
    };
  }, []);

  // Ultra-stable error handlers with proper typing
  const handleAddError = useCallback((error: Omit<ProtocolError, 'id'>) => {
    const newError: ProtocolError = {
      ...error,
      id: Date.now().toString(),
    };
    const currentErrors = Array.isArray(errors) ? errors : [];
    onErrorsChange([...currentErrors, newError]);
  }, [onErrorsChange, errors]);

  const handleEditError = useCallback((id: string, updatedError: Omit<ProtocolError, 'id'>) => {
    const currentErrors = Array.isArray(errors) ? errors : [];
    onErrorsChange(
      currentErrors.map((error: ProtocolError) =>
        error.id === id ? { ...updatedError, id } : error
      )
    );
  }, [onErrorsChange, errors]);

  const handleDeleteError = useCallback((id: string) => {
    const currentErrors = Array.isArray(errors) ? errors : [];
    onErrorsChange(currentErrors.filter((error: ProtocolError) => error.id !== id));
  }, [onErrorsChange, errors]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const checkCanProceed = () => {
    const requiredQuestions = (currentQuestions as Question[]).filter((q: Question) => q.required);
    
    if (requiredQuestions.length === 0) return true;
    
    // Check both answers prop and cached values
    const cachedRadioValues = getAllCachedValues();
    const cachedTrueFalseValues = getAllTrueFalseValues();
    const cachedInputValues = getAllStableInputValues();
    const cachedMeasurementValues = getAllMeasurementValues();
    
    // ALSO check localStorage for any saved data
    const savedFormData = JSON.parse(localStorage.getItem('otis-protocol-form-data') || '{"answers":{}}');
    
    // Include calculated values from MeasurementBlock components
    const calculatedValues = getAllCalculatedValues();
    
    // Calculate values for calculated questions based on current measurements
    const calculatedQuestions = (currentQuestions as Question[]).filter((q: Question) => q.type === 'calculated');
    calculatedQuestions.forEach(question => {
      if (question.calculationFormula && question.calculationInputs) {
        const inputIds = question.calculationInputs.split(',').map(id => id.trim());
        let formula = question.calculationFormula;
        let hasAllInputs = true;
        
        const allInputValues = { ...cachedMeasurementValues, ...cachedInputValues };
        
        inputIds.forEach(inputId => {
          const value = allInputValues[inputId];
          if (value === undefined || value === null || isNaN(parseFloat(value.toString()))) {
            hasAllInputs = false;
            return;
          }
          formula = formula.replace(new RegExp(`\\b${inputId}\\b`, 'g'), value.toString());
        });
        
        if (hasAllInputs) {
          try {
            const result = Function(`"use strict"; return (${formula})`)();
            if (!isNaN(result)) {
              calculatedValues[question.id] = Math.round(result * 100) / 100;
            }
          } catch (error) {
            console.error(`Calculation error for ${question.id}:`, error);
          }
        }
      }
    });

    const combinedAnswers = {
      ...answers,
      ...savedFormData.answers,
      ...cachedRadioValues,
      ...cachedTrueFalseValues,
      ...cachedInputValues,
      ...cachedMeasurementValues,
      ...calculatedValues,
    };
    
    console.log('checkCanProceed: Combined answers:', combinedAnswers);
    console.log('checkCanProceed: Cached input values:', cachedInputValues);
    console.log('checkCanProceed: Cached measurement values:', cachedMeasurementValues);
    console.log('checkCanProceed: Calculated values:', calculatedValues);
    console.log('checkCanProceed: localStorage answers:', savedFormData.answers);
    
    const result = requiredQuestions.every((q: Question) => {
      const answer = combinedAnswers[q.id];
      const hasAnswer = answer !== undefined && answer !== null && answer !== '';
      console.log(`Question ${q.id} (${q.title}): ${hasAnswer ? 'OK' : 'MISSING'} (value: "${answer}")`);
      return hasAnswer;
    });
    
    console.log('Can proceed check result:', result, 'Required questions:', requiredQuestions.length, 'Current page:', currentPage);
    return result;
  };
  
  // Calculate canProceed directly without useEffect
  const canProceedState = useMemo(() => {
    return checkCanProceed();
  }, [currentQuestions, answers, cacheUpdateTrigger]);

  const isLastPage = currentPage === totalPages - 1;

  return (
    <div className="min-h-screen bg-light-surface" onSubmit={(e) => e.preventDefault()}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo, Home and Title */}
            <div className="flex items-center">
              <img 
                src="/otis-elevators-seeklogo_1753525178175.png" 
                alt="OTIS Logo" 
                className="h-12 w-12 mr-4"
              />
              {onHome && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHome}
                  className="text-gray-600 hover:text-gray-800 mr-4"
                  title={language === 'de' ? 'Startseite' : 'Kezdőlap'}
                >
                  <Home className="h-4 w-4" />
                </Button>
              )}
              <span className="text-lg font-medium text-gray-800">{t.title}</span>
            </div>
            
            {/* Date Picker, Start New and Admin */}
            <div className="flex items-center space-x-4">
              <Label className="text-sm font-medium text-gray-600">{t.receptionDate}</Label>
              <Input
                type="date"
                value={receptionDate}
                onChange={(e) => {
                  e.preventDefault();
                  onReceptionDateChange(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className="w-auto"
              />
              {onStartNew && (
                <Button
                  onClick={onStartNew}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center"
                  size="sm"
                  title={t.startNew || 'Új protokoll indítása'}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t.startNew || 'Új protokoll'}
                </Button>
              )}
              {onAdminAccess && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAdminAccess}
                  className="text-gray-600 hover:text-gray-800"
                  title={t.admin}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-600">{t.progress}</span>
                {lastSaved && saveStatus === 'idle' && (
                  <span className="text-xs text-green-600 flex items-center bg-green-50 px-2 py-1 rounded-full">
                    <Check className="h-3 w-3 mr-1" />
                    {t.autoSaved}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-otis-blue">
                {currentPage + 1} / {totalPages}
              </span>
            </div>
            <Progress value={progress} className="w-full h-2" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8" onSubmit={(e) => e.preventDefault()}>
        {/* Group Header */}
        {questionGroups.length > 0 && currentGroup && (
          <QuestionGroupHeader
            groupName={currentGroup.name}
            questionCount={currentGroup.questionCount}
            totalGroups={questionGroups.length}
            currentGroupIndex={currentPage}
            language={language}
          />
        )}

        {/* Question Content */}
        <div className="mb-8">
          {/* Check if current group has only true_false questions */}
          {(currentQuestions as Question[]).length > 0 && (currentQuestions as Question[]).every((q: Question) => q.type === 'true_false') ? (
            <TrueFalseGroup
              questions={currentQuestions as Question[]}
              values={answers}
              onChange={onAnswerChange}
              groupName={currentGroup?.name || 'Kérdések'}
            />
          ) : (
            /* Check if current group has measurement or calculated questions */
            (currentQuestions as Question[]).some((q: Question) => q.type === 'measurement' || q.type === 'calculated') ? (
              <MeasurementBlock
                questions={(currentQuestions as Question[]).filter((q: Question) => q.type === 'measurement' || q.type === 'calculated')}
                values={answers}
                onChange={(questionId, value) => {
                  onAnswerChange(questionId, value);
                  // If this is a measurement question, also update measurementValues
                  if (typeof value === 'number') {
                    setMeasurementValues(prev => ({ ...prev, [questionId]: value }));
                  }
                }}
                onAddError={handleAddError}
              />
            ) : (
              /* Regular Question Grid (2x2 Layout) for other question types */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {(currentQuestions as Question[]).map((question: Question) => {
                  return (
                    <IsolatedQuestion
                      key={question.id}
                      question={question}
                      value={answers[question.id]}
                      onChange={(value) => {
                        onAnswerChange(question.id, value);
                      }}
                    />
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Error List Section */}
        <div className="mb-8">
          <ErrorList
            errors={errors}
            onAddError={handleAddError}
            onEditError={handleEditError}
            onDeleteError={handleDeleteError}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center" onSubmit={(e) => e.preventDefault()}>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.previous}
          </Button>
          
          <div className="flex space-x-4">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                // e.stopImmediatePropagation(); // Not available on button click events
                
                console.log('Save button clicked on page:', currentPage);
                setSaveStatus('saving');
                try {
                  // Sync all cached values to parent
                  const cachedRadioValues = getAllCachedValues();
                  const cachedTrueFalseValues = getAllTrueFalseValues();
                  const cachedInputValues = getAllStableInputValues();
                  const cachedMeasurementValues = getAllMeasurementValues();
                  const cachedCalculatedValues = getAllCalculatedValues();
                  
                  console.log('Save: Syncing cached values on page', currentPage);
                  console.log('Save: Radio values:', cachedRadioValues);
                  console.log('Save: True/False values:', cachedTrueFalseValues);
                  console.log('Save: Input values:', cachedInputValues);
                  console.log('Save: Measurement values:', cachedMeasurementValues);
                  console.log('Save: Calculated values:', cachedCalculatedValues);
                  
                  // DON'T call onAnswerChange - it causes re-mounting!
                  // Instead save directly to localStorage
                  const currentFormData = JSON.parse(localStorage.getItem('otis-protocol-form-data') || '{"answers":{}}');
                  const updatedFormData = {
                    ...currentFormData,
                    answers: {
                      ...currentFormData.answers,
                      ...cachedRadioValues,
                      ...cachedTrueFalseValues,
                      ...cachedInputValues,
                      ...cachedMeasurementValues,
                      ...cachedCalculatedValues,
                    }
                  };
                  
                  localStorage.setItem('otis-protocol-form-data', JSON.stringify(updatedFormData));
                  console.log('Save: Data saved directly to localStorage - NO React state updates');
                  setSaveStatus('saved');
                  setLastSaved(new Date());
                  
                  // Auto-clear saved status after 3 seconds
                  setTimeout(() => setSaveStatus('idle'), 3000);
                  
                } catch (error) {
                  console.error('Save: Failed with error:', error);
                  setSaveStatus('error');
                  setTimeout(() => setSaveStatus('idle'), 3000);
                }
              }}
              disabled={saveStatus === 'saving'}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-10 px-4 py-2 ${
                saveStatus === 'saved' ? 'bg-green-100 border-green-300 text-green-700' :
                saveStatus === 'error' ? 'bg-red-100 border-red-300 text-red-700' :
                'bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {saveStatus === 'saving' ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                  {t.saving}
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  {t.saved}
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <X className="h-4 w-4 mr-2 text-red-600" />
                  {t.error}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t.save}
                </>
              )}
            </button>
            
            {isLastPage ? (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Sync all cached values before completing
                  const cachedRadioValues = getAllCachedValues();
                  const cachedTrueFalseValues = getAllTrueFalseValues();
                  const cachedInputValues = getAllStableInputValues();
                  const cachedMeasurementValues = getAllMeasurementValues();
                  const cachedCalculatedValues = getAllCalculatedValues();
                  
                  console.log('Complete button: Syncing cached values...');
                  console.log('Radio values:', cachedRadioValues);
                  console.log('True/False values:', cachedTrueFalseValues);
                  console.log('Input values:', cachedInputValues);
                  console.log('Measurement values:', cachedMeasurementValues);
                  console.log('Calculated values:', cachedCalculatedValues);
                  
                  Object.entries(cachedRadioValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value as string);
                  });
                  Object.entries(cachedTrueFalseValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value as string);
                  });
                  Object.entries(cachedInputValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value as string);
                  });
                  Object.entries(cachedCalculatedValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value as number);
                  });
                  
                  // Small delay to ensure state updates before proceeding
                  setTimeout(() => {
                    onNext();
                  }, 100);
                }}
                disabled={!canProceedState}
                className={`flex items-center text-white ${
                  canProceedState 
                    ? 'bg-otis-blue hover:bg-blue-700 cursor-pointer' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {t.complete}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Next button clicked, canProceedState:', canProceedState);
                  
                  // Sync cached values before moving to next page
                  const cachedRadioValues = getAllCachedValues();
                  const cachedTrueFalseValues = getAllTrueFalseValues();
                  const cachedInputValues = getAllStableInputValues();
                  
                  Object.entries(cachedRadioValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value as string);
                  });
                  Object.entries(cachedTrueFalseValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value as string);
                  });
                  Object.entries(cachedInputValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value as string);
                  });
                  
                  const nextPage = currentPage + 1;
                  console.log('Setting next page from', currentPage, 'to', nextPage);
                  setCurrentPage(nextPage);
                  localStorage.setItem('questionnaire-current-page', nextPage.toString());
                }}
                disabled={!canProceedState}
                className={`flex items-center text-white ${
                  canProceedState 
                    ? 'bg-otis-blue hover:bg-blue-700 cursor-pointer' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {t.next} {canProceedState ? '✓' : '✗'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
});

export default Questionnaire;

// Debug - log current language context
console.log('Current Questionnaire component - Language context:', window.localStorage.getItem('otis-protocol-language'));
