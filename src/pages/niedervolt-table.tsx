import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useLanguageContext } from '@/components/language-provider';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Settings, 
  Home, 
  Check, 
  RotateCcw, 
  Plus,
  Trash2,
  Filter 
} from 'lucide-react';
import type { NiedervoltMeasurement } from '@/types/niedervolt-devices';

interface CustomDevice {
  id: string;
  name: { de: string; hu: string };
}

const FIELD_LABELS = {
  sicherung: { hu: 'Biztosíték (A)', de: 'Sicherung (A)' },
  ls: { hu: 'LS kapcsoló', de: 'LS-Schalter' },
  fiNennstrom: { hu: 'FI névleges áram (A)', de: 'FI Nennstrom (A)' },
  fiAusloesestrom: { hu: 'FI kioldó áram (mA)', de: 'FI Auslösestrom (mA)' },
  fiTest: { hu: 'FI teszt', de: 'FI Test' },
  fiIn: { hu: 'FI In (mA)', de: 'FI In (mA)' },
  fiDIn: { hu: 'FI DIn (ms)', de: 'FI DIn (ms)' }
};

interface NiedervoltTableProps {
  measurements: Record<string, NiedervoltMeasurement>;
  onMeasurementsChange: (measurements: Record<string, NiedervoltMeasurement>) => void;
  onBack: () => void;
  onNext: () => void;
  receptionDate: string;
  onReceptionDateChange: (date: string) => void;
  onAdminAccess?: () => void;
  onHome?: () => void;
  onStartNew?: () => void;
}

