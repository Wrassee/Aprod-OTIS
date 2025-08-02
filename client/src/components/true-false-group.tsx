import { memo } from 'react';
import { Question, AnswerValue } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrueFalseRadio } from './true-false-radio';
import { useLanguageContext } from './language-provider';

interface TrueFalseGroupProps {
  questions: Question[];
  values: Record<string, AnswerValue>;
  onChange: (questionId: string, value: AnswerValue) => void;
  groupName: string;
}

export const TrueFalseGroup = memo(({ questions, values, onChange, groupName }: TrueFalseGroupProps) => {
  const { t } = useLanguageContext();

  if (questions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {questions.map((question) => (
        <Card key={question.id} className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-800">
              {question.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrueFalseRadio
              questionId={question.id}
              questionTitle=""
              value={values[question.id]?.toString() || ''}
              onChange={(newValue) => onChange(question.id, newValue as AnswerValue)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

TrueFalseGroup.displayName = 'TrueFalseGroup';