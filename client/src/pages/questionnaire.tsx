import { useState, useEffect, useMemo, useCallback } from 'react';
import { Question, AnswerValue, ProtocolError } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { IsolatedQuestion } from '@/components/isolated-question';
import { ErrorList } from '@/components/error-list';
import { useLanguageContext } from '@/components/language-provider';
import { ArrowLeft, ArrowRight, Save, Settings, Home } from 'lucide-react';

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
    return saved ? parseInt(saved, 10) : 0;
  });

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Save current page to localStorage - debounced
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('questionnaire-current-page', currentPage.toString());
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [currentPage]);

  // Load questions from API/database
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setQuestionsLoading(true);
        const response = await fetch(`/api/questions/${language}`);
        
        if (response.ok) {
          const questionsData = await response.json();
          console.log('Loaded questions from API:', questionsData.length);
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
        setCurrentPage(0);
      }
    };

    loadQuestions();
  }, [language]);

  // Memoized calculations to prevent unnecessary re-renders
  const questionsPerPage = 4;
  
  const { totalPages, currentQuestions, progress } = useMemo(() => {
    const total = Math.ceil(allQuestions.length / questionsPerPage);
    const current = allQuestions.slice(
      currentPage * questionsPerPage,
      (currentPage + 1) * questionsPerPage
    );
    const prog = ((currentPage + 1) / total) * 100;
    
    return { totalPages: total, currentQuestions: current, progress: prog };
  }, [allQuestions, currentPage]);

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

  const canProceed = () => {
    const requiredQuestions = currentQuestions.filter(q => q.required);
    return requiredQuestions.every(q => answers[q.id] !== undefined);
  };

  const isLastPage = currentPage === totalPages - 1;

  return (
    <div className="min-h-screen bg-light-surface">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo, Home and Title */}
            <div className="flex items-center">
              <div className="h-8 w-12 bg-otis-blue rounded flex items-center justify-center mr-4">
                <span className="text-white font-bold text-sm">OTIS</span>
              </div>
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
        {/* Question Grid (2x2 Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {currentQuestions.map((question) => (
            <IsolatedQuestion
              key={question.id}
              question={question}
              value={answers[question.id]}
              onChange={(value) => onAnswerChange(question.id, value)}
            />
          ))}
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
              onClick={onSave}
              className="flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {t.save}
            </Button>
            
            {isLastPage ? (
              <Button
                onClick={onNext}
                disabled={!canProceed()}
                className="bg-otis-blue hover:bg-blue-700 text-white flex items-center"
              >
                {t.complete}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!canProceed()}
                className="bg-otis-blue hover:bg-blue-700 text-white flex items-center"
              >
                {t.next}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
