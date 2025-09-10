import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, User, Calendar, CheckCircle, AlertTriangle, Mail, Download } from 'lucide-react';
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string>('');
  const [isEmailSending, setIsEmailSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch protocol and generate PDF preview
        const protocolResponse = await fetch('/api/protocols/preview');
        if (!protocolResponse.ok) {
          throw new Error('Failed to fetch protocol');
        }
        const protocolData = await protocolResponse.json();
        setProtocol(protocolData);

        // Generate PDF for preview
        try {
          const pdfResponse = await fetch('/api/protocols/download-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: 'hu' })
          });
          
          if (pdfResponse.ok) {
            const blob = await pdfResponse.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
          } else {
            console.error('PDF generation failed:', await pdfResponse.text());
          }
        } catch (pdfError) {
          console.error('PDF fetch error:', pdfError);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEmailSend = async () => {
    if (!protocol) return;
    
    setIsEmailSending(true);
    setEmailStatus('Email küldése folyamatban...');
    
    try {
      const response = await fetch('/api/protocols/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: protocol,
          language: 'hu',
          recipient: 'netkodok@gmail.com'
        })
      });
      
      if (response.ok) {
        setEmailStatus('✅ Email sikeresen elküldve a netkodok@gmail.com címre!');
        setTimeout(() => setEmailStatus(''), 5000);
      } else {
        setEmailStatus('❌ Email küldése sikertelen!');
        setTimeout(() => setEmailStatus(''), 5000);
      }
    } catch (error) {
      console.error('Email error:', error);
      setEmailStatus('❌ Email küldése sikertelen!');
      setTimeout(() => setEmailStatus(''), 5000);
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!protocol) return;
    
    try {
      const response = await fetch('/api/protocols/download-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'hu' })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OTIS-Protocol-${protocol.receptionDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

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
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center text-green-600 mb-2">
                  <CheckCircle className="h-6 w-6 mr-2" />
                  <span className="font-medium">Elkészült</span>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleEmailSend}
                    disabled={isEmailSending}
                    className="bg-otis-blue hover:bg-otis-blue/90 text-white"
                    size="sm"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {isEmailSending ? 'Küldés...' : 'Email'}
                  </Button>
                  
                  <Button 
                    onClick={handleDownloadPdf}
                    variant="outline"
                    className="border-otis-blue text-otis-blue hover:bg-otis-blue/10"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
                
                {emailStatus && (
                  <div className={`text-sm mt-2 px-3 py-1 rounded ${
                    emailStatus.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {emailStatus}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PDF Preview Section */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">OTIS Protokoll PDF Előnézet</h3>
            {pdfUrl ? (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <iframe 
                  src={pdfUrl} 
                  className="w-full h-96 border-0"
                  title="Protocol PDF Preview"
                />
                <div className="p-4 bg-gray-100 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    OTIS Átvételi Protokoll - Generálva: {new Date().toLocaleString('hu-HU')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>PDF generálás folyamatban...</p>
              </div>
            )}
          </div>

          {/* Errors Section */}
          {protocol.errors && protocol.errors.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Hibák</h3>
              <div className="space-y-3">
                {(Array.isArray(protocol.errors) ? protocol.errors : JSON.parse(protocol.errors || '[]')).map((error: any) => (
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