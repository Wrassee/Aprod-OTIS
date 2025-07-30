import { memo, useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Ruler, Calculator, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { MeasurementQuestion } from './measurement-question';
import { CalculatedResult } from './calculated-result';
import { validateMeasurement } from '@/lib/measurement-examples';
import type { Question, ProtocolError } from '@shared/schema';

interface MeasurementBlockProps {
  questions: Question[];
  measurementValues: Record<string, number>;
  calculatedResults: Record<string, any>;
  onMeasurementChange: (questionId: string, value: number | undefined) => void;
  onCalculatedChange: (questionId: string, value: number | undefined) => void;
  onErrorsChange: (errors: ProtocolError[]) => void;
}

export const MeasurementBlock = memo(function MeasurementBlock({
  questions,
  measurementValues,
  calculatedResults,
  onMeasurementChange,
  onCalculatedChange,
  onErrorsChange
}: MeasurementBlockProps) {
  const { language, t } = useLanguage();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const measurementQuestions = questions.filter(q => q.type === 'measurement');
  const calculatedQuestions = questions.filter(q => q.type === 'calculated');

  // Validate measurement values and update errors
  useEffect(() => {
    const errors: Record<string, string> = {};
    const protocolErrors: ProtocolError[] = [];

    // Validate measurement questions
    measurementQuestions.forEach(question => {
      const value = measurementValues[question.id];
      if (value !== undefined) {
        const validation = validateMeasurement(value, question.minValue, question.maxValue);
        if (!validation.isValid && validation.error) {
          errors[question.id] = validation.error;
          
          // Add to protocol errors if out of range
          protocolErrors.push({
            id: `measurement-${question.id}`,
            title: language === 'hu' 
              ? `Mérési hiba: ${question.title}`
              : `Messfehler: ${question.titleDe || question.title}`,
            description: language === 'hu'
              ? `A mért érték (${value} ${question.unit}) nem felel meg a határértékeknek.`
              : `Der gemessene Wert (${value} ${question.unit}) entspricht nicht den Grenzwerten.`,
            severity: 'medium' as const,
            images: []
          });
        }
      }
    });

    // Validate calculated questions
    calculatedQuestions.forEach(question => {
      const value = calculatedResults[question.id];
      if (value !== undefined) {
        const validation = validateMeasurement(value, question.minValue, question.maxValue);
        if (!validation.isValid && validation.error) {
          errors[question.id] = validation.error;
          
          // Add to protocol errors if out of range
          protocolErrors.push({
            id: `calculated-${question.id}`,
            title: language === 'hu' 
              ? `Számítási hiba: ${question.title}`
              : `Berechnungsfehler: ${question.titleDe || question.title}`,
            description: language === 'hu'
              ? `A számított érték (${value} ${question.unit}) nem felel meg az OTIS előírásoknak.`
              : `Der berechnete Wert (${value} ${question.unit}) entspricht nicht den OTIS-Vorschriften.`,
            severity: 'critical' as const,
            images: []
          });
        }
      }
    });

    setValidationErrors(errors);
    onErrorsChange(protocolErrors);
  }, [measurementValues, calculatedResults, measurementQuestions, calculatedQuestions, language, onErrorsChange]);

  const handleMeasurementChange = useCallback((questionId: string, value: number | undefined) => {
    console.log('MeasurementBlock handleMeasurementChange:', questionId, value);
    onMeasurementChange(questionId, value);
  }, [onMeasurementChange]);

  const handleCalculatedChange = useCallback((questionId: string, value: number | undefined) => {
    onCalculatedChange(questionId, value);
  }, [onCalculatedChange]);

  if (measurementQuestions.length === 0 && calculatedQuestions.length === 0) {
    return null;
  }

  const getTotalErrors = () => {
    return Object.keys(validationErrors).length;
  };

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Ruler className="h-5 w-5 text-blue-600" />
            <span>
              {language === 'hu' ? 'Mérési adatok és számítások' : 'Messdaten und Berechnungen'}
            </span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {getTotalErrors() > 0 && (
              <Badge variant="destructive" className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3" />
                <span>{getTotalErrors()}</span>
              </Badge>
            )}
            <Badge variant="outline">
              {language === 'hu' 
                ? `${measurementQuestions.length + calculatedQuestions.length} elem`
                : `${measurementQuestions.length + calculatedQuestions.length} Elemente`}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Measurement Questions Section */}
        {measurementQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Ruler className="h-4 w-4 text-blue-500" />
              <h3 className="text-md font-semibold">
                {language === 'hu' ? 'Mérési adatok' : 'Messdaten'}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {measurementQuestions.length}
              </Badge>
            </div>
            
            <div className="grid gap-4">
              {measurementQuestions.map(question => {
                console.log('Rendering MeasurementQuestion:', question.id, 'value:', measurementValues[question.id]);
                return (
                  <MeasurementQuestion
                    key={question.id}
                    question={question}
                    value={measurementValues[question.id]}
                    onChange={(value) => {
                      console.log('MeasurementQuestion onChange:', question.id, value);
                      handleMeasurementChange(question.id, value);
                    }}
                    error={validationErrors[question.id]}
                    isValid={!validationErrors[question.id]}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Separator between sections */}
        {measurementQuestions.length > 0 && calculatedQuestions.length > 0 && (
          <Separator className="my-6" />
        )}

        {/* Calculated Results Section */}
        {calculatedQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-green-500" />
              <h3 className="text-md font-semibold">
                {language === 'hu' ? 'Számított értékek' : 'Berechnete Werte'}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {calculatedQuestions.length}
              </Badge>
            </div>
            
            <div className="grid gap-4">
              {calculatedQuestions.map(question => (
                <CalculatedResult
                  key={question.id}
                  question={question}
                  measurementValues={measurementValues}
                  onChange={(value) => handleCalculatedChange(question.id, value)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Summary Info */}
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            {language === 'hu' ? (
              <>
                <strong>Összesítés:</strong> {measurementQuestions.length} mérés, {calculatedQuestions.length} számítás.
                {getTotalErrors() > 0 && (
                  <span className="text-red-600 dark:text-red-400 ml-2">
                    {getTotalErrors()} hiba észlelve.
                  </span>
                )}
              </>
            ) : (
              <>
                <strong>Zusammenfassung:</strong> {measurementQuestions.length} Messungen, {calculatedQuestions.length} Berechnungen.
                {getTotalErrors() > 0 && (
                  <span className="text-red-600 dark:text-red-400 ml-2">
                    {getTotalErrors()} Fehler erkannt.
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});