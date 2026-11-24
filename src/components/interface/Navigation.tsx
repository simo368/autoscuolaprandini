"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type MotionValue } from "motion/react";
import { businessConfig } from "@/data/configuration";
import { journeyChapters, type JourneyChapter, type JourneyStopId } from "@/data/journey";
import { EASE_AUTOMOTIVE, staggerItemTransition } from "@/lib/animations";
import { ArrowDiagonal, CloseIcon, MenuIcon } from "@/components/interface/Icons";

interface NavigationProps {
  activeChapter: JourneyChapter;
  scrollYProgress: MotionValue<number>;
  isMobile: boolean;
  reducedMotion: boolean;
  onNavigateStop: (stopId: JourneyStopId) => void;
}

export default function Navigation({
  activeChapter,
  scrollYProgress,
  isMobile,
  reducedMotion,
  onNavigateStop,
}: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen]);

  const handleSelect = (stopId: JourneyStopId) => {
    setIsOpen(false);
    onNavigateStop(stopId);
  };

  return (
    <>
      <header className="site-topbar">
        <div className="site-topbar__row">
          <button
            type="button"
            className="brand-button"
            onClick={() => handleSelect("intro")}
            aria-label={`${businessConfig.name}, torna alla partenza`}
          >
            <span className="brand-button__mark">
              P<span>.</span>
            </span>
            <span className="brand-button__label">
              AUTOSCUOLA
              <br />
              {businessConfig.shortName}
            </span>
          </button>

          <div className="topbar-status" aria-live="polite">
            <span className="topbar-status__code">{activeChapter.index}</span>
            <span className="topbar-status__dot" />
            <span className="topbar-status__phase">{activeChapter.phaseLabel}</span>
          </div>

          <div className="topbar-right">
            <a
              className="topbar-location"
              href={businessConfig.directionsUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                {businessConfig.city.toUpperCase()}, {businessConfig.province}
              </span>
              <ArrowDiagonal />
            </a>

            <button
              type="button"
              className="menu-btn"
              onClick={() => setIsOpen(true)}
              aria-label="Apri il menu di navigazione"
              aria-expanded={isOpen}
            >
              <span>MENU</span>
              <MenuIcon />
            </button>
          </div>
        </div>

        {/* Indicatore di percorso compatto integrato nella barra superiore su mobile */}
        <div className="mobile-top-progress" aria-label="Avanzamento percorso">
          <div className="mobile-top-progress__meta">
            <span>
              <b>{activeChapter.index}</b> / 04 · {activeChapter.shortLabel.toUpperCase()}
            </span>
            <div className="mobile-top-progress__pips" role="group" aria-label="Vai a una tappa">
              {journeyChapters.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  className={`mobile-top-pip${ch.id === activeChapter.id ? " is-active" : ""}`}
                  onClick={() => handleSelect(ch.id)}
                  aria-label={`Vai a ${ch.navLabel}`}
                  aria-current={ch.id === activeChapter.id ? "step" : undefined}
                />
              ))}
            </div>
          </div>
          <div className="mobile-top-progress__rail" aria-hidden="true">
            <motion.div
              className="mobile-top-progress__fill"
              style={{ scaleX: scrollYProgress }}
            />
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            ref={dialogRef}
            className="mobile-menu-sheet"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
            transition={{ duration: reducedMotion ? 0.14 : 0.42, ease: EASE_AUTOMOTIVE }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu mobile"
          >
            <div className="mobile-menu-sheet__top">
              <div>
                <span className="mobile-menu-sheet__kicker">PERCORSO 3D</span>
                <div className="fullscreen-menu__brand">
                  {businessConfig.shortName}
                  <span>.</span>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="fullscreen-menu__close"
                onClick={() => setIsOpen(false)}
                aria-label="Chiudi il menu"
              >
                <span>CHIUDI</span>
                <CloseIcon />
              </button>
            </div>

            <nav className="mobile-menu-sheet__nav" aria-label="Destinazioni del viaggio">
              {journeyChapters.map((chapter) => {
                const isCurrent = chapter.id === activeChapter.id;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    className={`mobile-menu-sheet__item${isCurrent ? " is-active" : ""}`}
                    onClick={() => handleSelect(chapter.id)}
                  >
                    <span className="mobile-menu-sheet__index">{chapter.index}</span>
                    <span className="mobile-menu-sheet__text">
                      <strong>{chapter.navLabel}</strong>
                      <small>{chapter.phaseLabel}</small>
                    </span>
                    <ArrowDiagonal />
                  </button>
                );
              })}
            </nav>

            <div className="mobile-menu-sheet__footer">
              <a
                className="btn-secondary"
                href={businessConfig.directionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>INDICAZIONI · {businessConfig.city.toUpperCase()}</span>
                <ArrowDiagonal />
              </a>
            </div>
          </motion.div>
        )}

        {isOpen && !isMobile && (
          <motion.div
            ref={dialogRef}
            className="fullscreen-menu"
            initial={reducedMotion ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            exit={reducedMotion ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: reducedMotion ? 0.15 : 0.55, ease: EASE_AUTOMOTIVE }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigazione principale"
          >
            <div className="fullscreen-menu__top">
              <span className="fullscreen-menu__brand">
                {businessConfig.shortName}
                <span>.</span>
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                className="fullscreen-menu__close"
                onClick={() => setIsOpen(false)}
                aria-label="Chiudi il menu"
              >
                <span>CHIUDI</span>
                <CloseIcon />
              </button>
            </div>

            <nav className="fullscreen-menu__nav" aria-label="Destinazioni del viaggio">
              {journeyChapters.map((chapter, index) => {
                const isCurrent = chapter.id === activeChapter.id;
                return (
                  <motion.button
                    key={chapter.id}
                    type="button"
                    className={`fullscreen-menu__item${isCurrent ? " is-active" : ""}`}
                    onClick={() => handleSelect(chapter.id)}
                    initial={reducedMotion ? false : { opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reducedMotion
                        ? { duration: 0.12 }
                        : staggerItemTransition(index)
                    }
                  >
                    <span className="fullscreen-menu__index">{chapter.index}</span>
                    <span className="fullscreen-menu__label">{chapter.navLabel}</span>
                    <span className="fullscreen-menu__phase">{chapter.shortLabel.toUpperCase()}</span>
                    <ArrowDiagonal />
                  </motion.button>
                );
              })}
            </nav>

            <div className="fullscreen-menu__bottom">
              <span>
                {businessConfig.name.toUpperCase()} · {businessConfig.city.toUpperCase()} ({businessConfig.province})
              </span>
              <span>{businessConfig.tagline.toUpperCase()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
