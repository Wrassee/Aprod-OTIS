import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, User, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLanguageContext } from '@/components/language-provider';

interface Protocol {
  id: string;
  receptionDate: string;
  answers: Record<string, any>;
  errors: Array<{
    id: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    images?: string[];
  }>;
  signature: string;
  signatureName: string;
  createdAt: string;
  updatedAt: string;
}

interface Question {
  id: string;
  title: string;
  type: string;
}

interface ProtocolPreviewProps {
  onBack: () => void;
}

export function ProtocolPreview({ onBack }: ProtocolPreviewProps) {
  const { t } = useLanguageContext();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both protocol and questions in parallel
        const [protocolResponse, questionsResponse] = await Promise.all([
          fetch('/api/protocols/preview'),
          fetch('/api/questions/hu') // Default to Hungarian
        ]);

        if (!protocolResponse.ok) {
          throw new Error('Failed to fetch protocol');
        }
        if (!questionsResponse.ok) {
          throw new Error('Failed to fetch questions');
        }

        const protocolData = await protocolResponse.json();
        const questionsData = await questionsResponse.json();
        
        setProtocol(protocolData);
        setQuestions(questionsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-light-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-otis-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Protokoll betöltése...</p>
        </div>
      </div>
    );
  }

  if (error || !protocol) {
    return (
      <div className="min-h-screen bg-light-surface flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Hiba a protokoll betöltésekor</p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vissza
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-surface">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <Button
              onClick={onBack}
              variant="ghost"
              className="mr-4 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-12 w-12 bg-otis-blue rounded flex items-center justify-center mr-4">
              <img 
                src="/otis-elevators-seeklogo.png" 
                alt="OTIS Logo"
                className="h-8 w-8 object-contain filter brightness-0 invert"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Protokoll Előnézet</h1>
              <p className="text-sm text-gray-600">ID: {protocol.id}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Protocol Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Protocol Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-otis-blue mr-3" />
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Átvételi Protokoll
                  </h2>
                  <div className="flex items-center mt-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Dátum: {protocol.receptionDate}
                  </div>
                </div>
              </div>
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-6 w-6 mr-2" />
                <span className="font-medium">Elkészült</span>
              </div>
            </div>
          </div>

          {/* Answers Section */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Válaszok</h3>
            <div className="grid gap-4">
              {Object.entries(protocol.answers).map(([questionId, answer]) => {
                const question = questions.find(q => q.id === questionId);
                const questionTitle = question ? question.title : `Kérdés ${questionId}`;
                
                return (
                  <div key={questionId} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      {questionTitle}
                    </div>
                    <div className="text-gray-800 font-medium">
                      {typeof answer === 'string' ? answer : 
                       typeof answer === 'number' ? answer.toString() :
                       typeof answer === 'boolean' ? (answer ? 'Igen' : 'Nem') :
                       JSON.stringify(answer)}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {Object.keys(protocol.answers).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>{language === 'de' ? 'Keine erfassten Antworten' : 'Nincsenek rögzített válaszok'}</p>
              </div>
            )}
          </div>

          {/* Errors Section */}
          {protocol.errors && protocol.errors.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Hibák</h3>
              <div className="space-y-3">
                {protocol.errors.map((error) => (
                  <div key={error.id} className="flex items-start p-3 bg-red-50 rounded-lg">
                    <div className={`w-3 h-3 rounded-full mt-1 mr-3 ${
                      error.severity === 'high' ? 'bg-red-500' :
                      error.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-gray-800">{error.description}</p>
                      <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                        error.severity === 'high' ? 'bg-red-100 text-red-800' :
                        error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {error.severity === 'high' ? 'Magas' : 
                         error.severity === 'medium' ? 'Közepes' : 'Alacsony'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature Section */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Aláírás</h3>
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-gray-800 font-medium">{protocol.signatureName}</p>
                <p className="text-sm text-gray-600">
                  Létrehozva: {new Date(protocol.createdAt).toLocaleString('hu-HU')}
                </p>
              </div>
            </div>
            {protocol.signature && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Digitális aláírás:</p>
                <img 
                  src={protocol.signature} 
                  alt="Aláírás" 
                  className="max-w-xs h-20 border border-gray-300 bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}