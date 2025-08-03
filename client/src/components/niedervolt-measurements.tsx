import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Zap, Calculator, Save, Check, Loader2 } from 'lucide-react';
import { StableInput } from './stable-input';
import { ErrorList } from './error-list';
import { ProtocolError } from '@shared/schema';

interface NiedervoltMeasurementsProps {
  onAddError: (error: Omit<ProtocolError, 'id'>) => void;
  language: 'hu' | 'de';
}

interface MeasurementRow {
  id: string;
  title: string;
  titleDe: string;
  unit: string;
  values: [string, string, string]; // L1, L2, L3 values
}

const MEASUREMENT_ROWS: MeasurementRow[] = [
  {
    id: 'm1',
    title: 'Isolationsmessung',
    titleDe: 'Isolationsmessung',
    unit: 'MΩ',
    values: ['', '', '']
  },
  {
    id: 'm2',
    title: 'Kurzschluss-strommessung',
    titleDe: 'Kurzschluss-strommessung',
    unit: 'A',
    values: ['', '', '']
  },
  {
    id: 'm3',
    title: 'Spannungsmessung',
    titleDe: 'Spannungsmessung',
    unit: 'V',
    values: ['', '', '']
  },
  {
    id: 'm4',
    title: 'Erdungswiderstand',
    titleDe: 'Erdungswiderstand',
    unit: 'Ω',
    values: ['', '', '']
  },
  {
    id: 'm5',
    title: 'Schleifenimpedanz',
    titleDe: 'Schleifenimpedanz',
    unit: 'Ω',
    values: ['', '', '']
  }
];

export function NiedervoltMeasurements({ onAddError, language }: NiedervoltMeasurementsProps) {
  const [measurements, setMeasurements] = useState<Record<string, [string, string, string]>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errors, setErrors] = useState<ProtocolError[]>([]);

  // Load saved measurements from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('niedervolt-measurements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMeasurements(parsed);
      } catch (e) {
        console.error('Failed to parse saved measurements:', e);
      }
    }
  }, []);

  // Save measurements to localStorage
  const saveMeasurements = async () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('niedervolt-measurements', JSON.stringify(measurements));
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save delay
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Failed to save measurements:', e);
      setSaveStatus('idle');
    }
  };

  const handleValueChange = (measurementId: string, index: number, value: string) => {
    setMeasurements(prev => {
      const currentValues = prev[measurementId] || ['', '', ''];
      const newValues: [string, string, string] = [...currentValues] as [string, string, string];
      newValues[index] = value;
      return {
        ...prev,
        [measurementId]: newValues
      };
    });
  };

  const handleAddError = (error: Omit<ProtocolError, 'id'>) => {
    const newError: ProtocolError = {
      ...error,
      id: Date.now().toString(),
    };
    setErrors(prev => [...prev, newError]);
    onAddError(error);
  };

  const handleEditError = (id: string, updatedError: Omit<ProtocolError, 'id'>) => {
    setErrors(prev =>
      prev.map(error =>
        error.id === id ? { ...updatedError, id } : error
      )
    );
  };

  const handleDeleteError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const t = {
    title: language === 'de' ? 'Niedervolt Installations Verordnung art.14' : 'Niedervolt Installations Verordnung art.14',
    subtitle: language === 'de' ? 'Elektrische Messungen und Prüfungen' : 'Elektrikai mérések és vizsgálatok',
    measurement: language === 'de' ? 'Messung' : 'Mérés',
    l1: 'L1',
    l2: 'L2', 
    l3: 'L3',
    unit: language === 'de' ? 'Einheit' : 'Egység',
    save: language === 'de' ? 'Speichern' : 'Mentés',
    saving: language === 'de' ? 'Speichert...' : 'Mentés...',
    saved: language === 'de' ? 'Gespeichert' : 'Mentve',
    totalMeasurements: language === 'de' ? 'Messungen insgesamt' : 'Összes mérés',
    completedValues: language === 'de' ? 'Ausgefüllte Werte' : 'Kitöltött értékek'
  };

  // Calculate statistics
  const totalValues = MEASUREMENT_ROWS.length * 3;
  const filledValues = Object.values(measurements).reduce((count, values) => {
    return count + values.filter(v => v && v.trim() !== '').length;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <BarChart className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">{t.totalMeasurements}</p>
                <p className="text-2xl font-bold text-blue-900">{MEASUREMENT_ROWS.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Check className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">{t.completedValues}</p>
                <p className="text-2xl font-bold text-green-900">{filledValues}/{totalValues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-800">Progress</p>
                <p className="text-2xl font-bold text-purple-900">
                  {Math.round((filledValues / totalValues) * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Measurements Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-6 w-6" />
            <span>{t.title}</span>
          </CardTitle>
          <p className="text-blue-100">{t.subtitle}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b">
                    {t.measurement}
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900 border-b">
                    {t.l1}
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900 border-b">
                    {t.l2}
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900 border-b">
                    {t.l3}
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900 border-b">
                    {t.unit}
                  </th>
                </tr>
              </thead>
              <tbody>
                {MEASUREMENT_ROWS.map((row, rowIndex) => (
                  <tr key={row.id} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-b">
                      {language === 'de' ? row.titleDe : row.title}
                    </td>
                    {[0, 1, 2].map((colIndex) => (
                      <td key={colIndex} className="px-4 py-4 border-b">
                        <StableInput
                          type="text"
                          placeholder="0.00"
                          value={measurements[row.id]?.[colIndex] || ''}
                          onChange={(value) => handleValueChange(row.id, colIndex, value)}
                          className="w-20 text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          inputMode="decimal"
                          pattern="[0-9]*[.,]?[0-9]*"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-4 text-center text-sm font-medium text-gray-600 border-b">
                      {row.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Save Button */}
          <div className="p-6 bg-gray-50 border-t">
            <Button
              onClick={saveMeasurements}
              disabled={saveStatus === 'saving'}
              className={`w-full transition-all duration-300 ${
                saveStatus === 'saved'
                  ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-100'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {saveStatus === 'saving' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saveStatus === 'saved' && <Check className="h-4 w-4 mr-2" />}
              {saveStatus === 'idle' && <Save className="h-4 w-4 mr-2" />}
              {saveStatus === 'saving' ? t.saving : saveStatus === 'saved' ? t.saved : t.save}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <ErrorList
        errors={errors}
        onAddError={handleAddError}
        onEditError={handleEditError}
        onDeleteError={handleDeleteError}
      />
    </div>
  );
}