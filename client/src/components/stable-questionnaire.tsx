import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Question, AnswerValue, ProtocolError } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { IsolatedQuestion } from '@/components/isolated-question';
import { ErrorList } from '@/components/error-list';
import { ErrorExport } from '@/components/error-export';
import { useLanguageContext } from '@/components/language-provider';
import { ArrowLeft, ArrowRight, Save, Settings, Home } from 'lucide-react';

interface StableQuestionnaireProps {
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

export function StableQuestionnaire({
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
}: StableQuestionnaireProps) {
  const { t } = useLanguageContext();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Use ref to store answers locally to prevent remounts
  const localAnswersRef = useRef<Record<string, AnswerValue>>(answers);
  
  // Sync ref with props
  useEffect(() => {
    localAnswersRef.current = answers;
  }, [answers]);

  // Load questions only once
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch(`/api/questions/${language}`);
        if (response.ok) {
          const data = await response.json();
          console.log("Questions loaded:", data.length);
          setQuestions(data);
        }
      } catch (error) {
        console.error('Failed to load questions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, []); // No dependencies - load once only

  // Stable answer handler that doesn't cause re-mounts
  const handleAnswerChangeStable = useCallback((questionId: string, value: AnswerValue) => {
    // Update local ref immediately
    localAnswersRef.current = {
      ...localAnswersRef.current,
      [questionId]: value
    };
    
    // Debounce parent update to prevent remounts
    setTimeout(() => {
      onAnswerChange(questionId, value);
    }, 100);
  }, [onAnswerChange]);

  const handleAddError = useCallback((error: Omit<ProtocolError, 'id'>) => {
    const newError: ProtocolError = {
      ...error,
      id: Date.now().toString(),
    };
    onErrorsChange([...errors, newError]);
  }, [onErrorsChange, errors]);

  const handleEditError = useCallback((id: string, updatedError: Omit<ProtocolError, 'id'>) => {
    onErrorsChange(
      errors.map((error: ProtocolError) =>
        error.id === id ? { ...updatedError, id } : error
      )
    );
  }, [onErrorsChange, errors]);

  const handleDeleteError = useCallback((id: string) => {
    onErrorsChange(errors.filter((error: ProtocolError) => error.id !== id));
  }, [onErrorsChange, errors]);

  const questionsPerPage = 4;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(
    currentPage * questionsPerPage,
    (currentPage + 1) * questionsPerPage
  );

  const canProceed = () => {
    const requiredQuestions = currentQuestions.filter(q => q.required);
    return requiredQuestions.every(q => localAnswersRef.current[q.id] !== undefined);
  };

  const isLastPage = currentPage === totalPages - 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-light-surface flex items-center justify-center">
        <div className="text-lg">{language === 'de' ? 'Fragen werden geladen...' : 'Kérdések betöltése...'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-surface">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo, Home and Title */}
            <div className="flex items-center">
              <img 
                src="/attached_assets/otis-elevators-seeklogo_1753525178175.png" 
                alt="OTIS Logo" 
                className="h-8 w-8 mr-4"
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
                  title="Admin"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              {t.progress}: {currentPage + 1} / {totalPages}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentPage + 1) / totalPages) * 100)}%
            </span>
          </div>
          <Progress 
            value={((currentPage + 1) / totalPages) * 100} 
            className="h-2"
          />
        </div>

        {/* Questions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="space-y-6">
            {currentQuestions.map((question) => (
              <div key={question.id} className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  {question.title}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                
                {question.type === 'text' && (
                  <Input
                    type="text"
                    value={localAnswersRef.current[question.id] as string || ''}
                    onChange={(e) => handleAnswerChangeStable(question.id, e.target.value)}
                    className="w-full"
                    placeholder={question.placeholder || ''}
                  />
                )}
                
                {question.type === 'yes_no_na' && (
                  <div className="space-y-2">
                    {['yes', 'no', 'na'].map((option) => (
                      <label key={option} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={localAnswersRef.current[question.id] === option}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleAnswerChangeStable(question.id, option);
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">
                          {option === 'yes' ? t.yes : option === 'no' ? t.no : t.notApplicable}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                
                {question.type === 'number' && (
                  <Input
                    type="number"
                    value={localAnswersRef.current[question.id] as number || ''}
                    onChange={(e) => handleAnswerChangeStable(question.id, parseInt(e.target.value) || 0)}
                    className="w-full"
                    placeholder={question.placeholder || ''}
                  />
                )}
                
                {question.placeholder && (
                  <p className="text-xs text-gray-500">{question.placeholder}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Management */}
        <ErrorList
          errors={errors}
          onAddError={addError}
          onEditError={editError}
          onDeleteError={deleteError}
        />

        {/* Error Export - only show if there are errors */}
        {(errors.length > 0 || JSON.parse(localStorage.getItem('protocol-errors') || '[]').length > 0) && (
          <ErrorExport 
            errors={errors}
            protocolData={{
              buildingAddress: localAnswersRef.current['building_address'] as string,
              liftId: localAnswersRef.current['lift_id'] as string,
              inspectorName: localAnswersRef.current['inspector_name'] as string,
              inspectionDate: receptionDate
            }}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.previous}</span>
          </Button>

          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={onSave}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{t.save}</span>
            </Button>

            {isLastPage ? (
              <Button
                onClick={onNext}
                disabled={!canProceed()}
                className="bg-otis-blue hover:bg-otis-blue/90"
              >
                {t.complete}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!canProceed()}
                className="flex items-center space-x-2 bg-otis-blue hover:bg-otis-blue/90"
              >
                <span>{t.next}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}