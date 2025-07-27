interface QuestionGroupHeaderProps {
  groupName: string;
  questionCount: number;
  totalGroups: number;
  currentGroupIndex: number;
}

export function QuestionGroupHeader({ 
  groupName, 
  questionCount, 
  totalGroups, 
  currentGroupIndex 
}: QuestionGroupHeaderProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {groupName}
          </h2>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {questionCount} kérdés ebben a csoportban
          </p>
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
          {currentGroupIndex + 1} / {totalGroups} csoport
        </div>
      </div>
    </div>
  );
}