import { useState, useEffect } from 'react';
import { Question, AnswerValue, ProtocolError } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { QuestionBlock } from '@/components/question-block';
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
  const [currentPage, setCurrentPage] = useState(0);

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Load questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setQuestionsLoading(true);
        const response = await fetch(`/api/questions/${language}`);
        if (response.ok) {
          const questions = await response.json();
          setAllQuestions(questions);
        } else {
          // Fallback to hardcoded questions if no template is configured
          setAllQuestions([
            {
              id: 'q1',
              title: language === 'hu' ? 'Lift telepítés kész?' : language === 'de' ? 'Aufzuginstallation abgeschlossen?' : 'Elevator installation complete?',
              type: 'yes_no_na',
              required: true,
            },
            {
              id: 'q2',
              title: language === 'hu' ? 'Biztonsági rendszerek működnek?' : language === 'de' ? 'Sicherheitssysteme funktionsfähig?' : 'Safety systems operational?',
              type: 'yes_no_na',
              required: true,
            },
            {
              id: 'q3',
              title: language === 'hu' ? 'Teherbírás (kg)' : language === 'de' ? 'Tragfähigkeit (kg)' : 'Load capacity (kg)',
              type: 'number',
              required: true,
              placeholder: 'Enter load capacity',
            },
            {
              id: 'q4',
              title: language === 'hu' ? 'További megjegyzések' : language === 'de' ? 'Zusätzliche Kommentare' : 'Additional comments',
              type: 'text',
              required: false,
              placeholder: 'Enter any additional comments or observations',
            },
          ]);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        // Use fallback questions on error
        setAllQuestions([]);
      } finally {
        setQuestionsLoading(false);
      }
    };

    fetchQuestions();
  }, [language, t]);

  // Group questions into pages of 4 (2x2 grid)
  const questionsPerPage = 4;
  const totalPages = Math.ceil(allQuestions.length / questionsPerPage);
  const currentQuestions = allQuestions.slice(
    currentPage * questionsPerPage,
    (currentPage + 1) * questionsPerPage
  );

  const progress = ((currentPage + 1) / totalPages) * 100;

  const handleAddError = (error: Omit<ProtocolError, 'id'>) => {
    const newError: ProtocolError = {
      ...error,
      id: Date.now().toString(),
    };
    onErrorsChange([...errors, newError]);
  };

  const handleEditError = (id: string, updatedError: Omit<ProtocolError, 'id'>) => {
    onErrorsChange(
      errors.map((error) =>
        error.id === id ? { ...updatedError, id } : error
      )
    );
  };

  const handleDeleteError = (id: string) => {
    onErrorsChange(errors.filter((error) => error.id !== id));
  };

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
            <QuestionBlock
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
