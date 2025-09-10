export interface Translation {
  // Start Screen
  slogan: string;
  hungarian: string;
  german: string;
  
  // Header
  title: string;
  receptionDate: string;
  progress: string;
  
  // Navigation
  previous: string;
  next: string;
  save: string;
  saved: string;
  saving: string;
  autoSaved: string;
  back: string;
  complete: string;
  startNew: string;
  
  // Answers
  yes: string;
  no: string;
  notApplicable: string;
  
  // Error List
  errorList: string;
  addError: string;
  noErrors: string;
  editError: string;
  deleteError: string;
  errorRegistrationRequired: string;
  
  // Error Modal
  addErrorTitle: string;
  severity: string;
  critical: string;
  medium: string;
  low: string;
  errorTitle: string;
  errorDescription: string;
  attachPhotos: string;
  uploadPhotos: string;
  selectFiles: string;
  cancel: string;
  saveError: string;
  
  // Signature
  signatureTitle: string;
  signatureInstruction: string;
  signaturePrompt: string;
  clear: string;
  printedName: string;
  signatureDate: string;
  
  // Completion
  completionTitle: string;
  protocolComplete: string;
  completionMessage: string;
  emailPDF: string;
  saveToCloud: string;
  downloadPDF: string;
  downloadExcel: string;
  viewProtocol: string;
  home: string;
  
  // Validation
  requiredField: string;
  invalidEmail: string;
  
  // Common
  loading: string;
  error: string;
  
  // Measurement and calculation components
  measurementData: string;
  calculatedValues: string;
  calculatedValuesValidated: string;
  outOfRange: string;
  errorRecordingRequired: string;
  success: string;
  
  // Admin Interface
  admin: string;
  settings: string;
  templates: string;
  uploadTemplate: string;
  templateName: string;
  templateType: string;
  questionsTemplate: string;
  protocolTemplate: string;
  activate: string;
  active: string;
  inactive: string;
  upload: string;
  preview: string;
  configure: string;
  cellReference: string;
  sheetName: string;
  questionConfiguration: string;
  uploadExcelFile: string;
  selectExcelFile: string;
  
  // Page specific translations
  generalData: string;
  machineRoom: string;
  modernizationAffected: string;
  questionsInGroup: string;
  groupOf: string;
  viewErrors: string;
  downloadErrorList: string;
}

