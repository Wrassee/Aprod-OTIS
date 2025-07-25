import { Question, AnswerValue, ProtocolError, ErrorSeverity } from "@shared/schema";

export interface FormData {
  receptionDate: string;
  answers: Record<string, AnswerValue>;
  errors: ProtocolError[];
  signature?: string;
  signatureName?: string;
}

export interface QuestionPage {
  title: string;
  questions: Question[];
}

export interface AppState {
  currentScreen: 'start' | 'questionnaire' | 'signature' | 'completion';
  language: 'hu' | 'de';
  currentPage: number;
  totalPages: number;
  formData: FormData;
  isSubmitting: boolean;
}

export interface ImageUpload {
  file: File;
  preview: string;
  uploaded?: boolean;
}
