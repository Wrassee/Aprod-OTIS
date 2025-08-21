// Shared types for the OTIS APROD application

export interface FormData {
  answers: Record<string, any>;
  receptionDate?: string;
  language?: string;
  signatureName?: string;
  signatureData?: string;
  errors?: ErrorItem[];
  niedervoltMeasurements?: NiedervoltMeasurement[];
}

export interface ErrorItem {
  id: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  imageUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface NiedervoltMeasurement {
  id: string;
  measurementType: string;
  description: string;
  value1: string;
  value2: string;
  value3: string;
  unit: string;
  notes: string;
}

export interface QuestionConfig {
  id: string;
  templateId: string;
  questionId: string;
  title: string;
  titleHu?: string;
  titleDe?: string;
  type: 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'measurement' | 'calculated';
  required: boolean;
  placeholder?: string;
  cellReference?: string;
  sheetName?: string;
  multiCell?: boolean;
  groupName?: string;
  groupNameDe?: string;
  groupOrder?: number;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  calculationFormula?: string;
  calculationInputs?: string[];
}

export interface Template {
  id: string;
  name: string;
  type: 'protocol' | 'questions' | 'unified';
  language: string;
  fileName: string;
  filePath: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Protocol {
  id: string;
  formData: FormData;
  language: string;
  createdAt: string;
  updatedAt: string;
}