export const translations: Record<string, Translation> = {
  hu: {
    // Start Screen
    slogan: "Made to move you",
    hungarian: "Magyar",
    german: "Deutsch",
    
    // Header
    title: "OTIS APROD - Átvételi Protokoll",
    receptionDate: "Átvételi dátum:",
    progress: "Folyamat",
    
    // Navigation
    previous: "Előző",
    next: "Következő",
    save: "Mentés",
    saved: "Mentve",
    saving: "Mentés...",
    autoSaved: "Automatikusan mentve",
    back: "Vissza",
    complete: "Protokoll befejezése",
    startNew: "Új protokoll indítása",
    
    // Answers
    yes: "Igen",
    no: "Nem",
    notApplicable: "Nem alkalmazható",
    
    // Error List
    errorList: "Hibalista",
    addError: "Hiba hozzáadása",
    noErrors: "Nincs jelentett hiba",
    editError: "Szerkesztés",
    deleteError: "Törlés",
    errorRegistrationRequired: "Hiba rögzítése szükséges",
    
    // Error Modal
    addErrorTitle: "Új hiba hozzáadása",
    severity: "Súlyossági szint",
    critical: "Kritikus",
    medium: "Közepes",
    low: "Alacsony",
    errorTitle: "Hiba címe",
    errorDescription: "Részletes leírás",
    attachPhotos: "Fotók csatolása",
    uploadPhotos: "Kattintson a fotók feltöltéséhez vagy húzza ide",
    selectFiles: "Fájlok kiválasztása",
    cancel: "Mégse",
    saveError: "Hiba mentése",
    
    // Signature
    signatureTitle: "Digitális aláírás",
    signatureInstruction: "Kérjük, adja meg az aláírását",
    signaturePrompt: "Írjon alá itt ujjával vagy stylus-szal",
    clear: "Törlés",
    printedName: "Nyomtatott név (opcionális)",
    signatureDate: "Aláírás dátuma: ",
    
    // Completion
    completionTitle: "Protokoll befejezve",
    protocolComplete: "Protokoll sikeresen befejezve",
    completionMessage: "Az átvételi protokoll elkészült és készen áll a terjesztésre.",
    emailPDF: "PDF küldése e-mailben",
    saveToCloud: "Mentés Google Drive-ra",
    downloadPDF: "PDF letöltése",
    downloadExcel: "Excel letöltése",
    viewProtocol: "Protokoll előnézete",
    home: "Kezdőlap",
    
    // Validation
    requiredField: "Ez a mező kötelező",
    invalidEmail: "Érvénytelen e-mail cím",
    
    // Common
    loading: "Betöltés...",
    error: "Hiba történt",
    success: "Sikeres művelet",
    
    // Admin Interface
    admin: "Adminisztráció",
    settings: "Beállítások",
    templates: "Sablonok",
    uploadTemplate: "Sablon feltöltése",
    templateName: "Sablon neve",
    templateType: "Sablon típusa",
    questionsTemplate: "Kérdések sablona",
    protocolTemplate: "Protokoll sablon",
    activate: "Aktiválás",
    active: "Aktív",
    inactive: "Inaktív",
    upload: "Feltöltés",
    preview: "Előnézet",
    configure: "Konfigurálás",
    cellReference: "Cella hivatkozás",
    sheetName: "Munkalap neve",
    questionConfiguration: "Kérdés konfiguráció",
    uploadExcelFile: "Excel fájl feltöltése",
    selectExcelFile: "Excel fájl kiválasztása",
    
    // Page specific translations
    generalData: "Általános adatok",
    machineRoom: "Gépház",
    modernizationAffected: "Modernizációban érintett",
    measurementData: "Mérési adatok",
    questionsInGroup: "kérdés ebben a csoportban",
    groupOf: "csoport",
    calculatedValuesValidated: "A számított értékek automatikusan validálva vannak. A határértéken kívüli értékek pirossal jelennek meg.",
    calculatedValues: "Számított értékek",
    errorRecordingRequired: "Hiba rögzítése szükséges",
    outOfRange: "Határértéken kívül (700-9000 mm)",
    viewErrors: "Hibák megtekintése",
    downloadErrorList: "Hibalista letöltése",
  },
  de: {
    // Start Screen
    slogan: "Made to move you",
    hungarian: "Magyar",
    german: "Deutsch",
    
    // Header
    title: "OTIS APROD - Abnahmeprotokoll",
    receptionDate: "Abnahmedatum:",
    progress: "Fortschritt",
    
    // Navigation
    previous: "Zurück",
    next: "Weiter",
    save: "Speichern",
    saved: "Gespeichert",
    saving: "Speichern...",
    autoSaved: "Automatisch gespeichert",
    back: "Zurück",
    complete: "Protokoll abschließen",
    startNew: "Neues Protokoll starten",
    
    // Answers
    yes: "Ja",
    no: "Nein",
    notApplicable: "Nicht zutreffend",
    
    // Error List
    errorList: "Fehlerliste",
    addError: "Fehler hinzufügen",
    noErrors: "Keine Fehler gemeldet",
    editError: "Bearbeiten",
    deleteError: "Löschen",
    errorRegistrationRequired: "Fehlerregistrierung erforderlich",
    
    // Error Modal
    addErrorTitle: "Neuen Fehler hinzufügen",
    severity: "Schweregrad",
    critical: "Kritisch",
    medium: "Mittel",
    low: "Niedrig",
    errorTitle: "Fehlertitel",
    errorDescription: "Detaillierte Beschreibung",
    attachPhotos: "Fotos anhängen",
    uploadPhotos: "Klicken Sie zum Hochladen von Fotos oder ziehen Sie sie hierher",
    selectFiles: "Dateien auswählen",
    cancel: "Abbrechen",
    saveError: "Fehler speichern",
    
    // Signature
    signatureTitle: "Digitale Unterschrift",
    signatureInstruction: "Bitte geben Sie Ihre Unterschrift ab",
    signaturePrompt: "Unterschreiben Sie hier mit dem Finger oder Stylus",
    clear: "Löschen",
    printedName: "Gedruckter Name (optional)",
    signatureDate: "Unterschriftsdatum: ",
    
    // Completion
    completionTitle: "Protokoll abgeschlossen",
    protocolComplete: "Protokoll erfolgreich abgeschlossen",
    completionMessage: "Ihr Abnahmeprotokoll wurde erstellt und ist bereit für die Verteilung.",
    emailPDF: "PDF per E-Mail senden",
    saveToCloud: "In Google Drive speichern",
    downloadPDF: "PDF herunterladen",
    downloadExcel: "Excel herunterladen",
    viewProtocol: "Protokoll-Vorschau",
    home: "Startseite",
    
    // Validation
    requiredField: "Dieses Feld ist erforderlich",
    invalidEmail: "Ungültige E-Mail-Adresse",
    
    // Common
    loading: "Laden...",
    error: "Ein Fehler ist aufgetreten",
    success: "Erfolgreiche Operation",
    
    // Admin Interface
    admin: "Administration",
    settings: "Einstellungen",
    templates: "Vorlagen",
    uploadTemplate: "Vorlage hochladen",
    templateName: "Vorlagenname",
    templateType: "Vorlagentyp",
    questionsTemplate: "Fragen-Vorlage",
    protocolTemplate: "Protokoll-Vorlage",
    activate: "Aktivieren",
    active: "Aktiv",
    inactive: "Inaktiv",
    upload: "Hochladen",
    preview: "Vorschau",
    configure: "Konfigurieren",
    cellReference: "Zellreferenz",
    sheetName: "Arbeitsblattname",
    questionConfiguration: "Fragenkonfiguration",
    uploadExcelFile: "Excel-Datei hochladen",
    selectExcelFile: "Excel-Datei auswählen",
    
    // Page specific translations
    generalData: "Allgemeine Daten",
    machineRoom: "Maschinenraum",
    modernizationAffected: "Von Modernisierung betroffen",
    measurementData: "Messdaten",
    questionsInGroup: "Fragen in dieser Gruppe",
    groupOf: "Gruppe",
    calculatedValuesValidated: "Die berechneten Werte werden automatisch validiert. Werte außerhalb der Grenzwerte werden rot angezeigt.",
    calculatedValues: "Berechnete Werte",
    errorRecordingRequired: "Dokumentation erforderlich",
    outOfRange: "Außerhalb der Grenzwerte (700-9000 mm)",
    viewErrors: "Fehler anzeigen",
    downloadErrorList: "Fehlerliste herunterladen",
  },
};
