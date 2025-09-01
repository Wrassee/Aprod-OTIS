// shared/types.ts
// --------------------------------------------------
// 1️⃣ Általános segédtypusok & enumok
// --------------------------------------------------
export type UUID = string;          // általános UUID alias
export type ISODateString = string; // ISO‑8601 dátum‑/idő string

/** Hibák súlyossága – egyezik a DB‑en definiált enum‑mal */
export const ErrorSeverityEnum = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type ErrorSeverity = typeof ErrorSeverityEnum[number];

/** Kérdés‑típusok – a `question_configs.type` oszlophoz */
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

/** Template‑típusok – a `templates.type` oszlophoz */
export const TemplateTypeEnum = [
  "protocol",
  "questions",
  "unified",
] as const;
export type TemplateType = typeof TemplateTypeEnum[number];

// --------------------------------------------------
// 2️⃣ Hibák és mérőeszközök
// --------------------------------------------------
export interface ErrorItem {
  /** Egyedi azonosító */
  id: UUID;

  /** Rövid leírás */
  description: string;

  /** Kategória (pl. “electrical”, “mechanical”) */
  category: string;

  /** Súlyosság – enum */
  severity: ErrorSeverity;

  /** Opcionális helyszíninformáció */
  location?: string;

  /** Kép URL (ha van) */
  imageUrl?: string;

  /** Egyéb megjegyzések */
  notes?: string;

  /** Létrehozás időpontja */
  createdAt: ISODateString;
}

/** Niedervolt‑mérőadat */
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

// --------------------------------------------------
// 3️⃣ Form‑adatok (Protocol beviteli struktúra)
// --------------------------------------------------
export interface FormData {
  /** Kérdés‑válasz párok – szabad JSON */
  answers: Record<string, unknown>;

  /** Dobozba érkezés dátuma (ISO‑8601) */
  receptionDate?: ISODateString;

  /** Nyelv (pl. “hu”, “de”) */
  language?: string;

  /** Aláírás (base64 vagy URL) – DB‑ben `signature` */
  signature?: string;

  /** Aláíró neve – DB‑ben `signature_name` */
  signatureName?: string;

  /** Protokoll befejezve? – DB‑ben `completed` */
  completed?: boolean;

  /** Hibák listája */
  errors?: ErrorItem[];

  /** Speciális mérési adatok */
  niedervoltMeasurements?: NiedervoltMeasurement[];
}

// --------------------------------------------------
// 4️⃣ Question konfiguráció (question_configs)
// --------------------------------------------------
export interface QuestionConfig {
  id: UUID;
  templateId: UUID;          // foreign key → templates.id
  questionId: string;        // kérdés egyedi azonosítója
  title: string;             // alapértelmezett cím
  titleHu?: string;          // magyar nyelvű cím
  titleDe?: string;          // német nyelvű cím
  type: QuestionType;        // enum‑alapú típus
  required: boolean;         // kötelező mező?
  placeholder?: string;
  cellReference?: string;
  sheetName?: string;        // pl. “Sheet1”
  multiCell?: boolean;       // több cella egy kérdéshez?
  groupName?: string;
  groupNameDe?: string;
  groupOrder?: number;       // sorrend a csoportban
  unit?: string;
  minValue?: number;
  maxValue?: number;
  calculationFormula?: string;
  /** ID‑k listája, amik a képletben szerepelnek (JSONB) */
  calculationInputs?: string[];
}

// --------------------------------------------------
// 5️⃣ Template‑definíció (templates)
// --------------------------------------------------
export interface Template {
  id: UUID;
  name: string;                     // emberi olvasható név
  type: TemplateType;               // enum‑alapú típus
  language: string;                 // pl. “multilingual”, “hu”, “de”
  fileName: string;                 // feltöltött fájl neve
  filePath: string;                 // teljes elérési út a storage‑ban
  uploadedAt: ISODateString;        // DB‑os `uploaded_at`
  isActive: boolean;                // látható / használható?
}

// --------------------------------------------------
// 6️⃣ Protokoll rekord (protocols)
// --------------------------------------------------
export interface Protocol {
  id: UUID;

  /** Form adatok, beleértve answers, errors, stb. */
  formData: FormData;

  /** Nyelvi beállítás – a `protocols.language` oszlop */
  language: string;

  /** Létrehozás időpontja */
  createdAt: ISODateString;

  /** Utolsó módosítás – szinkron a DB‑s `updated_at`‑al (ha van) */
  updatedAt?: ISODateString;
}