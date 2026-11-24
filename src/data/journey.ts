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

export const journeyChapters: JourneyChapter[] = [
  {
    id: "intro",
    index: "00",
    navLabel: "Home",
    shortLabel: "Partenza",
    phaseLabel: "ORA BLU · CAMPAGNA",
    scrollStart: 0,
    scrollEnd: 0.12,
    scrollTarget: 0,
    stopPlateauStart: 0,
    stopPlateauEnd: 0.04,
    trackT: 0.035,
  },
  {
    id: "patenti",
    index: "01",
    navLabel: "Le patenti",
    shortLabel: "Patenti",
    phaseLabel: "PRIMA MATTINA · ROTATORIA",
    scrollStart: 0.12,
    scrollEnd: 0.45,
    scrollTarget: 0.245,
    stopPlateauStart: 0.2,
    stopPlateauEnd: 0.29,
    trackT: 0.39,
  },
  {
    id: "rinnovo",
    index: "02",
    navLabel: "Rinnovo patenti",
    shortLabel: "Rinnovo",
    phaseLabel: "LUCE CALDA · PADIGLIONE",
    scrollStart: 0.45,
    scrollEnd: 0.7,
    scrollTarget: 0.495,
    stopPlateauStart: 0.45,
    stopPlateauEnd: 0.54,
    trackT: 0.61,
  },
  {
    id: "punti",
    index: "03",
    navLabel: "Recupero punti",
    shortLabel: "Punti",
    phaseLabel: "MATTINO D'ORO · SEGNALETICA",
    scrollStart: 0.7,
    scrollEnd: 0.95,
    scrollTarget: 0.745,
    stopPlateauStart: 0.7,
    stopPlateauEnd: 0.79,
    trackT: 0.77,
  },
  {
    id: "cavezzo",
    index: "04",
    navLabel: "Contatti",
    shortLabel: "Cavezzo",
    phaseLabel: "SOLE DEL MATTINO · CAVEZZO",
    scrollStart: 0.95,
    scrollEnd: 1,
    scrollTarget: 0.975,
    stopPlateauStart: 0.95,
    stopPlateauEnd: 1,
    trackT: 0.94,
  },
];

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Converte il progresso dello scroll [0..1] nella posizione lungo la strada panoramica,
 * con tratti di guida equilibrati (16% ciascuno) e soste stabili alle destinazioni (9%).
 */
export function mapScrollToTrackProgress(scroll: number): number {
  const s = Math.max(0, Math.min(1, scroll));

  // Intro: 0.00 - 0.04 (0.02 -> 0.035)
  if (s <= 0.04) {
    const local = easeInOutCubic(s / 0.04);
    return 0.02 + local * 0.015;
  }

  // Driving to Patenti: 0.04 - 0.20 (0.035 -> 0.39)
  if (s <= 0.2) {
    const local = easeInOutCubic((s - 0.04) / 0.16);
    return 0.035 + local * 0.355;
  }

  // Patenti stop: 0.20 - 0.29
  if (s <= 0.29) {
    return 0.39;
  }

  // Driving to Rinnovo: 0.29 - 0.45 (0.39 -> 0.61)
  if (s <= 0.45) {
    const local = easeInOutCubic((s - 0.29) / 0.16);
    return 0.39 + local * 0.22;
  }

  // Rinnovo stop: 0.45 - 0.54
  if (s <= 0.54) {
    return 0.61;
  }

  // Driving to Recupero Punti: 0.54 - 0.70 (0.61 -> 0.77)
  if (s <= 0.7) {
    const local = easeInOutCubic((s - 0.54) / 0.16);
    return 0.61 + local * 0.16;
  }

  // Recupero Punti stop: 0.70 - 0.79
  if (s <= 0.79) {
    return 0.77;
  }

  // Driving to Cavezzo: 0.79 - 0.95 (0.77 -> 0.94)
  if (s <= 0.95) {
    const local = easeInOutCubic((s - 0.79) / 0.16);
    return 0.77 + local * 0.17;
  }

  // Final destination (Cavezzo): 0.95 - 1.00
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
