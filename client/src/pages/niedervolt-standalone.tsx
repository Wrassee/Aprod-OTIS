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
              <span className="ml-4 text-white/80 text-sm">5/5</span>
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

        {/* Measurement Cards Grid */}
        <div className="space-y-6">
          {currentMeasurements.map((row, index) => (
            <Card key={row.id} className="shadow-lg border-l-4 border-l-otis-blue">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-800 mb-3">
                      Mérés #{index + 1}
                    </CardTitle>
                    <div className="w-full max-w-md">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mérés típusa
                      </label>
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
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRow(row.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Részletes leírás
                      </label>
                      <NativeStableInput
                        rowId={row.id}
                        field="description"
                        type="text"
                        initialValue={row.description}
                        onValueChange={handleNativeInputChange}
                        placeholder="Adja meg a mérés részletes leírását..."
                        className="w-full border-blue-200 focus:border-otis-blue focus:ring-otis-blue/20"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Megjegyzések
                      </label>
                      <NativeStableInput
                        rowId={row.id}
                        field="notes"
                        type="text"
                        initialValue={row.notes}
                        onValueChange={handleNativeInputChange}
                        placeholder="További megjegyzések, észrevételek..."
                        className="w-full border-orange-200 focus:border-orange-400 focus:ring-orange-200"
                      />
                    </div>
                  </div>
                  
                  {/* Right Column - Measurement Values */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Mérési értékek</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          1. érték
                        </label>
                        <NativeStableInput
                          rowId={row.id}
                          field="value1"
                          type="number"
                          initialValue={row.value1}
                          onValueChange={handleNativeInputChange}
                          placeholder="0.000"
                          className="w-full text-right font-mono text-lg border-green-200 focus:border-green-400 focus:ring-green-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          2. érték
                        </label>
                        <NativeStableInput
                          rowId={row.id}
                          field="value2"
                          type="number"
                          initialValue={row.value2}
                          onValueChange={handleNativeInputChange}
                          placeholder="0.000"
                          className="w-full text-right font-mono text-lg border-green-200 focus:border-green-400 focus:ring-green-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          3. érték
                        </label>
                        <NativeStableInput
                          rowId={row.id}
                          field="value3"
                          type="number"
                          initialValue={row.value3}
                          onValueChange={handleNativeInputChange}
                          placeholder="0.000"
                          className="w-full text-right font-mono text-lg border-green-200 focus:border-green-400 focus:ring-green-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Mértékegység
                        </label>
                        <NativeStableInput
                          rowId={row.id}
                          field="unit"
                          type="text"
                          initialValue={row.unit}
                          onValueChange={handleNativeInputChange}
                          placeholder="pl. MΩ, V, A"
                          className="w-full text-center font-medium border-purple-200 focus:border-purple-400 focus:ring-purple-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Add New Measurement Card */}
          <Card className="shadow-lg border-2 border-dashed border-otis-blue/30 hover:border-otis-blue/60 transition-colors">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-otis-blue/10 rounded-full flex items-center justify-center mx-auto">
                    <Plus className="w-8 h-8 text-otis-blue" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Új mérés hozzáadása
                </h3>
                <p className="text-gray-600 mb-4">
                  Kattintson ide egy új mérési sor létrehozásához
                </p>
                <Button onClick={addRow} className="bg-otis-blue hover:bg-otis-blue/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Mérés hozzáadása
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button variant="outline" onClick={onBack} className="flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.previous}
          </Button>
          
          <div className="text-sm text-gray-600">
            Niedervolt Installations Verordnung art.14 - Mérési jegyzőkönyv
          </div>
          
          <Button onClick={onNext} className="bg-otis-blue hover:bg-otis-blue/90">
            {t.next}
          </Button>
        </div>
      </div>
    </div>
  );
}