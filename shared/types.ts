// shared/types.ts
// ------------------------------------------------------------
// 1️⃣ General‑purpose types & enums
// ------------------------------------------------------------

/**
 * Plain string alias for UUID values.
 *
 * Using a dedicated alias makes the intent of the field explicit
 * while keeping the runtime type unchanged (still `string`).
 */
export type UUID = string;

/**
 * ISO‑8601 formatted date‑time string.
 *
 * All timestamps coming from the database (`timestamp with time zone`)
 * are represented with this type.
 */
export type ISODateString = string;

/**
 * Severity levels for `ErrorItem.severity`.
 *
 * The literal tuple is exported as a **const** so that TypeScript can
 * infer a union type (`"low" | "medium" | "high" | "critical"`).
 */
export const ErrorSeverityEnum = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type ErrorSeverity = typeof ErrorSeverityEnum[number];

/**
 * Question types for `QuestionConfig.type`.
 */
export const QuestionTypeEnum = [
  "text",
  "number",
  "date",
  "select",
  "radio",
  "checkbox",
  "measurement",
  "calculated",
] as const;
export type QuestionType = typeof QuestionTypeEnum[number];

/**
 * Cell value types for Excel parsing - includes all possible cell types
 * used in the excel-parser service.
 */
export const CellValueTypeEnum = [
  "text",
  "number", 
  "date",
  "select",
  "checkbox",
  "yes_no",      // új
  "true_false",  // új
  "measurement", // új
  "calculated",  // új
] as const;
export type CellValueType = typeof CellValueTypeEnum[number] | null;

/**
 * Template categories for `Template.type`.
 */
export const TemplateTypeEnum = [
  "protocol",
  "questions",
  "unified",
] as const;
export type TemplateType = typeof TemplateTypeEnum[number];

// ------------------------------------------------------------
// 2️⃣ Errors & measurement data
// ------------------------------------------------------------

/**
 * Single error record – mirrors the `errors` table.
 */
export interface ErrorItem {
  /** Primary key */
  id: UUID;

  /** Short description */
  description: string;

  /** Category – e.g. "electrical", "mechanical" */
  category: string;

  /** Severity – restricted to the `ErrorSeverity` enum */
  severity: ErrorSeverity;

  /** Optional location information */
  location?: string;

  /** Optional image URL */
  imageUrl?: string;

  /** Free‑form notes */
  notes?: string;

  /** Creation timestamp */
  createdAt: ISODateString;
}

/**
 * Niedervolt‑measurement record – mirrors the `niedervolt_measurements` table.
 */
export interface NiedervoltMeasurement {
  id: UUID;
  measurementType: string;
  description: string;
  value1: string;
  value2: string;
  value3: string;
  unit: string;
  notes: string;
}

// ------------------------------------------------------------
// 3️⃣ Form data (the JSON payload stored in `protocols.form_data`)
// ------------------------------------------------------------

export interface FormData {
  /** Arbitrary question‑answer map */
  answers: Record<string, unknown>;

  /** Optional reception date (ISO‑8601) */
  receptionDate?: ISODateString;

  /** Language code – e.g. "hu", "de" */
  language?: string;

  /** Base64 or URL representation of the signature */
  signature?: string;

  /** Human‑readable name of the signer */
  signatureName?: string;

  /** Flag indicating whether the protocol is completed */
  completed?: boolean;

  /** List of errors attached to the form */
  errors?: ErrorItem[];

  /** Optional list of low‑voltage measurements */
  niedervoltMeasurements?: NiedervoltMeasurement[];
}

// ------------------------------------------------------------
// 4️⃣ Question configuration (table `question_configs`)
// ------------------------------------------------------------

export interface QuestionConfig {
  id: UUID;
  /** FK → `templates.id` */
  templateId: UUID;
  /** Unique identifier of the question inside the template */
  questionId: string;
  /** Default title (fallback language) */
  title: string;
  /** Hungarian title */
  titleHu?: string;
  /** German title */
  titleDe?: string;
  /** Question type – limited to `QuestionType` */
  type: QuestionType;
  /** Whether the field is mandatory */
  required: boolean;
  /** Placeholder text shown in the UI */
  placeholder?: string;
  /** Optional Excel‑style cell reference (e.g. "A1") */
  cellReference?: string;
  /** Optional sheet name */
  sheetName?: string;
  /** If the question spans multiple cells */
  multiCell?: boolean;
  /** Logical grouping name */
  groupName?: string;
  /** Group name in German */
  groupNameDe?: string;
  /** Order of the group */
  groupOrder?: number;
  /** Unit label (e.g. "mm", "kg") */
  unit?: string;
  /** Minimum numeric value (if applicable) */
  minValue?: number;
  /** Maximum numeric value (if applicable) */
  maxValue?: number;
  /** Formula used for calculated fields */
  calculationFormula?: string;
  /** List of question IDs that feed the formula (stored as JSONB) */
  calculationInputs?: string[];
}

// ------------------------------------------------------------
// 5️⃣ Template definition (table `templates`)
// ------------------------------------------------------------

export interface Template {
  id: UUID;
  /** Human‑readable name */
  name: string;
  /** Category – limited to `TemplateType` */
  type: TemplateType;
  /** Language of the stored file – "multilingual", "hu", "de", … */
  language: string;
  /** Original filename */
  fileName: string;
  /** Full storage path (e.g. "templates/xyz.xlsx") */
  filePath: string;
  /** Upload timestamp */
  uploadedAt: ISODateString;
  /** Whether the template is currently active */
  isActive: boolean;
}

// ------------------------------------------------------------
// 6️⃣ Protocol record (table `protocols`)
// ------------------------------------------------------------

export interface Protocol {
  id: UUID;

  /** JSONB column that contains the entire `FormData` payload */
  formData: FormData;

  /** Language code – mirrors the column `language` */
  language: string;

  /** Record creation timestamp */
  createdAt: ISODateString;

  /** Timestamp of the last update (optional, maps to `updated_at`) */
  updatedAt?: ISODateString;
}

// ------------------------------------------------------------
// 7️⃣ XML Excel parsing types
// ------------------------------------------------------------

/**
 * Payload for XML Excel processing
 */
export interface XmlExcelPayload {
  templateId: UUID;
  fileName: string;
  filePath: string;
  language: string;
}

/**
 * Parsed row data from Excel processing
 */
export interface ParsedRow {
  questionId: string;
  value: unknown;
  cellReference?: string;
  sheetName?: string;
}