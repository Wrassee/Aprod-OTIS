import { useState, useEffect, useRef } from 'react';
import { Question } from '@shared/schema';

export function useStableQuestions(language: 'hu' | 'de') {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const currentLanguageRef = useRef(language);
  
  useEffect(() => {
    // Only fetch if language actually changed
    if (currentLanguageRef.current === language && questions.length > 0) {
      return;
    }
    
    currentLanguageRef.current = language;
    
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/questions/${language}`);
        if (response.ok) {
          const questionsData = await response.json();
          setQuestions(questionsData);
        } else {
          // Fallback questions
          setQuestions([
            {
              id: 'q1',
              title: language === 'hu' ? 'Lift telepítés kész?' : 'Aufzuginstallation abgeschlossen?',
              type: 'yes_no_na',
              required: true,
            },
            {
              id: 'q2',
              title: language === 'hu' ? 'Biztonsági rendszerek működnek?' : 'Sicherheitssysteme funktionsfähig?',
              type: 'yes_no_na',
              required: true,
            },
            {
              id: 'q3',
              title: language === 'hu' ? 'Teherbírás (kg)' : 'Tragfähigkeit (kg)',
              type: 'number',
              required: true,
              placeholder: 'Enter load capacity',
            },
            {
              id: 'q4',
              title: language === 'hu' ? 'További megjegyzések' : 'Zusätzliche Kommentare',
              type: 'text',
              required: false,
              placeholder: 'Enter any additional comments',
            },
          ]);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [language, questions.length]);

  return { questions, loading };
}