import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguageContext } from '@/components/language-provider';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { MeasurementRow } from '@/lib/types';

// Measurement types for the Niedervolt Installation Regulation
const MEASUREMENT_TYPES = {
  hu: [
    { id: 'isolation', name: 'Isolationsmessung', unit: 'Ohm' },
    { id: 'shortcircuit', name: 'Kurzschluss-strommessung', unit: 'Ampere' },
    { id: 'voltage', name: 'Spannungsmessung', unit: 'Volt' },
    { id: 'continuity', name: 'Durchgangsprüfung', unit: 'Ohm' },
    { id: 'insulation_resistance', name: 'Isolationswiderstand', unit: 'MOhm' },
    { id: 'earth_resistance', name: 'Erdungswiderstand', unit: 'Ohm' }
  ],
  de: [
    { id: 'isolation', name: 'Isolationsmessung', unit: 'Ohm' },
    { id: 'shortcircuit', name: 'Kurzschluss-strommessung', unit: 'Ampere' },
    { id: 'voltage', name: 'Spannungsmessung', unit: 'Volt' },
    { id: 'continuity', name: 'Durchgangsprüfung', unit: 'Ohm' },
    { id: 'insulation_resistance', name: 'Isolationswiderstand', unit: 'MOhm' },
    { id: 'earth_resistance', name: 'Erdungswiderstand', unit: 'Ohm' }
  ]
};

