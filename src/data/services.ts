export type LicenceCategoryId = "am" | "a" | "b";

export interface LicenceCategory {
  id: LicenceCategoryId;
  code: string;
  label: string;
  vehicleLabel: string;
  vehicleType: "scooter" | "motorcycle" | "captur";
  headline: string;
  description: string;
  focusPoints: string[];
  ctaLabel: string;
}

export interface ServiceStopContent {
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
}

export const licenceCategories: LicenceCategory[] = [
  {
    id: "am",
    code: "AM",
    label: "PATENTE AM",
    vehicleLabel: "Ciclomotore",
    vehicleType: "scooter",
    headline: "Le prime basi su due ruote.",
    description:
      "Un percorso dedicato a chi si avvicina per la prima volta alla strada su ciclomotore, con attenzione all'equilibrio, alla segnaletica e alla sicurezza quotidiana.",
    focusPoints: [
      "Preparazione teorica chiara e guidata",
      "Esercitazioni pratiche progressive in sicurezza",
      "Supporto completo dalla domanda all'esame",
    ],
    ctaLabel: "Richiedi informazioni per Patente AM",
  },
  {
    id: "a",
    code: "A",
    label: "PATENTE A",
    vehicleLabel: "Motociclo",
    vehicleType: "motorcycle",
    headline: "Consapevolezza e controllo su moto.",
    description:
      "Formazione mirata alla guida su motociclo, per affrontare traiettorie, frenata e contesto urbano ed extraurbano con padronanza e rispetto della strada.",
    focusPoints: [
      "Controllo del mezzo e precisione nelle manovre",
      "Lettura del traffico e gestione degli imprevisti",
      "Accompagnamento personalizzato alle prove",
    ],
    ctaLabel: "Richiedi informazioni per Patente A",
  },
  {
    id: "b",
    code: "B",
    label: "PATENTE B",
    vehicleLabel: "Renault Captur 2025",
    vehicleType: "captur",
    headline: "La tua autonomia al volante.",
    description:
      "Impara a guidare su una vettura moderna e sicura come la Renault Captur 2025, costruendo sicurezza passo dopo passo insieme a istruttori dedicati.",
    focusPoints: [
      "Guida su Renault Captur 2025 di ultima generazione",
      "Percorsi graduali tra centro, incroci e strade extraurbane",
      "Metodo chiaro orientato alla reale autonomia di guida",
    ],
    ctaLabel: "Richiedi informazioni per Patente B",
  },
];

export const rinnovoService: ServiceStopContent = {
  kicker: "STOP 02 · PRATICHE E ASSISTENZA",
  title: "LA TUA PATENTE, SEMPRE IN REGOLA.",
  subtitle: "Rinnovo patenti",
  description:
    "Gestiamo con chiarezza e semplicità le pratiche per il rinnovo della patente di guida, accompagnandoti in ogni passaggio necessario per continuare a viaggiare serenamente.",
  highlights: [
    "Verifica della documentazione richiesta",
    "Organizzazione dell'accertamento medico in sede",
    "Assistenza diretta fino al ricevimento del documento aggiornato",
  ],
  ctaLabel: "Prenota o chiedi informazioni sul rinnovo",
};

export const recuperoPuntiService: ServiceStopContent = {
  kicker: "STOP 03 · FORMAZIONE CONTINUA",
  title: "RECUPERA I TUOI PUNTI.",
  subtitle: "Recupero punti patente",
  description:
    "Un percorso strutturato e professionale per aggiornare le tue conoscenze sulla sicurezza stradale e reintegrare i punti della patente con il supporto dell'autoscuola.",
  highlights: [
    "Incontri dedicati alla sicurezza e alle norme di circolazione",
    "Ambiente chiaro, ordinato e orientato alla consapevolezza",
    "Supporto informativo su iscrizioni e calendario",
  ],
  ctaLabel: "Richiedi dettagli sul recupero punti",
};

