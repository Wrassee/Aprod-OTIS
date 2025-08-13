import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguageContext } from '@/components/language-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Save, Settings, Home, RotateCcw, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FIELD_LABELS, type NiedervoltMeasurement } from '@/types/niedervolt-devices';
import { useQuery } from '@tanstack/react-query';

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
  
  // Fetch devices and dropdown options from backend
  const { data: niedervoltData, isLoading: isLoadingDevices, error: deviceError } = useQuery({
    queryKey: ['/api/niedervolt/devices'],
    retry: 1,
  });
  const { toast } = useToast();
  
  // Save status states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load measurements from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('niedervolt-table-measurements');
    if (saved && Object.keys(measurements).length === 0) {
      try {
        const savedMeasurements = JSON.parse(saved);
        onMeasurementsChange(savedMeasurements);
      } catch (e) {
        console.error('Error loading saved measurements:', e);
      }
    }
  }, [measurements, onMeasurementsChange]);

  // Auto-save to localStorage whenever measurements change
  useEffect(() => {
    if (Object.keys(measurements).length > 0) {
      localStorage.setItem('niedervolt-table-measurements', JSON.stringify(measurements));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [measurements]);

  // Update specific measurement field
  const updateMeasurement = useCallback((deviceId: string, field: keyof NiedervoltMeasurement, value: string) => {
    // Convert "-" to empty string for internal storage
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

  // Get device name based on language
  const getDeviceName = (device: any) => {
    return language === 'hu' ? device.name?.hu : device.name?.de;
  };

  // Get field label based on language
  const getFieldLabel = (field: keyof typeof FIELD_LABELS) => {
    return language === 'hu' ? FIELD_LABELS[field].hu : FIELD_LABELS[field].de;
  };

  // Manual save function
  const handleManualSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('niedervolt-table-measurements', JSON.stringify(measurements));
      localStorage.setItem('niedervolt-reception-date', receptionDate);
      
      setSaveStatus('saved');
      toast({
        title: language === 'hu' ? "Mentve" : "Gespeichert",
        description: language === 'hu' ? "Mérési adatok sikeresen mentve" : "Messdaten erfolgreich gespeichert",
      });
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      toast({
        title: language === 'hu' ? "Hiba" : "Fehler",
        description: language === 'hu' ? "Mentés sikertelen" : "Speichern fehlgeschlagen",
        variant: "destructive",
      });
    }
  }, [measurements, receptionDate, language, toast]);

  const handleStartNew = useCallback(() => {
    localStorage.removeItem('niedervolt-table-measurements');
    localStorage.removeItem('niedervolt-reception-date');
    onMeasurementsChange({});
    onStartNew?.();
  }, [onMeasurementsChange, onStartNew]);

  // Calculate statistics
  const totalDevices = devices.length;
  const filledDevices = Object.keys(measurements).filter(deviceId => {
    const measurement = measurements[deviceId];
    return measurement && Object.values(measurement).some(value => value && value !== deviceId);
  }).length;
  const completionPercentage = totalDevices > 0 ? Math.round((filledDevices / totalDevices) * 100) : 0;

  // Show loading state while fetching devices
  if (isLoadingDevices) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {language === 'hu' ? 'Eszközök betöltése...' : 'Geräte werden geladen...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error state if devices failed to load
  if (deviceError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 dark:text-red-400 mb-4">
            {language === 'hu' ? 'Hiba az eszközök betöltésekor' : 'Fehler beim Laden der Geräte'}
          </p>
          <Button onClick={onBack} variant="outline">
            {language === 'hu' ? 'Vissza' : 'Zurück'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'hu' ? 'Niedervolt Mérések' : 'Niedervolt Messungen'}
              </h1>
              <span className="text-gray-500 dark:text-gray-400">
                {language === 'hu' ? 'Oldal 5/5' : 'Seite 5/5'}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {/* Save Button */}
              <Button
                onClick={handleManualSave}
                className={`transition-all duration-300 ${
                  saveStatus === 'saved' 
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600' 
                    : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
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

              {/* Settings */}
              <Button variant="outline" size="sm" onClick={onAdminAccess}>
                <Settings className="h-4 w-4" />
              </Button>

              {/* Home */}
              <Button variant="outline" size="sm" onClick={onHome}>
                <Home className="h-4 w-4" />
              </Button>

              {/* Start New */}
              <Button variant="outline" size="sm" onClick={handleStartNew}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Reception Date */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'hu' ? 'Mérés Dátuma' : 'Messdatum'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reception-date">
                  {language === 'hu' ? 'Átvétel dátuma' : 'Übernahmedatum'}
                </Label>
                <Input
                  id="reception-date"
                  type="date"
                  value={receptionDate}
                  onChange={(e) => onReceptionDateChange(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
            <CardTitle className="text-xl">
              {language === 'hu' ? 'Niedervolt Installációk Mérései' : 'Niedervolt Installations Messungen'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold">
                      {language === 'hu' ? 'Eszköz / Baugruppe' : 'Gerät / Baugruppe'}
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">
                      {getFieldLabel('nennstrom')}
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">
                      {getFieldLabel('sicherung')}
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">
                      {getFieldLabel('ls')}
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">
                      {getFieldLabel('merkmal')}
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">
                      {getFieldLabel('nPe')}
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">
                      {getFieldLabel('l1Pe')}
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">
                      {getFieldLabel('fiTest')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device: any) => {
                    const measurement = measurements[device.id] || { deviceId: device.id };
                    return (
                      <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="border border-gray-300 dark:border-gray-600 p-3 font-medium">
                          {getDeviceName(device)}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          <Input
                            type="text"
                            placeholder="Amper"
                            value={measurement.nennstrom || ''}
                            onChange={(e) => updateMeasurement(device.id, 'nennstrom', e.target.value)}
                            className="w-full text-center"
                          />
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          <Select
                            value={measurement.sicherung || '-'}
                            onValueChange={(value) => updateMeasurement(device.id, 'sicherung', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-">-</SelectItem>
                              {dropdownOptions.sicherung.map((option: string) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          <Select
                            value={measurement.ls || '-'}
                            onValueChange={(value) => updateMeasurement(device.id, 'ls', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-">-</SelectItem>
                              {dropdownOptions.ls.map((option: string) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          <Input
                            type="text"
                            placeholder="L-T-V.."
                            value={measurement.merkmal || ''}
                            onChange={(e) => updateMeasurement(device.id, 'merkmal', e.target.value)}
                            className="w-full text-center"
                          />
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          <Input
                            type="text"
                            placeholder="Ohm"
                            value={measurement.nPe || ''}
                            onChange={(e) => updateMeasurement(device.id, 'nPe', e.target.value)}
                            className="w-full text-center"
                          />
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          <Input
                            type="text"
                            placeholder="Ohm"
                            value={measurement.l1Pe || ''}
                            onChange={(e) => updateMeasurement(device.id, 'l1Pe', e.target.value)}
                            className="w-full text-center"
                          />
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          <Select
                            value={measurement.fiTest || '-'}
                            onValueChange={(value) => updateMeasurement(device.id, 'fiTest', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-">-</SelectItem>
                              {dropdownOptions.fiTest.map((option: string) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
          <Button variant="outline" onClick={onBack} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'hu' ? 'Vissza' : 'Zurück'}
          </Button>

          <Button onClick={onNext} className="flex items-center bg-blue-600 hover:bg-blue-700">
            {language === 'hu' ? 'Tovább az aláíráshoz' : 'Weiter zur Unterschrift'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}