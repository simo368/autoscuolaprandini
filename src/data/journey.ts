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
    stopPlateauEnd: 0.05,
    trackT: 0.035,
  },
  {
    id: "patenti",
    index: "01",
    navLabel: "Le patenti",
    shortLabel: "Patenti",
    phaseLabel: "PRIMA MATTINA · ROTATORIA",
    scrollStart: 0.12,
    scrollEnd: 0.41,
    scrollTarget: 0.28,
    stopPlateauStart: 0.2,
    stopPlateauEnd: 0.36,
    trackT: 0.39,
  },
  {
    id: "rinnovo",
    index: "02",
    navLabel: "Rinnovo patenti",
    shortLabel: "Rinnovo",
    phaseLabel: "LUCE CALDA · PADIGLIONE",
    scrollStart: 0.41,
    scrollEnd: 0.66,
    scrollTarget: 0.54,
    stopPlateauStart: 0.48,
    stopPlateauEnd: 0.61,
    trackT: 0.61,
  },
  {
    id: "punti",
    index: "03",
    navLabel: "Recupero punti",
    shortLabel: "Punti",
    phaseLabel: "MATTINO D'ORO · SEGNALETICA",
    scrollStart: 0.66,
    scrollEnd: 0.88,
    scrollTarget: 0.77,
    stopPlateauStart: 0.72,
    stopPlateauEnd: 0.83,
    trackT: 0.77,
  },
  {
    id: "cavezzo",
    index: "04",
    navLabel: "Contatti",
    shortLabel: "Cavezzo",
    phaseLabel: "SOLE DEL MATTINO · CAVEZZO",
    scrollStart: 0.88,
    scrollEnd: 1,
    scrollTarget: 0.96,
    stopPlateauStart: 0.92,
    stopPlateauEnd: 1,
    trackT: 0.94,
  },
];

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Converte il progresso dello scroll [0..1] nella posizione lungo la strada panoramica a 8 segmenti,
 * garantendo accelerazioni progressive, percorrenza fluida di curve/ponti e soste stabili alle destinazioni.
 */
export function mapScrollToTrackProgress(scroll: number): number {
  const s = Math.max(0, Math.min(1, scroll));

  // Intro: partenza dolce lungo il viale iniziale (0.02 -> 0.035)
  if (s <= 0.05) {
    const local = easeInOutCubic(s / 0.05);
    return 0.02 + local * 0.015;
  }

  // Segmenti 1-4: partenza -> prima grande curva -> S-curve sul ponte -> rotatoria Le Patenti (0.035 -> 0.39)
  if (s <= 0.2) {
    const local = easeInOutCubic((s - 0.05) / 0.15);
    return 0.035 + local * 0.355;
  }

  // Sosta Stop 01 — Le Patenti
  if (s <= 0.36) {
    return 0.39;
  }

  // Segmenti 5-6: discesa panoramica nella campagna -> padiglione Rinnovo Patenti (0.39 -> 0.61)
  if (s <= 0.48) {
    const local = easeInOutCubic((s - 0.36) / 0.12);
    return 0.39 + local * 0.22;
  }

  // Sosta Stop 02 — Rinnovo Patenti
  if (s <= 0.61) {
    return 0.61;
  }

  // Segmento 7: curva verso area segnaletica Recupero Punti (0.61 -> 0.77)
  if (s <= 0.72) {
    const local = easeInOutCubic((s - 0.61) / 0.11);
    return 0.61 + local * 0.16;
  }

  // Sosta Stop 03 — Recupero Punti
  if (s <= 0.83) {
    return 0.77;
  }

  // Segmento 8: ampia curva dorata verso la destinazione finale Cavezzo (0.77 -> 0.94)
  if (s <= 0.92) {
    const local = easeInOutCubic((s - 0.83) / 0.09);
    return 0.77 + local * 0.17;
  }

  // Sosta Destinazione Finale — Cavezzo
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
  return scroll >= chapter.stopPlateauStart - 0.015 && scroll <= chapter.stopPlateauEnd + 0.015;
}
