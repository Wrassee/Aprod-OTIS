import { Button } from '@/components/ui/button';
import { useLanguageContext } from '@/components/language-provider';
import { Plus, RotateCcw } from 'lucide-react';

interface StartScreenProps {
  onLanguageSelect: (language: 'hu' | 'de') => void;
  onStartNew?: () => void;
}

export function StartScreen({ onLanguageSelect, onStartNew }: StartScreenProps) {
  const { t } = useLanguageContext();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      {/* New Protocol Button - Top right corner */}
      {onStartNew && (
        <div className="absolute top-6 right-6">
          <Button
            onClick={onStartNew}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center px-6 py-3"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t.startNew || 'Új protokoll indítása'}
          </Button>
        </div>
      )}
      
      {/* OTIS Logo */}
      <div className="mb-3">
        <img 
          src="/otis-elevators-seeklogo_1753525178175.png" 
          alt="OTIS Logo" 
          className="h-48 w-48"
        />
      </div>
      
      {/* Slogan */}
      <h1 className="text-6xl md:text-7xl font-light text-gray-700 mb-16 text-center tracking-wide leading-relaxed">
        <span className="font-extralight text-gray-600 uppercase text-xl md:text-2xl tracking-widest">
          {t.slogan}<sup className="text-xs ml-1">™</sup>
        </span>
      </h1>
      
      {/* Language Selection */}
      <div className="flex space-x-8">
        {/* Hungarian Flag */}
        <Button
          variant="outline"
          className="flex flex-col items-center p-6 h-auto border-2 border-gray-200 hover:border-otis-blue hover:bg-otis-light-blue transition-all duration-200 transform hover:scale-105"
          onClick={() => onLanguageSelect('hu')}
        >
          <div className="w-20 h-14 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/3 bg-red-500"></div>
            <div className="absolute top-1/3 left-0 w-full h-1/3 bg-white"></div>
            <div className="absolute top-2/3 left-0 w-full h-1/3 bg-green-500"></div>
          </div>
          <span className="text-lg font-medium text-gray-700">{t.hungarian}</span>
        </Button>
        
        {/* German Flag */}
        <Button
          variant="outline"
          className="flex flex-col items-center p-6 h-auto border-2 border-gray-200 hover:border-otis-blue hover:bg-otis-light-blue transition-all duration-200 transform hover:scale-105"
          onClick={() => onLanguageSelect('de')}
        >
          <div className="w-20 h-14 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/3 bg-black"></div>
            <div className="absolute top-1/3 left-0 w-full h-1/3 bg-red-500"></div>
            <div className="absolute top-2/3 left-0 w-full h-1/3 bg-yellow-400"></div>
          </div>
          <span className="text-lg font-medium text-gray-700">{t.german}</span>
        </Button>
      </div>
      
      {/* Additional info for new protocol */}
      {onStartNew && (
        <div className="mt-12 text-center text-gray-600">
          <p className="text-sm">
            {t.hungarian === 'Magyar' ? 
              'Válasszon nyelvet új protokoll indításához, vagy kattintson az "Új protokoll indítása" gombra a jelenlegi beállítások tisztításához.' :
              'Wählen Sie eine Sprache für ein neues Protokoll oder klicken Sie auf "Neues Protokoll starten", um die aktuellen Einstellungen zu löschen.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
