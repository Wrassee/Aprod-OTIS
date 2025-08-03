import { useState } from 'react';
import { ProtocolError } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Mail, Printer, FileText, Camera, Tag } from 'lucide-react';
import { useLanguageContext } from './language-provider';

interface ErrorExportProps {
  errors: ProtocolError[];
  protocolData?: {
    buildingAddress?: string;
    liftId?: string;
    inspectorName?: string;
    inspectionDate?: string;
  };
}

export function ErrorExport({ errors, protocolData }: ErrorExportProps) {
  const { t, language } = useLanguageContext();
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Combine React state errors with localStorage errors
  const localStorageErrors = (() => {
    try {
      const stored = localStorage.getItem('protocol-errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  const allErrors = [...errors, ...localStorageErrors];
  
  const getSeverityColor = (severity: ProtocolError['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityText = (severity: ProtocolError['severity']) => {
    switch (severity) {
      case 'critical':
        return language === 'hu' ? 'Kritikus' : 'Kritisch';
      case 'medium':
        return language === 'hu' ? 'Közepes' : 'Mittel';
      case 'low':
        return language === 'hu' ? 'Alacsony' : 'Niedrig';
      default:
        return severity;
    }
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/errors/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errors: allErrors,
          protocolData,
          language
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OTIS_Hibalista_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateExcel = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/errors/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errors: allErrors,
          protocolData,
          language
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OTIS_Hibalista_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating Excel:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmail = async () => {
    // TODO: Implement email functionality with SendGrid
    alert(language === 'hu' ? 'Email funkció fejlesztés alatt' : 'Email-Funktion in Entwicklung');
  };

  const printReport = () => {
    window.print();
  };

  if (allErrors.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="text-green-600 mb-2">✅</div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              {language === 'hu' ? 'Nincs jelentett hiba' : 'Keine Fehler gemeldet'}
            </h3>
            <p className="text-green-600">
              {language === 'hu' 
                ? 'Az átvételi protokoll hibamentesen befejezve.'
                : 'Das Abnahmeprotokoll wurde fehlerfrei abgeschlossen.'}
            </p>
          </div>
          
          {/* Still show export options for empty error list documentation */}
          <div className="bg-white rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              {language === 'hu' ? 'Hibalista exportálás (üres lista)' : 'Fehlerliste Export (leere Liste)'}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={generatePDF}
                disabled={isGenerating}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <FileText className="h-3 w-3 mr-1" />
                {isGenerating ? (language === 'hu' ? 'Generálás...' : 'Erstellen...') : 'PDF'}
              </Button>

              <Button
                onClick={generateExcel}
                disabled={isGenerating}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-3 w-3 mr-1" />
                {isGenerating ? (language === 'hu' ? 'Generálás...' : 'Erstellen...') : 'Excel'}
              </Button>

              <Button
                onClick={sendEmail}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Mail className="h-3 w-3 mr-1" />
                {language === 'hu' ? 'Email' : 'E-Mail'}
              </Button>

              <Button
                onClick={printReport}
                size="sm"
                variant="outline"
                className="border-gray-300"
              >
                <Printer className="h-3 w-3 mr-1" />
                {language === 'hu' ? 'Nyomtatás' : 'Drucken'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {language === 'hu' 
                ? 'Üres hibalista dokumentáció exportálása véglegesítéshez.'
                : 'Export der leeren Fehlerliste zur Dokumentation der fehlerfreien Abnahme.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {language === 'hu' ? 'Hibalista Exportálás' : 'Fehlerliste Export'}
              </h2>
              <p className="text-sm text-gray-600">
                {allErrors.length} {language === 'hu' ? 'hiba dokumentálva' : 'Fehler dokumentiert'}
                {' • '}
                {allErrors.filter(e => e.images?.length > 0).length} {language === 'hu' ? 'fotóval' : 'mit Fotos'}
              </p>
            </div>
            <Button
              onClick={() => setShowPreview(true)}
              variant="outline"
              className="border-otis-blue text-otis-blue hover:bg-otis-blue hover:text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              {language === 'hu' ? 'Előnézet' : 'Vorschau'}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={generatePDF}
              disabled={isGenerating}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isGenerating ? (language === 'hu' ? 'Generálás...' : 'Erstellen...') : 'PDF'}
            </Button>

            <Button
              onClick={generateExcel}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? (language === 'hu' ? 'Generálás...' : 'Erstellen...') : 'Excel'}
            </Button>

            <Button
              onClick={sendEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail className="h-4 w-4 mr-2" />
              {language === 'hu' ? 'Email' : 'E-Mail'}
            </Button>

            <Button
              onClick={printReport}
              variant="outline"
              className="border-gray-300"
            >
              <Printer className="h-4 w-4 mr-2" />
              {language === 'hu' ? 'Nyomtatás' : 'Drucken'}
            </Button>
          </div>

          {/* Quick Statistics */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {allErrors.filter(e => e.severity === 'critical').length}
              </div>
              <div className="text-sm text-red-600">{getSeverityText('critical')}</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {allErrors.filter(e => e.severity === 'medium').length}
              </div>
              <div className="text-sm text-yellow-600">{getSeverityText('medium')}</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {allErrors.filter(e => e.severity === 'low').length}
              </div>
              <div className="text-sm text-blue-600">{getSeverityText('low')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'hu' ? 'Hibalista Előnézet' : 'Fehlerliste Vorschau'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6" id="error-report-content">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-otis-blue mb-2">
                OTIS {language === 'hu' ? 'Hibalista' : 'Fehlerliste'}
              </h1>
              <div className="text-sm text-gray-600 space-y-1">
                {protocolData?.buildingAddress && (
                  <p><strong>{language === 'hu' ? 'Épület:' : 'Gebäude:'}</strong> {protocolData.buildingAddress}</p>
                )}
                {protocolData?.liftId && (
                  <p><strong>{language === 'hu' ? 'Lift ID:' : 'Aufzug ID:'}</strong> {protocolData.liftId}</p>
                )}
                {protocolData?.inspectorName && (
                  <p><strong>{language === 'hu' ? 'Ellenőr:' : 'Prüfer:'}</strong> {protocolData.inspectorName}</p>
                )}
                <p><strong>{language === 'hu' ? 'Dátum:' : 'Datum:'}</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Error List */}
            <div className="space-y-4">
              {allErrors.map((error, index) => (
                <Card key={error.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                        <Badge variant={getSeverityColor(error.severity)}>
                          {getSeverityText(error.severity)}
                        </Badge>
                      </div>
                      {error.images?.length > 0 && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Camera className="h-4 w-4 mr-1" />
                          {error.images.length} {language === 'hu' ? 'fotó' : 'Foto(s)'}
                        </div>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-gray-800 mb-2">{error.title}</h3>
                    <p className="text-gray-600 mb-3">{error.description}</p>
                    
                    {error.images?.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {error.images.map((image: string, imgIndex: number) => (
                          <div key={imgIndex} className="relative">
                            <img
                              src={image}
                              alt={`${language === 'hu' ? 'Hiba fotó' : 'Fehlerfoto'} ${imgIndex + 1}`}
                              className="w-full h-32 object-cover rounded border"
                            />
                            <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {imgIndex + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 border-t pt-4">
              <p>{language === 'hu' ? 'Generálva' : 'Erstellt'}: {new Date().toLocaleString()}</p>
              <p>OTIS APROD - {language === 'hu' ? 'Átvételi Protokoll Alkalmazás' : 'Abnahmeprotokoll Anwendung'}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}