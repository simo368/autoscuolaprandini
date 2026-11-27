/**
 * File di configurazione centrale per Autoscuola Prantini.
 * Tutti i dati aziendali e l'aspetto della Renault Captur 2025
 * possono essere modificati da qui senza toccare i componenti 3D o UI.
 */

export interface CarConfiguration {
  modelLabel: string;
  modelYear: string;
  /** Colore principale della carrozzeria (argento metallizzato di serie modificabile). */
  paintColor: string;
  /** Tetto a contrasto bi-tone in stile Captur. */
  roofColor: string;
  /** Dettagli cromati/satinati e inserti esterni. */
  trimColor: string;
  /** Eventuale URL a un asset GLB/GLTF reale con licenza per sostituire il modello procedurale. */
  customModelUrl?: string;
  /** Variante GLB alleggerita per dispositivi mobile. */
  mobileModelUrl?: string;
  /** Identità discreta da autoscuola sul tetto del veicolo. */
  schoolSignText: string;
}

export interface ModelAttribution {
  modelTitle: string;
  modelUrl: string;
  authorName: string;
  authorUrl: string;
  licenseLabel: string;
  licenseUrl: string;
}

export interface BusinessConfiguration {
  name: string;
  shortName: string;
  city: string;
  province: string;
  country: string;
  tagline: string;
  /** Numero WhatsApp in formato solo cifre con prefisso (es. "39XXXXXXXXXX"). Lasciare vuoto se non ancora confermato. */
  whatsappNumber: string;
  /** Numero di telefono pubblico (es. "+39 ..."). Lasciare vuoto se da confermare. */
  phoneDisplay: string;
  phoneHref: string;
  /** Email ufficiale. Lasciare vuoto se da confermare. */
  email: string;
  /** Indirizzo civico completo. Lasciare vuoto se da confermare. */
  streetAddress: string;
  /** Orari di apertura. Lasciare vuoto se da confermare. */
  openingHours: string;
  /** Query Google Maps sicura basata sul nome e comune noti. */
  directionsUrl: string;
  /** Dominio definitivo del sito per metadataBase. */
  siteUrl: string;
}

const envPaintColor = process.env.NEXT_PUBLIC_CAPTUR_PAINT_COLOR?.trim();
const envWhatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "";

export const carConfig: CarConfiguration = {
  modelLabel: "Renault Captur",
  modelYear: "2025",
  paintColor: envPaintColor && /^#[0-9a-fA-F]{6}$/.test(envPaintColor) ? envPaintColor : "#C3CCD3",
  roofColor: "#1E282E",
  trimColor: "#E4EAEE",
  customModelUrl: "/models/renault-captur-2025.glb",
  mobileModelUrl: "/models/renault-captur-2025-mobile.glb",
  schoolSignText: "AUTOSCUOLA",
};

export const modelAttribution: ModelAttribution = {
  modelTitle: "2025 Renault Captur",
  modelUrl: "https://sketchfab.com/3d-models/2025-renault-captur-3fe3f58932cf46bd8cfb4437187b287f",
  authorName: "tonielpro520",
  authorUrl: "https://sketchfab.com/tonielpro520",
  licenseLabel: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
};

export const businessConfig: BusinessConfiguration = {
  name: "Autoscuola Prantini",
  shortName: "PRANTINI",
  city: "Cavezzo",
  province: "MO",
  country: "Italia",
  tagline: "La tua strada comincia qui.",
  whatsappNumber: envWhatsapp,
  phoneDisplay: "",
  phoneHref: "",
  email: "",
  streetAddress: "",
  openingHours: "",
  directionsUrl: "https://www.google.com/maps/search/?api=1&query=Autoscuola+Prantini+Cavezzo",
  siteUrl: "https://autoscuolaprantini.it",
};

export function getWhatsAppHref(subject?: string): string | null {
  if (!businessConfig.whatsappNumber) return null;
  const base = `https://wa.me/${businessConfig.whatsappNumber}`;
  if (!subject) return base;
  return `${base}?text=${encodeURIComponent(`Ciao Autoscuola Prantini, vorrei informazioni su: ${subject}`)}`;
}
