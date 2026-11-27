export type JourneyStopId = "intro" | "patenti" | "rinnovo" | "punti" | "cavezzo";

export interface JourneyChapter {
  id: JourneyStopId;
  index: string;
  navLabel: string;
  shortLabel: string;
  phaseLabel: string;
  /** Intervallo normalizzato [0..1] dello scroll pagina in cui questo capitolo è attivo. */
  scrollStart: number;
  scrollEnd: number;
  /** Posizione di scroll target quando l'utente clicca sul menu o sull'indicatore. */
  scrollTarget: number;
  /** Intervallo di scroll in cui l'auto resta ferma alla destinazione. */
  stopPlateauStart: number;
  stopPlateauEnd: number;
  /** Parametro normalizzato [0..1] lungo la spline panoramica della strada. */
  trackT: number;
}

export const START_TRACK_T = 0.105;

export const journeyChapters: JourneyChapter[] = [
  {
    id: "intro",
    index: "00",
    navLabel: "Home",
    shortLabel: "Partenza",
    phaseLabel: "ORA BLU · CAMPAGNA",
    scrollStart: 0,
    scrollEnd: 0.055,
    scrollTarget: 0,
    stopPlateauStart: 0,
    stopPlateauEnd: 0.015,
    trackT: 0.115,
  },
  {
    id: "patenti",
    index: "01",
    navLabel: "Le patenti",
    shortLabel: "Patenti",
    phaseLabel: "PRIMA MATTINA · ROTATORIA",
    scrollStart: 0.055,
    scrollEnd: 0.375,
    scrollTarget: 0.145,
    stopPlateauStart: 0.095,
    stopPlateauEnd: 0.195,
    trackT: 0.39,
  },
  {
    id: "rinnovo",
    index: "02",
    navLabel: "Rinnovo patenti",
    shortLabel: "Rinnovo",
    phaseLabel: "LUCE CALDA · PADIGLIONE",
    scrollStart: 0.375,
    scrollEnd: 0.655,
    scrollTarget: 0.425,
    stopPlateauStart: 0.375,
    stopPlateauEnd: 0.475,
    trackT: 0.61,
  },
  {
    id: "punti",
    index: "03",
    navLabel: "Recupero punti",
    shortLabel: "Punti",
    phaseLabel: "MATTINO D'ORO · SEGNALETICA",
    scrollStart: 0.655,
    scrollEnd: 0.935,
    scrollTarget: 0.705,
    stopPlateauStart: 0.655,
    stopPlateauEnd: 0.755,
    trackT: 0.77,
  },
  {
    id: "cavezzo",
    index: "04",
    navLabel: "Contatti",
    shortLabel: "Cavezzo",
    phaseLabel: "SOLE DEL MATTINO · CAVEZZO",
    scrollStart: 0.935,
    scrollEnd: 1,
    scrollTarget: 0.97,
    stopPlateauStart: 0.935,
    stopPlateauEnd: 1,
    trackT: 0.94,
  },
];

/**
 * Curva deterministica morbida ma reattiva: evita accelerazioni eccessive a metà tratto
 * e avvia subito la vettura appena si lascia una sosta.
 */
function easeDriving(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  const smooth = c * c * (3 - 2 * c);
  return 0.38 * c + 0.62 * smooth;
}

/**
 * Converte il progresso dello scroll [0..1] nella posizione lungo la strada panoramica.
 * Primo tratto (Partenza -> Patenti) accorciato e immediato; tratti successivi preservati.
 */
export function mapScrollToTrackProgress(scroll: number): number {
  const s = Math.max(0, Math.min(1, scroll));

  // Intro: 0.00 - 0.015 (0.105 -> 0.115)
  if (s <= 0.015) {
    const local = easeDriving(s / 0.015);
    return START_TRACK_T + local * 0.01;
  }

  // Driving to Patenti (tratto iniziale più breve e immediato): 0.015 - 0.095 (0.115 -> 0.39)
  if (s <= 0.095) {
    const local = easeDriving((s - 0.015) / 0.08);
    return 0.115 + local * 0.275;
  }

  // Patenti stop: 0.095 - 0.195
  if (s <= 0.195) {
    return 0.39;
  }

  // Driving to Rinnovo: 0.195 - 0.375 (0.39 -> 0.61)
  if (s <= 0.375) {
    const local = easeDriving((s - 0.195) / 0.18);
    return 0.39 + local * 0.22;
  }

  // Rinnovo stop: 0.375 - 0.475
  if (s <= 0.475) {
    return 0.61;
  }

  // Driving to Recupero Punti: 0.475 - 0.655 (0.61 -> 0.77)
  if (s <= 0.655) {
    const local = easeDriving((s - 0.475) / 0.18);
    return 0.61 + local * 0.16;
  }

  // Recupero Punti stop: 0.655 - 0.755
  if (s <= 0.755) {
    return 0.77;
  }

  // Driving to Cavezzo: 0.755 - 0.935 (0.77 -> 0.94)
  if (s <= 0.935) {
    const local = easeDriving((s - 0.755) / 0.18);
    return 0.77 + local * 0.17;
  }

  // Final destination (Cavezzo): 0.935 - 1.00
  return 0.94;
}

export function getActiveChapterForScroll(scroll: number): JourneyChapter {
  const s = Math.max(0, Math.min(1, scroll));
  for (let i = journeyChapters.length - 1; i >= 0; i--) {
    if (s >= journeyChapters[i].scrollStart) {
      return journeyChapters[i];
    }
  }
  return journeyChapters[0];
}

export function isAtStopPlateau(scroll: number, chapter: JourneyChapter): boolean {
  return scroll >= chapter.stopPlateauStart - 0.008 && scroll <= chapter.stopPlateauEnd + 0.008;
}
