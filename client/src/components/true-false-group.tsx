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
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-800">
          {groupName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_100px_100px] gap-4 items-center pb-3 border-b-2 border-gray-200 mb-2">
          <div className="text-sm font-semibold text-gray-700">
            Kérdés
          </div>
          <div className="text-sm font-semibold text-green-600 text-center flex items-center justify-center gap-1">
            <span className="text-green-600 font-bold">✓</span>
            Igen
          </div>
          <div className="text-sm font-semibold text-red-600 text-center flex items-center justify-center gap-1">
            <span className="text-red-600 font-bold">✗</span>
            Nem
          </div>
        </div>

        {/* Question Rows */}
        <div className="space-y-0">
          {questions.map((question) => (
            <TrueFalseRadio
              key={question.id}
              questionId={question.id}
              questionTitle={question.title}
              value={values[question.id]?.toString() || ''}
              onChange={(newValue) => onChange(question.id, newValue as AnswerValue)}
            />
          ))}
        </div>


      </CardContent>
    </Card>
  );
});

TrueFalseGroup.displayName = 'TrueFalseGroup';