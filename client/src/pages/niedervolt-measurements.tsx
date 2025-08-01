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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-12 bg-otis-blue rounded flex items-center justify-center mr-4">
                <span className="text-white font-bold text-sm">OTIS</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-800">
                  Niedervolt Installations Verordnung art.14
                </h1>
                <p className="text-sm text-gray-600">Mérési jegyzőkönyv - Excel sor 667+</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Mérési adatok táblázata
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={saveToStorage}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Mentés
                </Button>
                <Button
                  onClick={addNewRow}
                  className="flex items-center gap-2 bg-otis-blue hover:bg-otis-blue/90"
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
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[180px]">
                    Mérés típusa
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[200px]">
                    Leírás
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[100px]">
                    Érték 1
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[100px]">
                    Érték 2
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[100px]">
                    Érték 3
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[80px]">
                    Egység
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[150px]">
                    Megjegyzések
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-16">
                    Műveletek
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {measurements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Még nincs mérési adat. Kattints az "Új sor" gombra az első sor hozzáadásához.
                    </td>
                  </tr>
                ) : (
                  measurements.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Select
                          value={row.measurementType}
                          onValueChange={(value) => updateRow(row.id, 'measurementType', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Válassz típust..." />
                          </SelectTrigger>
                          <SelectContent>
                            {measurementTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.description}
                          onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                          placeholder="Mérés leírása..."
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.value1}
                          onChange={(e) => updateRow(row.id, 'value1', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.value2}
                          onChange={(e) => updateRow(row.id, 'value2', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.value3}
                          onChange={(e) => updateRow(row.id, 'value3', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.unit}
                          onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                          placeholder="Egység"
                          className="w-full text-center text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                          placeholder="Megjegyzések..."
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(row.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Összesen {measurements.length} mérési sor
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t.previous}
                </Button>
                <Button
                  onClick={onNext}
                  className="flex items-center gap-2 bg-otis-blue hover:bg-otis-blue/90"
                >
                  {t.next}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            ℹ️ Niedervolt Installations Verordnung art.14 információ
          </h3>
          <p className="text-sm text-blue-700">
            Ez a mérési jegyzőkönyv az OTIS Excel template 667. sorától kezdődő adatokat tartalmazza. 
            A mért értékek automatikusan bekerülnek a végső Excel dokumentumba a megfelelő cellákhoz.
            Támogatott mértékegységek: Volt, Ohm, Ampere, MOhm.
          </p>
        </div>
      </main>
    </div>
  );
}