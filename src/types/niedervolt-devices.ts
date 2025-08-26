// Niedervolt device definitions based on the uploaded Excel template

export interface NiedervoltDevice {
  id: string;
  nameDE: string;
  nameHU: string;
}

export interface NiedervoltMeasurement {
  deviceId: string;
  nennstrom?: string;        // Névleges áram / Nennstrom
  sicherung?: string;        // Olvadóbetét / Sicherung  
  ls?: string;               // Kismegszakító / LS
  merkmal?: string;          // Típusjelzés / Merkmal
  ltv?: string;              // L-T-V..
  nPe?: string;              // N-PE isolation
  l1Pe?: string;             // L1-PE isolation
  l2Pe?: string;             // L2-PE isolation
  l3Pe?: string;             // L3-PE isolation
  lN?: string;               // L-N short circuit
  lPe?: string;              // L-PE short circuit
  fiIn?: string;             // FI In (mA)
  fiDin?: string;            // FI DIn (ms)
  fiTest?: string;           // FI Test result
}

// German devices from Excel rows 9-21
export const GERMAN_DEVICES: NiedervoltDevice[] = [
  { id: 'antriebsmotor', nameDE: 'Antriebsmotor', nameHU: 'Motor vagy vezérlés' },
  { id: 'tuerantrieb1', nameDE: 'Türantriebsmotor 1', nameHU: 'Ajtó motor 1' },
  { id: 'tuerantrieb2', nameDE: 'Türantriebsmotor 2', nameHU: 'Ajtó motor 2' },
  { id: 'motorventil', nameDE: 'Motorgest. Ventil (hydr.)', nameHU: 'Motorvezérelt szelep (hydr.)' },
  { id: 'buendigmotor', nameDE: 'Bündigstellungsmotor', nameHU: 'Szintbeállító motor (hydr.)' },
  { id: 'schachtsteckdose', nameDE: 'Schachtsteckdose', nameHU: 'Konektor az aknában' },
  { id: 'schachtlicht', nameDE: 'Schachtbeleuchtung', nameHU: 'Aknavilágítás' },
  { id: 'pms', nameDE: 'PMS', nameHU: 'PMS' },
  { id: 'steckdose_mr', nameDE: 'Steckdose MR.', nameHU: 'Konektor a gépházban' },
  { id: 'fahrkorblight', nameDE: 'Fahrkorbbeleuchtung', nameHU: 'Kabinvilágítás' },
  { id: 'fotozelle', nameDE: 'Fotozelle', nameHU: 'Fotocella' },
  { id: 'weitester', nameDE: 'Weitestentfernter Sicherheitskontakt', nameHU: 'Biztonsági kör legtávolabbi pontja' },
  { id: 'andere', nameDE: 'Andere', nameHU: 'Egyéb' }
];

// Field labels for the table headers
export interface FieldLabels {
  nennstrom: { de: string; hu: string };
  sicherung: { de: string; hu: string };
  ls: { de: string; hu: string };
  merkmal: { de: string; hu: string };
  ltv: { de: string; hu: string };
  nPe: { de: string; hu: string };
  l1Pe: { de: string; hu: string };
  l2Pe: { de: string; hu: string };
  l3Pe: { de: string; hu: string };
  lN: { de: string; hu: string };
  lPe: { de: string; hu: string };
  fiIn: { de: string; hu: string };
  fiDin: { de: string; hu: string };
  fiTest: { de: string; hu: string };
}

export const FIELD_LABELS: FieldLabels = {
  nennstrom: { de: 'Nennstrom (In) A', hu: 'Névleges áram (In) A' },
  sicherung: { de: 'Sicherung', hu: 'Biztosíték' },
  ls: { de: 'LS', hu: 'LS-kapcsoló' },
  merkmal: { de: 'Merkmal', hu: 'Típusjelzés' },
  ltv: { de: 'L-T-V..', hu: 'L-T-V..' },
  nPe: { de: 'N-PE Ω', hu: 'N-PE Ω' },
  l1Pe: { de: 'L1-PE Ω', hu: 'L1-PE Ω' },
  l2Pe: { de: 'L2-PE Ω', hu: 'L2-PE Ω' },
  l3Pe: { de: 'L3-PE Ω', hu: 'L3-PE Ω' },
  lN: { de: 'L-N Ω', hu: 'L-N Ω' },
  lPe: { de: 'L-PE Ω', hu: 'L-PE Ω' },
  fiIn: { de: 'FI In mA', hu: 'FI In mA' },
  fiDin: { de: 'FI DIn ms', hu: 'FI DIn ms' },
  fiTest: { de: 'FI Test', hu: 'FI Teszt' }
};

// Dropdown options for common values
export const DROPDOWN_OPTIONS = {
  sicherung: ['6A', '10A', '16A', '20A', '25A', '32A', '40A', '50A', '63A'],
  ls: ['B6', 'B10', 'B16', 'B20', 'B25', 'B32', 'C6', 'C10', 'C16', 'C20', 'C25', 'C32'],
  fiTest: ['OK', 'NOK', '-']
};