interface NiedervoltMeasurementsProps {
  measurements: MeasurementRow[];
  onMeasurementsChange: (measurements: MeasurementRow[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function NiedervoltMeasurements({
  measurements,
  onMeasurementsChange,
  onBack,
  onNext,
}: NiedervoltMeasurementsProps) {
  const { t, language } = useLanguageContext();
  const nextIdRef = useRef(Date.now());

  // Load measurements from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('niedervolt-measurements');
    if (saved && measurements.length === 0) {
      try {
        const savedMeasurements = JSON.parse(saved);
        onMeasurementsChange(savedMeasurements);
      } catch (e) {
        console.error('Error loading saved measurements:', e);
      }
    }
  }, [measurements.length, onMeasurementsChange]);

  // Get measurement types for current language
  const measurementTypes = MEASUREMENT_TYPES[language] || MEASUREMENT_TYPES.hu;

  const addNewRow = () => {
    const newRow: MeasurementRow = {
      id: `row-${nextIdRef.current++}`,
      measurementType: '',
      description: '',
      value1: '',
      value2: '',
      value3: '',
      unit: '',
      notes: ''
    };
    onMeasurementsChange([...measurements, newRow]);
  };

  const removeRow = (rowId: string) => {
    onMeasurementsChange(measurements.filter(row => row.id !== rowId));
  };

  const updateRow = (rowId: string, field: keyof MeasurementRow, value: string) => {
    onMeasurementsChange(measurements.map(row => {
      if (row.id === rowId) {
        const updatedRow = { ...row, [field]: value };
        
        // Auto-set unit when measurement type changes
        if (field === 'measurementType') {
          const selectedType = measurementTypes.find(type => type.id === value);
          if (selectedType) {
            updatedRow.unit = selectedType.unit;
          }
        }
        
        return updatedRow;
      }
      return row;
    }));
  };

  const saveToStorage = () => {
    localStorage.setItem('niedervolt-measurements', JSON.stringify(measurements));
    onMeasurementsChange(measurements); // Also update parent state
    console.log('Niedervolt measurements saved to localStorage');
  };

  return (
    <div className="min-h-screen bg-light-surface">
      {/* Header */}
      <header className="bg-gradient-to-r from-otis-blue via-blue-600 to-blue-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-12 w-16 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mr-6 border border-white/30">
                <span className="text-white font-bold text-lg">OTIS</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-sm">
                  Niedervolt Installations Verordnung art.14
                </h1>
                <p className="text-blue-100 mt-1 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-blue-200 rounded-full"></span>
                  Mérési jegyzőkönyv - Excel sor 667+
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Összes mérés</p>
                <p className="text-2xl font-bold text-blue-800">{measurements.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">📊</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Kitöltött értékek</p>
                <p className="text-2xl font-bold text-green-800">
                  {measurements.filter(m => m.value1 || m.value2 || m.value3).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Excel cellák</p>
                <p className="text-2xl font-bold text-purple-800">{667 + measurements.length - 1}</p>
              </div>
              <div className="h-12 w-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">📋</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-otis-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">📋</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Mérési adatok táblázata
                  </h2>
                  <p className="text-sm text-gray-600">Niedervolt mérések rögzítése</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={saveToStorage}
                  className="flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Save className="h-4 w-4" />
                  Mentés
                </Button>
                <Button
                  onClick={addNewRow}
                  className="flex items-center gap-2 bg-gradient-to-r from-otis-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  Új sor
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-blue-800 min-w-[180px] border-r border-blue-100">
                    🔧 Mérés típusa
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-blue-800 min-w-[200px] border-r border-blue-100">
                    📝 Leírás
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-blue-800 min-w-[100px] border-r border-blue-100">
                    📊 Érték 1
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-blue-800 min-w-[100px] border-r border-blue-100">
                    📊 Érték 2
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-blue-800 min-w-[100px] border-r border-blue-100">
                    📊 Érték 3
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-blue-800 min-w-[80px] border-r border-blue-100">
                    ⚡ Egység
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-blue-800 min-w-[150px] border-r border-blue-100">
                    💭 Megjegyzések
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-blue-800 w-16">
                    🎛️ Műveletek
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {measurements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📊</span>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Még nincs mérési adat</p>
                          <p className="text-gray-500 text-sm mt-1">Kattints az "Új sor" gombra az első mérés hozzáadásához</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  measurements.map((row, index) => (
                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors duration-200 border-l-4 border-transparent hover:border-l-otis-blue">
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <Select
                            value={row.measurementType}
                            onValueChange={(value) => updateRow(row.id, 'measurementType', value)}
                          >
                            <SelectTrigger className="w-full border-blue-200 focus:border-otis-blue focus:ring-otis-blue/20">
                              <SelectValue placeholder="Válassz típust..." />
                            </SelectTrigger>
                            <SelectContent>
                              {measurementTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  <span className="flex items-center gap-2">
                                    ⚡ {type.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <Input
                          value={row.description}
                          onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                          placeholder="Részletes mérés leírása..."
                          className="w-full border-blue-200 focus:border-otis-blue focus:ring-otis-blue/20"
                        />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <Input
                          type="number"
                          step="0.001"
                          value={row.value1}
                          onChange={(e) => updateRow(row.id, 'value1', e.target.value)}
                          placeholder="0.000"
                          className="w-full text-right font-mono border-green-200 focus:border-green-400 focus:ring-green-200"
                        />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <Input
                          type="number"
                          step="0.001"
                          value={row.value2}
                          onChange={(e) => updateRow(row.id, 'value2', e.target.value)}
                          placeholder="0.000"
                          className="w-full text-right font-mono border-green-200 focus:border-green-400 focus:ring-green-200"
                        />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <Input
                          type="number"
                          step="0.001"
                          value={row.value3}
                          onChange={(e) => updateRow(row.id, 'value3', e.target.value)}
                          placeholder="0.000"
                          className="w-full text-right font-mono border-green-200 focus:border-green-400 focus:ring-green-200"
                        />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <Input
                          value={row.unit}
                          onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                          placeholder="Egység"
                          className="w-full text-center text-sm font-medium border-purple-200 focus:border-purple-400 focus:ring-purple-200"
                        />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <Input
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                          placeholder="További megjegyzések..."
                          className="w-full border-orange-200 focus:border-orange-400 focus:ring-orange-200"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(row.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-5 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-gray-700">
                  📊 Összesen {measurements.length} mérési sor
                </div>
                {measurements.length > 0 && (
                  <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border">
                    Excel: {667}-{666 + measurements.length} sorok
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t.previous}
                </Button>
                <Button
                  onClick={onNext}
                  className="flex items-center gap-2 bg-gradient-to-r from-otis-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md"
                >
                  {t.next}
                  <span className="ml-1">→</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl">ℹ️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                Niedervolt Installations Verordnung art.14 információ
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">📋</span>
                  <div>
                    <strong>Excel integráció:</strong> A mérések az OTIS template 667. sorától kerülnek be automatikusan
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">⚡</span>
                  <div>
                    <strong>Támogatott egységek:</strong> Volt, Ohm, Ampere, MOhm
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">💾</span>
                  <div>
                    <strong>Automatikus mentés:</strong> LocalStorage + Excel exportálás
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">🔧</span>
                  <div>
                    <strong>Mérési típusok:</strong> 6 különböző elektromos mérés típus
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}