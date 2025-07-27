import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { ArrowLeft, ArrowRight, Save, Settings, Home } from 'lucide-react';
import { getAllCachedValues } from '@/components/cache-radio';
import { getAllTrueFalseValues } from '@/components/true-false-radio';

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
}

export function Questionnaire({
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
}: QuestionnaireProps) {
  const { t, language: contextLanguage } = useLanguageContext();
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('questionnaire-current-page');
    const page = saved ? parseInt(saved, 10) : 0;
    console.log('Initial currentPage loaded from localStorage:', page);
    return page;
  });

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [cacheUpdateTrigger, setCacheUpdateTrigger] = useState(0);

  // Save current page to localStorage - debounced
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('questionnaire-current-page', currentPage.toString());
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [currentPage]);

  // Load questions from API/database ONCE - no dependencies to prevent re-renders
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setQuestionsLoading(true);
        const response = await fetch(`/api/questions/${language}`);
        
        if (response.ok) {
          const questionsData = await response.json();
          console.log('Loaded questions from API (ONCE):', questionsData.length);
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
    const groups = allQuestions.reduce((acc, question) => {
      const groupName = question.groupName || 'Egyéb';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(question);
      return acc;
    }, {} as Record<string, Question[]>);

    // Sort questions within each group by groupOrder
    Object.keys(groups).forEach(groupName => {
      groups[groupName].sort((a, b) => (a.groupOrder || 0) - (b.groupOrder || 0));
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

  // Listen for cache changes to update canProceed state
  useEffect(() => {
    const handleCacheChange = () => {
      console.log('Cache change detected, checking can proceed...');
      const newCanProceed = checkCanProceed();
      console.log('Setting canProceedState to:', newCanProceed);
      setCanProceedState(newCanProceed);
    };

    window.addEventListener('radio-change', handleCacheChange);
    window.addEventListener('input-change', handleCacheChange);

    return () => {
      window.removeEventListener('radio-change', handleCacheChange);
      window.removeEventListener('input-change', handleCacheChange);
    };
  }, []);

  // Ultra-stable error handlers with proper typing
  const handleAddError = useCallback((error: Omit<ProtocolError, 'id'>) => {
    const newError: ProtocolError = {
      ...error,
      id: Date.now().toString(),
    };
    onErrorsChange((prev: ProtocolError[]) => [...prev, newError]);
  }, [onErrorsChange]);

  const handleEditError = useCallback((id: string, updatedError: Omit<ProtocolError, 'id'>) => {
    onErrorsChange((prev: ProtocolError[]) =>
      prev.map((error: ProtocolError) =>
        error.id === id ? { ...updatedError, id } : error
      )
    );
  }, [onErrorsChange]);

  const handleDeleteError = useCallback((id: string) => {
    onErrorsChange((prev: ProtocolError[]) => prev.filter((error: ProtocolError) => error.id !== id));
  }, [onErrorsChange]);

  const [canProceedState, setCanProceedState] = useState(false);
  
  const checkCanProceed = () => {
    const requiredQuestions = currentQuestions.filter(q => q.required);
    
    if (requiredQuestions.length === 0) return true;
    
    // Check both answers prop and cached values
    const cachedRadioValues = getAllCachedValues();
    const cachedTrueFalseValues = getAllTrueFalseValues();
    const cachedInputValues = (window as any).inputValues || {};
    
    const result = requiredQuestions.every(q => {
      const hasAnswer = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '';
      const hasCachedRadio = cachedRadioValues[q.id] !== undefined && cachedRadioValues[q.id] !== '';
      const hasCachedTrueFalse = cachedTrueFalseValues[q.id] !== undefined && cachedTrueFalseValues[q.id] !== '';
      const hasCachedInput = cachedInputValues[q.id] !== undefined && cachedInputValues[q.id] !== '';
      
      return hasAnswer || hasCachedRadio || hasCachedTrueFalse || hasCachedInput;
    });
    
    console.log('Can proceed check result:', result, 'Required questions:', requiredQuestions.length, 'Current page:', currentPage);
    return result;
  };
  
  // Update canProceed state when dependencies change
  useEffect(() => {
    const newCanProceed = checkCanProceed();
    setCanProceedState(newCanProceed);
  }, [currentQuestions, answers]);

  const isLastPage = currentPage === totalPages - 1;

  return (
    <div className="min-h-screen bg-light-surface">
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
                  title="Kezdőlap"
                >
                  <Home className="h-4 w-4" />
                </Button>
              )}
              <span className="text-lg font-medium text-gray-800">{t.title}</span>
            </div>
            
            {/* Date Picker and Admin */}
            <div className="flex items-center space-x-4">
              <Label className="text-sm font-medium text-gray-600">{t.receptionDate}</Label>
              <Input
                type="date"
                value={receptionDate}
                onChange={(e) => onReceptionDateChange(e.target.value)}
                className="w-auto"
              />
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
              <span className="text-sm font-medium text-gray-600">{t.progress}</span>
              <span className="text-sm font-medium text-otis-blue">
                {currentPage + 1} / {totalPages}
              </span>
            </div>
            <Progress value={progress} className="w-full h-2" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
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
          {currentQuestions.length > 0 && currentQuestions.every(q => q.type === 'true_false') ? (
            <TrueFalseGroup
              questions={currentQuestions}
              values={answers}
              onChange={onAnswerChange}
              groupName={currentGroup?.name || 'Kérdések'}
            />
          ) : (
            /* Regular Question Grid (2x2 Layout) for non-true_false questions */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {currentQuestions.map((question) => (
                <IsolatedQuestion
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  onChange={(value) => onAnswerChange(question.id, value)}
                />
              ))}
            </div>
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
        <div className="flex justify-between items-center">
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
            <Button
              variant="outline"
              onClick={() => {
                // Sync all cached values to parent
                const cachedRadioValues = getAllCachedValues();
                const cachedTrueFalseValues = getAllTrueFalseValues();
                const cachedInputValues = (window as any).inputValues || {};
                
                Object.entries(cachedRadioValues).forEach(([questionId, value]) => {
                  onAnswerChange(questionId, value);
                });
                Object.entries(cachedTrueFalseValues).forEach(([questionId, value]) => {
                  onAnswerChange(questionId, value);
                });
                Object.entries(cachedInputValues).forEach(([questionId, value]) => {
                  onAnswerChange(questionId, value);
                });
                
                onSave();
              }}
              className="flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {t.save}
            </Button>
            
            {isLastPage ? (
              <Button
                onClick={() => {
                  // Sync all cached values before completing
                  const cachedRadioValues = getAllCachedValues();
                  const cachedInputValues = (window as any).inputValues || {};
                  
                  Object.entries(cachedRadioValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value);
                  });
                  Object.entries(cachedInputValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value);
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
                onClick={() => {
                  console.log('Next button clicked, canProceedState:', canProceedState);
                  
                  // Sync cached values before moving to next page
                  const cachedRadioValues = getAllCachedValues();
                  const cachedInputValues = (window as any).inputValues || {};
                  
                  Object.entries(cachedRadioValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value);
                  });
                  Object.entries(cachedInputValues).forEach(([questionId, value]) => {
                    onAnswerChange(questionId, value);
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
}