export function NiedervoltTable({
  measurements,
  onMeasurementsChange,
  onBack,
  onNext,
  receptionDate,
  onReceptionDateChange,
  onAdminAccess,
  onHome,
  onStartNew,
}: NiedervoltTableProps) {
  const { t, language } = useLanguageContext();
  const { toast } = useToast();
  
  // Fetch devices from backend
  const { data: niedervoltData, isLoading } = useQuery({
    queryKey: ['/api/niedervolt/devices'],
    retry: 1,
  });

  const devices = (niedervoltData as any)?.devices || [];
  const dropdownOptions = (niedervoltData as any)?.dropdownOptions || {
    sicherung: ['6A', '10A', '13A', '16A', '20A', '25A', '32A', '40A', '50A', '63A'],
    ls: ['B6', 'B10', 'B13', 'B16', 'B20', 'B25', 'B32', 'C6', 'C10', 'C13', 'C16', 'C20', 'C25', 'C32'],
    fiTest: ['OK', 'NOK']
  };

  // States
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [customDevices, setCustomDevices] = useState<CustomDevice[]>([]);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState({ de: '', hu: '' });

  // Separate initialization flag to prevent loops
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved data - only run once when devices are available
  useEffect(() => {
    if (devices.length > 0 && !isInitialized) {
      console.log('Initializing device data...');
      
      const savedMeasurements = localStorage.getItem('niedervolt-table-measurements');
      const savedDeviceSelection = localStorage.getItem('niedervolt-selected-devices');
      const savedCustomDevices = localStorage.getItem('niedervolt-custom-devices');
      
      if (savedMeasurements && Object.keys(measurements).length === 0) {
        try {
          onMeasurementsChange(JSON.parse(savedMeasurements));
        } catch (e) {
          console.error('Error loading measurements:', e);
        }
      }
      
      if (savedDeviceSelection) {
        try {
          const savedSet = new Set(JSON.parse(savedDeviceSelection));
          console.log('Loading saved device selection:', Array.from(savedSet));
          setSelectedDevices(savedSet);
        } catch (e) {
          console.log('Error loading saved selection, using default');
          setSelectedDevices(new Set(devices.map((d: any) => d.id)));
        }
      } else {
        console.log('No saved selection, selecting all devices');
        setSelectedDevices(new Set(devices.map((d: any) => d.id)));
      }
      
      if (savedCustomDevices) {
        try {
          setCustomDevices(JSON.parse(savedCustomDevices));
        } catch (e) {
          console.error('Error loading custom devices:', e);
        }
      }
      
      setIsInitialized(true);
    }
  }, [devices.length, isInitialized, measurements, onMeasurementsChange]);

  // Auto-save measurements
  useEffect(() => {
    if (Object.keys(measurements).length > 0) {
      localStorage.setItem('niedervolt-table-measurements', JSON.stringify(measurements));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [measurements]);

  // Save device states
  useEffect(() => {
    localStorage.setItem('niedervolt-selected-devices', JSON.stringify(Array.from(selectedDevices)));
  }, [selectedDevices]);

  useEffect(() => {
    localStorage.setItem('niedervolt-custom-devices', JSON.stringify(customDevices));
  }, [customDevices]);

  // Helper functions
  const getDeviceName = (device: any) => {
    if (device.name && typeof device.name === 'object') {
      return language === 'hu' ? device.name.hu : device.name.de;
    }
    return language === 'hu' ? device.nameHU : device.nameDE;
  };

  const updateMeasurement = useCallback((deviceId: string, field: keyof NiedervoltMeasurement, value: string) => {
    const cleanValue = value === "-" ? "" : value;
    onMeasurementsChange({
      ...measurements,
      [deviceId]: {
        ...measurements[deviceId],
        deviceId,
        [field]: cleanValue
      }
    });
  }, [measurements, onMeasurementsChange]);

  const getFieldLabel = (field: string) => {
    const labels = {
      nennstrom: { hu: 'Névleges áram (A)', de: 'Nennstrom (A)' },
      sicherung: { hu: 'Biztosíték', de: 'Sicherung' },
      ls: { hu: 'LS-kapcsoló', de: 'LS-Schalter' },
      merkmal: { hu: 'Típusjelzés', de: 'Merkmal' },
      fiTest: { hu: 'FI teszt', de: 'FI Test' },
      fiIn: { hu: 'FI In (mA)', de: 'FI In (mA)' },
      fiDin: { hu: 'FI DIn (ms)', de: 'FI DIn (ms)' }
    } as any;
    return language === 'hu' ? labels[field]?.hu || field : labels[field]?.de || field;
  };

  // Device management - simplified to prevent loops
  const toggleDeviceSelection = useCallback((deviceId: string, forceState?: boolean) => {
    console.log(`toggleDeviceSelection called for ${deviceId}, forceState: ${forceState}`);
    
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      const isCurrentlySelected = newSet.has(deviceId);
      
      // Determine target state
      const shouldBeSelected = forceState !== undefined ? forceState : !isCurrentlySelected;
      
      console.log(`Device ${deviceId}: currently ${isCurrentlySelected}, should be ${shouldBeSelected}`);
      
      if (shouldBeSelected && !isCurrentlySelected) {
        newSet.add(deviceId);
        console.log(`✓ Added device ${deviceId}`);
      } else if (!shouldBeSelected && isCurrentlySelected) {
        newSet.delete(deviceId);
        console.log(`✗ Removed device ${deviceId}`);
        
        // Remove measurements in separate effect to prevent loops
        setTimeout(() => {
          const newMeasurements = { ...measurements };
          if (newMeasurements[deviceId]) {
            delete newMeasurements[deviceId];
            console.log(`🗑️ Removed measurements for device ${deviceId}`);
            onMeasurementsChange(newMeasurements);
          }
        }, 0);
      }
      
      return newSet;
    });
  }, [measurements, onMeasurementsChange]);

  const addCustomDevice = () => {
    if (newDeviceName.de.trim() && newDeviceName.hu.trim()) {
      const id = `custom-${Date.now()}`;
      const device: CustomDevice = {
        id,
        name: { de: newDeviceName.de.trim(), hu: newDeviceName.hu.trim() }
      };
      setCustomDevices(prev => [...prev, device]);
      setSelectedDevices(prev => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
      setNewDeviceName({ de: '', hu: '' });
    }
  };

  const removeCustomDevice = (deviceId: string) => {
    setCustomDevices(prev => prev.filter(d => d.id !== deviceId));
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      newSet.delete(deviceId);
      return newSet;
    });
    const newMeasurements = { ...measurements };
    delete newMeasurements[deviceId];
    onMeasurementsChange(newMeasurements);
  };

  // Calculate stats
  const allDevices = [...devices, ...customDevices];
  const activeDevices = allDevices.filter(device => selectedDevices.has(device.id));
  const totalDevices = activeDevices.length;
  const filledDevices = Object.keys(measurements).filter(deviceId => {
    const measurement = measurements[deviceId];
    return measurement && selectedDevices.has(deviceId) && 
           Object.values(measurement).some(value => value && value !== deviceId);
  }).length;

  const handleManualSave = () => {
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">
            {language === 'hu' ? 'Eszközök betöltése...' : 'Geräte werden geladen...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-surface">
      {/* Header - matching questionnaire.tsx exactly */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side: Logo, Home and Title */}
            <div className="flex items-center">
              <img 
                src="/otis-elevators-seeklogo_1753525178175.png" 
                alt="OTIS Logo" 
                className="h-12 w-12 mr-4"
              />
              {onHome && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHome}
                  className="text-gray-600 hover:text-gray-800 mr-4"
                  title={language === 'de' ? 'Startseite' : 'Kezdőlap'}
                >
                  <Home className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center space-x-4">
                <span className="text-lg font-medium text-gray-800">
                  {language === 'hu' ? 'Niedervolt Installációk Mérései' : 'Niedervolt Installationen Messungen'}
                </span>
                <span className="text-sm text-gray-500">
                  {language === 'hu' ? 'Oldal 5/5' : 'Seite 5/5'}
                </span>
              </div>
            </div>
            
            {/* Right side: Date, Start New and Admin */}
            <div className="flex items-center space-x-4">
              <Label className="text-sm font-medium text-gray-600">
                {language === 'hu' ? 'Átvétel dátuma' : 'Übernahmedatum'}
              </Label>
              <Input
                type="date"
                value={receptionDate}
                onChange={(e) => onReceptionDateChange(e.target.value)}
                className="w-auto"
              />
              {onStartNew && (
                <Button
                  onClick={onStartNew}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center"
                  size="sm"
                  title={language === 'hu' ? 'Új protokoll indítása' : 'Neues Protokoll starten'}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {language === 'hu' ? 'Új protokoll' : 'Neues Protokoll'}
                </Button>
              )}
              {onAdminAccess && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAdminAccess}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">{language === 'hu' ? 'Összes Eszköz' : 'Gesamte Geräte'}</p>
                  <p className="text-3xl font-bold">{totalDevices}</p>
                </div>
                <Settings className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">{language === 'hu' ? 'Kitöltött' : 'Ausgefüllt'}</p>
                  <p className="text-3xl font-bold">{filledDevices}</p>
                </div>
                <Check className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">{language === 'hu' ? 'Kitöltöttség' : 'Fortschritt'}</p>
                  <p className="text-3xl font-bold">{Math.round((filledDevices / totalDevices) * 100)}%</p>
                </div>
                <ArrowRight className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Measurements Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {language === 'hu' ? 'Niedervolt Installációk Mérései' : 'Niedervolt Installations Messungen'}
              </CardTitle>
              
              {/* Device Selection Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDeviceSelector(true)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {language === 'hu' ? 'Eszközök' : 'Geräte'} ({activeDevices.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      {language === 'hu' ? 'Eszköz / Baugruppe' : 'Gerät / Baugruppe'}
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">
                      {getFieldLabel('sicherung')}
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">
                      {getFieldLabel('ls')}
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">
                      {getFieldLabel('nennstrom')}
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">
                      {getFieldLabel('merkmal')}
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">
                      {getFieldLabel('fiTest')}
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold text-blue-600">
                      {getFieldLabel('fiIn')}
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold text-blue-600">
                      {getFieldLabel('fiDin')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeDevices.map((device) => {
                    const measurement = measurements[device.id] || {};
                    return (
                      <tr key={device.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-3 font-medium">
                          {getDeviceName(device)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          <Select
                            value={measurement.sicherung || ''}
                            onValueChange={(value) => updateMeasurement(device.id, 'sicherung', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {dropdownOptions.sicherung.map((option: string) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="border border-gray-300 p-2">
                          <Select
                            value={measurement.ls || ''}
                            onValueChange={(value) => updateMeasurement(device.id, 'ls', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {dropdownOptions.ls.map((option: string) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="border border-gray-300 p-2">
                          <Input
                            type="text"
                            placeholder="-"
                            value={measurement.nennstrom || ''}
                            onChange={(e) => {
                              // Only allow numbers, decimals, and basic formatting
                              const value = e.target.value.replace(/[^0-9.,\-]/g, '');
                              updateMeasurement(device.id, 'nennstrom', value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const currentRow = e.currentTarget.closest('tr');
                                const currentCell = e.currentTarget.closest('td');
                                const nextCell = currentCell?.nextElementSibling;
                                const nextInput = nextCell?.querySelector('input, select') as HTMLInputElement;
                                
                                if (nextInput) {
                                  nextInput.focus();
                                  if (nextInput.tagName === 'INPUT') {
                                    nextInput.select();
                                  }
                                } else {
                                  // Move to next row's first input
                                  const nextRow = currentRow?.nextElementSibling as HTMLTableRowElement;
                                  if (nextRow) {
                                    const firstInput = nextRow.querySelector('input, select') as HTMLInputElement;
                                    if (firstInput) {
                                      firstInput.focus();
                                      if (firstInput.tagName === 'INPUT') {
                                        firstInput.select();
                                      }
                                    }
                                  }
                                }
                              }
                            }}
                            className="w-full text-center"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <Input
                            type="text"
                            placeholder="-"
                            value={measurement.merkmal || ''}
                            onChange={(e) => updateMeasurement(device.id, 'merkmal', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const currentRow = e.currentTarget.closest('tr');
                                const currentCell = e.currentTarget.closest('td');
                                const nextCell = currentCell?.nextElementSibling;
                                const nextInput = nextCell?.querySelector('input, select') as HTMLInputElement;
                                
                                if (nextInput) {
                                  nextInput.focus();
                                  if (nextInput.tagName === 'INPUT') {
                                    nextInput.select();
                                  }
                                } else {
                                  // Move to next row's first input
                                  const nextRow = currentRow?.nextElementSibling as HTMLTableRowElement;
                                  if (nextRow) {
                                    const firstInput = nextRow.querySelector('input, select') as HTMLInputElement;
                                    if (firstInput) {
                                      firstInput.focus();
                                      if (firstInput.tagName === 'INPUT') {
                                        firstInput.select();
                                      }
                                    }
                                  }
                                }
                              }
                            }}
                            className="w-full text-center"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <Select
                            value={measurement.fiTest || ''}
                            onValueChange={(value) => updateMeasurement(device.id, 'fiTest', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {dropdownOptions.fiTest.map((option: string) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="border border-gray-300 p-2">
                          <Input
                            type="text"
                            placeholder="-"
                            value={measurement.fiIn || ''}
                            onChange={(e) => {
                              // Only allow numbers, decimals, and basic formatting
                              const value = e.target.value.replace(/[^0-9.,\-]/g, '');
                              updateMeasurement(device.id, 'fiIn', value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const currentRow = e.currentTarget.closest('tr');
                                const currentCell = e.currentTarget.closest('td');
                                const nextCell = currentCell?.nextElementSibling;
                                const nextInput = nextCell?.querySelector('input, select') as HTMLInputElement;
                                
                                if (nextInput) {
                                  nextInput.focus();
                                  if (nextInput.tagName === 'INPUT') {
                                    nextInput.select();
                                  }
                                } else {
                                  // Move to next row's first input
                                  const nextRow = currentRow?.nextElementSibling as HTMLTableRowElement;
                                  if (nextRow) {
                                    const firstInput = nextRow.querySelector('input, select') as HTMLInputElement;
                                    if (firstInput) {
                                      firstInput.focus();
                                      if (firstInput.tagName === 'INPUT') {
                                        firstInput.select();
                                      }
                                    }
                                  }
                                }
                              }
                            }}
                            className="w-full text-center bg-blue-50"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <Input
                            type="text"
                            placeholder="-"
                            value={measurement.fiDin || ''}
                            onChange={(e) => {
                              // Only allow numbers, decimals, and basic formatting
                              const value = e.target.value.replace(/[^0-9.,\-]/g, '');
                              updateMeasurement(device.id, 'fiDin', value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Move to next row's first input
                                const currentRow = e.currentTarget.closest('tr');
                                const nextRow = currentRow?.nextElementSibling as HTMLTableRowElement;
                                if (nextRow) {
                                  const firstInput = nextRow.querySelector('input, select') as HTMLInputElement;
                                  if (firstInput) {
                                    firstInput.focus();
                                    if (firstInput.tagName === 'INPUT') {
                                      firstInput.select();
                                    }
                                  }
                                }
                              }
                            }}
                            className="w-full text-center bg-blue-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'hu' ? 'Előző' : 'Zurück'}
          </Button>

          <div className="flex items-center space-x-3">
            <Button
              onClick={handleManualSave}
              className={`transition-all duration-300 ${
                saveStatus === 'saved' 
                  ? 'bg-green-100 text-green-700 border-green-300' 
                  : 'bg-white hover:bg-gray-50'
              }`}
              variant="outline"
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              )}
              {saveStatus === 'saved' && <Check className="h-4 w-4 mr-2" />}
              {saveStatus !== 'saving' && saveStatus !== 'saved' && <Save className="h-4 w-4 mr-2" />}
              {saveStatus === 'saving' ? (language === 'hu' ? 'Mentés...' : 'Speichern...') :
               saveStatus === 'saved' ? (language === 'hu' ? 'Mentve' : 'Gespeichert') :
               (language === 'hu' ? 'Mentés' : 'Speichern')}
            </Button>

            <Button
              onClick={onNext}
              className="flex items-center"
            >
              {language === 'hu' ? 'Következő' : 'Weiter'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>

      {/* Device Selection Dialog */}
      <Dialog open={showDeviceSelector} onOpenChange={setShowDeviceSelector}>
        <DialogTrigger asChild>
          <div style={{ display: 'none' }} />
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'hu' ? 'Eszközök Kiválasztása' : 'Geräteauswahl'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Standard Devices */}
            <div>
              <h4 className="font-medium mb-3">
                {language === 'hu' ? 'Standard Eszközök' : 'Standard Geräte'}
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {devices.map((device: any) => (
                  <div key={device.id} className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={device.id}
                        checked={selectedDevices.has(device.id)}
                        onChange={(e) => {
                          console.log(`Standard device ${device.id} checked: ${e.target.checked}`);
                          toggleDeviceSelection(device.id, e.target.checked);
                        }}
                        className="h-4 w-4 rounded-full border border-input bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <Label htmlFor={device.id} className="flex-1 cursor-pointer">
                        {getDeviceName(device)}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Devices */}
            <div>
              <h4 className="font-medium mb-3">
                {language === 'hu' ? 'Egyedi Eszközök' : 'Individuelle Geräte'}
              </h4>
              
              {/* Add New Custom Device */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Input
                  placeholder={language === 'hu' ? 'Név (német)' : 'Name (Deutsch)'}
                  value={newDeviceName.de}
                  onChange={(e) => setNewDeviceName(prev => ({ ...prev, de: e.target.value }))}
                />
                <Input
                  placeholder={language === 'hu' ? 'Név (magyar)' : 'Name (Ungarisch)'}
                  value={newDeviceName.hu}
                  onChange={(e) => setNewDeviceName(prev => ({ ...prev, hu: e.target.value }))}
                />
                <Button
                  onClick={addCustomDevice}
                  disabled={!newDeviceName.de.trim() || !newDeviceName.hu.trim()}
                  className="col-span-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'hu' ? 'Hozzáadás' : 'Hinzufügen'}
                </Button>
              </div>

              {/* Custom Device List */}
              <div className="space-y-2">
                {customDevices.map((device) => (
                  <div key={device.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={device.id}
                      checked={selectedDevices.has(device.id)}
                      onChange={(e) => {
                        console.log(`Custom device ${device.id} checked: ${e.target.checked}`);
                        toggleDeviceSelection(device.id, e.target.checked);
                      }}
                      className="h-4 w-4 rounded-full border border-input bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <Label htmlFor={device.id} className="flex-1 cursor-pointer">
                      {getDeviceName(device)}
                    </Label>
                    <Button
                      onClick={() => removeCustomDevice(device.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeviceSelector(false)}>
              {language === 'hu' ? 'Mentés' : 'Speichern'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NiedervoltTable;