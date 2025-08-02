import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguageContext } from '@/components/language-provider';
import { ArrowLeft, Plus, Trash2, Save, Settings, Home, RotateCcw } from 'lucide-react';
import { MeasurementRow } from '@/lib/types';
import { NativeStableInput } from '@/components/native-stable-input';
import { QuestionGroupHeader } from '@/components/question-group-header';

// Measurement types for the Niedervolt Installation Regulation
const measurementTypes = [
  { id: 'isolationsmessung', name: 'Isolationsmessung', unit: 'MΩ' },
  { id: 'kurzschlussstrom', name: 'Kurzschluss-strommessung', unit: 'A' },
  { id: 'spannungsmessung', name: 'Spannungsmessung', unit: 'V' },
  { id: 'erdschlussstrom', name: 'Erdschlussstrom-messung', unit: 'A' },
  { id: 'leistungsmessung', name: 'Leistungsmessung', unit: 'W' },
  { id: 'frequenzmessung', name: 'Frequenzmessung', unit: 'Hz' },
];

interface NiedervoltStandaloneProps {
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  onHome: () => void;
  onAdminAccess: () => void;
  measurements: MeasurementRow[];
  onMeasurementsChange: (measurements: MeasurementRow[]) => void;
}

// Global static storage to completely bypass React state management
const standaloneStorage = {
  measurements: new Map<string, MeasurementRow>(),
  lastUpdate: 0,
};

export function NiedervoltStandalone({
  onBack,
  onNext,
  onSave,
  onHome,
  onAdminAccess,
  measurements,
  onMeasurementsChange
}: NiedervoltStandaloneProps) {
  const { t } = useLanguageContext();
  const [currentMeasurements, setCurrentMeasurements] = useState<MeasurementRow[]>([]);
  const initializeRef = useRef(false);
  
  // Initialize from props only once
  useEffect(() => {
    if (!initializeRef.current && Array.isArray(measurements)) {
      standaloneStorage.measurements.clear();
      measurements.forEach(measurement => {
        standaloneStorage.measurements.set(measurement.id, { ...measurement });
      });
      setCurrentMeasurements([...measurements]);
      initializeRef.current = true;
    }
  }, [measurements]);

  // Native update handler that works directly with storage
  const handleNativeInputChange = useCallback((rowId: string, field: string, value: string) => {
    const existingRow = standaloneStorage.measurements.get(rowId);
    if (existingRow) {
      const updatedRow = { ...existingRow, [field]: value };
      
      // Auto-set unit when measurement type changes
      if (field === 'measurementType') {
        const selectedType = measurementTypes.find(type => type.id === value);
        if (selectedType) {
          updatedRow.unit = selectedType.unit;
        }
      }
      
      standaloneStorage.measurements.set(rowId, updatedRow);
      standaloneStorage.lastUpdate = Date.now();
      
      // Update parent with minimal React involvement
      const updatedMeasurements = Array.from(standaloneStorage.measurements.values());
      setCurrentMeasurements([...updatedMeasurements]);
      onMeasurementsChange(updatedMeasurements);
    }
  }, [onMeasurementsChange]);

  const addRow = () => {
    const newRow: MeasurementRow = {
      id: `measure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      measurementType: '',
      description: '',
      value1: '',
      value2: '',
      value3: '',
      unit: '',
      notes: ''
    };
    
    standaloneStorage.measurements.set(newRow.id, newRow);
    const updatedMeasurements = Array.from(standaloneStorage.measurements.values());
    setCurrentMeasurements([...updatedMeasurements]);
    onMeasurementsChange(updatedMeasurements);
  };

  const deleteRow = (rowId: string) => {
    standaloneStorage.measurements.delete(rowId);
    const updatedMeasurements = Array.from(standaloneStorage.measurements.values());
    setCurrentMeasurements([...updatedMeasurements]);
    onMeasurementsChange(updatedMeasurements);
  };

  const handleSelectChange = (rowId: string, value: string) => {
    const existingRow = standaloneStorage.measurements.get(rowId);
    if (existingRow) {
      const selectedType = measurementTypes.find(type => type.id === value);
      const updatedRow = { 
        ...existingRow, 
        measurementType: value,
        unit: selectedType ? selectedType.unit : ''
      };
      
      standaloneStorage.measurements.set(rowId, updatedRow);
      const updatedMeasurements = Array.from(standaloneStorage.measurements.values());
      setCurrentMeasurements([...updatedMeasurements]);
      onMeasurementsChange(updatedMeasurements);
    }
  };

  // Statistics calculations
  const stats = useMemo(() => {
    const totalMeasurements = currentMeasurements.length;
    const filledValues = currentMeasurements.reduce((count, row) => {
      return count + [row.value1, row.value2, row.value3].filter(val => val && val.toString().trim() !== '').length;
    }, 0);
    const excelRows = Math.max(totalMeasurements, 10); // Minimum 10 rows for template

    return { totalMeasurements, filledValues, excelRows };
  }, [currentMeasurements]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-otis-red shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">OTIS APROD</h1>
              <span className="ml-4 text-white/80 text-sm">Niedervolt Installations Verordnung art.14</span>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={onSave} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Save className="w-4 h-4 mr-1" />
                {t.save}
              </Button>
              <Button variant="outline" size="sm" onClick={onAdminAccess} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Settings className="w-4 h-4 mr-1" />
                Admin
              </Button>
              <Button variant="outline" size="sm" onClick={onHome} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Home className="w-4 h-4 mr-1" />
                {t.back}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Group Header */}
        <QuestionGroupHeader
          groupName="Niedervolt Installations Verordnung art.14"
          currentPage={5}
          totalPages={5}
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Mérések száma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalMeasurements}</div>
              <p className="text-blue-100 text-sm">összesen rögzítve</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Kitöltött értékek</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.filledValues}</div>
              <p className="text-green-100 text-sm">mérési eredmény</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Excel sorok</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.excelRows}</div>
              <p className="text-purple-100 text-sm">template sorokban</p>
            </CardContent>
          </Card>
        </div>

        {/* Measurement Table */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl text-gray-800">Mérési adatok táblázat</CardTitle>
              <Button onClick={addRow} className="bg-otis-blue hover:bg-otis-blue/90">
                <Plus className="w-4 h-4 mr-2" />
                Új mérés hozzáadása
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-48">Mérés típusa</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Leírás</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-32">1. érték</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-32">2. érték</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-32">3. érték</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-24">Egység</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Megjegyzések</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-16">Művelet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentMeasurements.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="w-full">
                          <Select value={row.measurementType} onValueChange={(value) => handleSelectChange(row.id, value)}>
                            <SelectTrigger className="w-full border-blue-200 focus:border-otis-blue focus:ring-otis-blue/20">
                              <SelectValue placeholder="Válasszon mérés típust" />
                            </SelectTrigger>
                            <SelectContent>
                              {measurementTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <NativeStableInput
                          rowId={row.id}
                          field="description"
                          type="text"
                          initialValue={row.description}
                          onValueChange={handleNativeInputChange}
                          placeholder="Részletes mérés leírása..."
                          className="w-full border-blue-200 focus:border-otis-blue focus:ring-otis-blue/20"
                        />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <NativeStableInput
                          rowId={row.id}
                          field="value1"
                          type="number"
                          initialValue={row.value1}
                          onValueChange={handleNativeInputChange}
                          placeholder="0.000"
                          className="w-full text-right font-mono border-green-200 focus:border-green-400 focus:ring-green-200"
                        />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <NativeStableInput
                          rowId={row.id}
                          field="value2"
                          type="number"
                          initialValue={row.value2}
                          onValueChange={handleNativeInputChange}
                          placeholder="0.000"
                          className="w-full text-right font-mono border-green-200 focus:border-green-400 focus:ring-green-200"
                        />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <NativeStableInput
                          rowId={row.id}
                          field="value3"
                          type="number"
                          initialValue={row.value3}
                          onValueChange={handleNativeInputChange}
                          placeholder="0.000"
                          className="w-full text-right font-mono border-green-200 focus:border-green-400 focus:ring-green-200"
                        />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <NativeStableInput
                          rowId={row.id}
                          field="unit"
                          type="text"
                          initialValue={row.unit}
                          onValueChange={handleNativeInputChange}
                          placeholder="Egység"
                          className="w-full text-center text-sm font-medium border-purple-200 focus:border-purple-400 focus:ring-purple-200"
                        />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <NativeStableInput
                          rowId={row.id}
                          field="notes"
                          type="text"
                          initialValue={row.notes}
                          onValueChange={handleNativeInputChange}
                          placeholder="További megjegyzések..."
                          className="w-full border-orange-200 focus:border-orange-400 focus:ring-orange-200"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRow(row.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {currentMeasurements.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                <p className="text-lg mb-4">Még nincsenek mérési adatok</p>
                <Button onClick={addRow} className="bg-otis-blue hover:bg-otis-blue/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Első mérés hozzáadása
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button variant="outline" onClick={onBack} className="flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.previous}
          </Button>
          
          <div className="text-sm text-gray-600">
            Oldal 5/5 - Niedervolt mérések
          </div>
          
          <Button onClick={onNext} className="bg-otis-blue hover:bg-otis-blue/90">
            {t.next}
          </Button>
        </div>
      </div>
    </div>
  );
}