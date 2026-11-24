"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getWhatsAppHref } from "@/data/configuration";
import type { JourneyChapter, JourneyStopId } from "@/data/journey";
import {
  licenceCategories,
  recuperoPuntiService,
  rinnovoService,
  type LicenceCategoryId,
} from "@/data/services";
import { EASE_AUTOMOTIVE, panelRevealVariants, reducedRevealVariants } from "@/lib/animations";
import { ArrowDiagonal, ArrowDown, CloseIcon } from "@/components/interface/Icons";

interface InformationPanelProps {
  activeChapter: JourneyChapter;
  atStop: boolean;
  selectedCategory: LicenceCategoryId;
  isMobile: boolean;
  onSelectCategory: (id: LicenceCategoryId) => void;
  onNavigateStop: (stopId: JourneyStopId) => void;
  reducedMotion: boolean;
}

export default function InformationPanel({
  activeChapter,
  atStop,
  selectedCategory,
  isMobile,
  onSelectCategory,
  onNavigateStop,
  reducedMotion,
}: InformationPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const variants = reducedMotion ? reducedRevealVariants : panelRevealVariants;
  const activeLicence =
    licenceCategories.find((item) => item.id === selectedCategory) ?? licenceCategories[2];

  const showStopPanel =
    atStop &&
    (activeChapter.id === "patenti" ||
      activeChapter.id === "rinnovo" ||
      activeChapter.id === "punti");

  const renderContactButton = (label: string, subject: string, compact = false) => {
    const whatsappHref = getWhatsAppHref(subject);
    if (whatsappHref) {
      return (
        <a className="btn-primary" href={whatsappHref} target="_blank" rel="noreferrer">
          <span>{compact ? "CONTATTA" : label.toUpperCase()}</span>
          <ArrowDiagonal />
        </a>
      );
    }

    return (
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          setDetailsOpen(false);
          onNavigateStop("cavezzo");
        }}
      >
        <span>{compact ? "CONTATTI" : label.toUpperCase()}</span>
        <ArrowDiagonal />
      </button>
    );
  };

  // Dati correnti per l'eventuale modale espanso su mobile
  const activeDetails =
    activeChapter.id === "patenti"
      ? {
          kicker: `STOP 01 · ${activeLicence.label}`,
          title: activeLicence.headline,
          description: activeLicence.description,
          highlights: activeLicence.focusPoints,
          ctaLabel: activeLicence.ctaLabel,
          subject: activeLicence.label,
          nextStop: "rinnovo" as JourneyStopId,
        }
      : activeChapter.id === "rinnovo"
        ? {
            kicker: rinnovoService.kicker,
            title: rinnovoService.title,
            description: rinnovoService.description,
            highlights: rinnovoService.highlights,
            ctaLabel: rinnovoService.ctaLabel,
            subject: "Rinnovo patenti",
            nextStop: "punti" as JourneyStopId,
          }
        : {
            kicker: recuperoPuntiService.kicker,
            title: recuperoPuntiService.title,
            description: recuperoPuntiService.description,
            highlights: recuperoPuntiService.highlights,
            ctaLabel: recuperoPuntiService.ctaLabel,
            subject: "Recupero punti",
            nextStop: "cavezzo" as JourneyStopId,
          };

  return (
    <>
      <div className="hud-panel-region">
        <AnimatePresence mode="wait">
          {!showStopPanel && activeChapter.id !== "intro" && activeChapter.id !== "cavezzo" && (
            <motion.div
              key={`transit-${activeChapter.id}`}
              className="transit-pill"
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <span className="transit-pill__dot" aria-hidden="true" />
              <span>
                VERSO {activeChapter.shortLabel.toUpperCase()} · {activeChapter.phaseLabel}
              </span>
            </motion.div>
          )}

          {/* === STOP 01: LE PATENTI === */}
          {showStopPanel && activeChapter.id === "patenti" && (
            <motion.section
              key="panel-patenti"
              className="editorial-panel editorial-panel--wide"
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-labelledby="stop-patenti-title"
            >
              <div className="editorial-panel__kicker">
                <span className="hairline-accent" />
                <span>STOP 01 · LE PATENTI</span>
              </div>

              <h2 id="stop-patenti-title" className="editorial-panel__title">
                SCEGLI LA TUA DIREZIONE.
              </h2>

              <div className="category-tabs" role="tablist" aria-label="Categorie di patente">
                {licenceCategories.map((cat) => {
                  const isSelected = cat.id === selectedCategory;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`category-tab${isSelected ? " is-selected" : ""}`}
                      onClick={() => onSelectCategory(cat.id)}
                    >
                      <span className="category-tab__code">{cat.code}</span>
                      <span className="category-tab__meta">{cat.vehicleLabel}</span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeLicence.id}
                  className="category-detail"
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: reducedMotion ? 0.12 : 0.24 }}
                >
                  <div className="category-detail__header">
                    <span className="category-detail__badge">{activeLicence.label}</span>
                    <span className="category-detail__vehicle">{activeLicence.vehicleLabel}</span>
                  </div>
                  <h3 className="category-detail__headline">{activeLicence.headline}</h3>
                  {!isMobile && (
                    <>
                      <p className="category-detail__description">{activeLicence.description}</p>
                      <ul className="editorial-list">
                        {activeLicence.focusPoints.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {isMobile && (
                    <p className="category-detail__description category-detail__description--compact">
                      {activeLicence.description}
                    </p>
                  )}

                  <div className="editorial-panel__actions">
                    {renderContactButton(activeLicence.ctaLabel, activeLicence.label, isMobile)}
                    {isMobile && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setDetailsOpen(true)}
                      >
                        <span>DETTAGLI</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => onNavigateStop("rinnovo")}
                    >
                      <span>CONTINUA IL VIAGGIO</span>
                      <ArrowDown />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.section>
          )}

          {/* === STOP 02: RINNOVO PATENTI === */}
          {showStopPanel && activeChapter.id === "rinnovo" && (
            <motion.section
              key="panel-rinnovo"
              className="editorial-panel"
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-labelledby="stop-rinnovo-title"
            >
              <div className="editorial-panel__kicker">
                <span className="hairline-accent" />
                <span>{rinnovoService.kicker}</span>
              </div>

              <h2 id="stop-rinnovo-title" className="editorial-panel__title">
                {rinnovoService.title}
              </h2>
              <p className="editorial-panel__subtitle">{rinnovoService.subtitle}</p>
              <p className="editorial-panel__description">{rinnovoService.description}</p>

              {!isMobile && (
                <ul className="editorial-list">
                  {rinnovoService.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              <div className="editorial-panel__actions">
                {renderContactButton(rinnovoService.ctaLabel, "Rinnovo patenti", isMobile)}
                {isMobile && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setDetailsOpen(true)}
                  >
                    <span>DETTAGLI</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onNavigateStop("punti")}
                >
                  <span>CONTINUA IL VIAGGIO</span>
                  <ArrowDown />
                </button>
              </div>
            </motion.section>
          )}

          {/* === STOP 03: RECUPERO PUNTI === */}
          {showStopPanel && activeChapter.id === "punti" && (
            <motion.section
              key="panel-punti"
              className="editorial-panel editorial-panel--right"
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-labelledby="stop-punti-title"
            >
              <div className="editorial-panel__kicker">
                <span className="hairline-accent" />
                <span>{recuperoPuntiService.kicker}</span>
              </div>

              <h2 id="stop-punti-title" className="editorial-panel__title">
                {recuperoPuntiService.title}
              </h2>
              <p className="editorial-panel__subtitle">{recuperoPuntiService.subtitle}</p>
              <p className="editorial-panel__description">{recuperoPuntiService.description}</p>

              {!isMobile && (
                <ul className="editorial-list">
                  {recuperoPuntiService.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              <div className="editorial-panel__actions">
                {renderContactButton(recuperoPuntiService.ctaLabel, "Recupero punti", isMobile)}
                {isMobile && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setDetailsOpen(true)}
                  >
                    <span>DETTAGLI</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onNavigateStop("cavezzo")}
                >
                  <span>CONTINUA IL VIAGGIO</span>
                  <ArrowDown />
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Pannello dettagli espanso su smartphone per mantenere la scena 3D sempre libera */}
      <AnimatePresence>
        {isMobile && detailsOpen && showStopPanel && (
          <motion.div
            className="mobile-details-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.24 }}
            onClick={() => setDetailsOpen(false)}
          >
            <motion.div
              className="mobile-details-drawer"
              initial={reducedMotion ? { opacity: 0 } : { y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { y: "100%" }}
              transition={{ duration: reducedMotion ? 0.12 : 0.36, ease: EASE_AUTOMOTIVE }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={activeDetails.title}
            >
              <div className="mobile-details-drawer__head">
                <span className="editorial-panel__kicker">{activeDetails.kicker}</span>
                <button
                  type="button"
                  className="fullscreen-menu__close"
                  onClick={() => setDetailsOpen(false)}
                  aria-label="Chiudi dettagli"
                >
                  <span>CHIUDI</span>
                  <CloseIcon />
                </button>
              </div>
              <h3 className="mobile-details-drawer__title">{activeDetails.title}</h3>
              <p className="editorial-panel__description">{activeDetails.description}</p>
              <ul className="editorial-list">
                {activeDetails.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="editorial-panel__actions">
                {renderContactButton(activeDetails.ctaLabel, activeDetails.subject, false)}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setDetailsOpen(false);
                    onNavigateStop(activeDetails.nextStop);
                  }}
                >
                  <span>CONTINUA IL VIAGGIO</span>
                  <ArrowDown />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
