import { Button } from '@/components/ui/button';
import { useLanguageContext } from '@/components/language-provider';
import { ErrorExport } from '@/components/error-export';
import { ProtocolError } from '@shared/schema';
import { 
  CheckCircle, 
  Mail, 
  Cloud, 
  Download, 
  Eye, 
  Plus,
  Home,
  Settings
} from 'lucide-react';

interface CompletionProps {
  onEmailPDF: () => void;
  onSaveToCloud: () => void;
  onDownloadPDF: () => void;
  onDownloadExcel: () => void;
  onViewProtocol: () => void;
  onStartNew: () => void;
  onGoHome: () => void;
  onSettings: () => void;
  errors?: ProtocolError[];
  protocolData?: {
    buildingAddress?: string;
    liftId?: string;
    inspectorName?: string;
    inspectionDate?: string;
  };
}

export function Completion({
  onEmailPDF,
  onSaveToCloud,
  onDownloadPDF,
  onDownloadExcel,
  onViewProtocol,
  onStartNew,
  onGoHome,
  onSettings,
  errors = [],
  protocolData,
}: CompletionProps) {
  const { t } = useLanguageContext();

  return (
    <div className="min-h-screen bg-light-surface">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-12 bg-otis-blue rounded flex items-center justify-center mr-4">
                <span className="text-white font-bold text-sm">OTIS</span>
              </div>
              <span className="text-lg font-medium text-gray-800">{t.completionTitle}</span>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={onGoHome}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <Home className="h-4 w-4 mr-2" />
                {t.home}
              </Button>
              <Button
                onClick={onSettings}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t.settings || 'Beállítások'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Completion Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              {t.protocolComplete}
            </h2>
            <p className="text-gray-600">
              {t.completionMessage}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Email PDF */}
            <Button
              onClick={onEmailPDF}
              className="bg-otis-blue hover:bg-blue-700 text-white flex items-center justify-center py-4 h-auto"
            >
              <Mail className="h-5 w-5 mr-3" />
              {t.emailPDF}
            </Button>
            
            {/* Save to Cloud */}
            <Button
              onClick={onSaveToCloud}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center py-4 h-auto"
            >
              <Cloud className="h-5 w-5 mr-3" />
              {t.saveToCloud}
            </Button>
            
            {/* Download PDF */}
            <Button
              onClick={onDownloadPDF}
              className="bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center py-4 h-auto"
            >
              <Download className="h-5 w-5 mr-3" />
              {t.downloadPDF}
            </Button>
            
            {/* Download Excel */}
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDownloadExcel();
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center py-4 h-auto"
            >
              <Download className="h-5 w-5 mr-3" />
              {t.downloadExcel}
            </Button>
            
            {/* View Protocol */}
            <Button
              onClick={onViewProtocol}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center py-4 h-auto"
            >
              <Eye className="h-5 w-5 mr-3" />
              {t.viewProtocol}
            </Button>
          </div>
          
          {/* Start New Protocol */}
          <Button
            onClick={onStartNew}
            variant="outline"
            className="text-otis-blue border-2 border-otis-blue hover:bg-otis-light-blue px-8 py-3"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.startNew}
          </Button>
        </div>

        {/* Error Export Section - only show if there are errors */}
        {(errors.length > 0 || JSON.parse(localStorage.getItem('protocol-errors') || '[]').length > 0) && (
          <div className="mt-8">
            <ErrorExport 
              errors={errors.length > 0 ? errors : JSON.parse(localStorage.getItem('protocol-errors') || '[]')}
              protocolData={protocolData || {
                buildingAddress: '',
                liftId: '',
                inspectorName: '',
                inspectionDate: new Date().toISOString().split('T')[0]
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
