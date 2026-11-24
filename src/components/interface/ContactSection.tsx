"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { businessConfig, getWhatsAppHref } from "@/data/configuration";
import { journeyChapters, type JourneyStopId } from "@/data/journey";
import { EASE_AUTOMOTIVE, panelRevealVariants, reducedRevealVariants } from "@/lib/animations";
import { ArrowDiagonal, CloseIcon } from "@/components/interface/Icons";

interface ContactSectionProps {
  visible: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  onNavigateStop: (stopId: JourneyStopId) => void;
}

export default function ContactSection({
  visible,
  isMobile,
  reducedMotion,
  onNavigateStop,
}: ContactSectionProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  const variants = reducedMotion ? reducedRevealVariants : panelRevealVariants;
  const whatsappHref = getWhatsAppHref("Informazioni Autoscuola Prantini");
  const hasPhone = Boolean(businessConfig.phoneHref && businessConfig.phoneDisplay);

  const renderActions = () => (
    <div className="contact-actions">
      {whatsappHref ? (
        <a className="btn-primary" href={whatsappHref} target="_blank" rel="noreferrer">
          <span>WHATSAPP</span>
          <ArrowDiagonal />
        </a>
      ) : (
        <span className="btn-placeholder" title="Configura NEXT_PUBLIC_WHATSAPP_NUMBER in .env.local">
          WHATSAPP · DA CONFERMARE
        </span>
      )}

      {hasPhone ? (
        <a className="btn-secondary" href={businessConfig.phoneHref}>
          <span>CHIAMA · {businessConfig.phoneDisplay}</span>
          <ArrowDiagonal />
        </a>
      ) : (
        <span className="btn-placeholder" title="Configura phoneDisplay in src/data/configuration.ts">
          TELEFONO · DA CONFERMARE
        </span>
      )}

      <a
        className="btn-secondary"
        href={businessConfig.directionsUrl}
        target="_blank"
        rel="noreferrer"
      >
        <span>INDICAZIONI STRADALI</span>
        <ArrowDiagonal />
      </a>

      {isMobile && (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setInfoOpen(true)}
        >
          <span>INFO SEDE</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.section
            className="contact-destination"
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-labelledby="cavezzo-destination-title"
          >
            <div className="contact-destination__panel">
              <div className="editorial-panel__kicker">
                <span className="hairline-accent" />
                <span>
                  DESTINAZIONE FINALE · {businessConfig.city.toUpperCase()} ({businessConfig.province})
                </span>
              </div>

              <h2 id="cavezzo-destination-title" className="contact-destination__title">
                LA TUA STRADA
                <br />
                COMINCIA <span>QUI.</span>
              </h2>

              <p className="contact-destination__brand">
                {businessConfig.name.toUpperCase()} · {businessConfig.city}
              </p>

              {renderActions()}

              {!isMobile && (
                <>
                  <dl className="contact-meta-grid">
                    <div>
                      <dt>SEDE</dt>
                      <dd>
                        {businessConfig.streetAddress ||
                          `${businessConfig.city} (${businessConfig.province}) — indirizzo civico da confermare`}
                      </dd>
                    </div>
                    <div>
                      <dt>ORARI</dt>
                      <dd>{businessConfig.openingHours || "Da confermare con l'autoscuola"}</dd>
                    </div>
                    <div>
                      <dt>EMAIL</dt>
                      <dd>{businessConfig.email || "Da confermare prima della pubblicazione"}</dd>
                    </div>
                  </dl>

                  <nav className="contact-destination__nav" aria-label="Ripercorri il viaggio">
                    {journeyChapters.slice(0, 4).map((chapter) => (
                      <button
                        key={chapter.id}
                        type="button"
                        className="contact-nav-link"
                        onClick={() => onNavigateStop(chapter.id)}
                      >
                        <span>{chapter.index}</span> {chapter.navLabel}
                      </button>
                    ))}
                  </nav>
                </>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Drawer dettagli sede su mobile */}
      <AnimatePresence>
        {isMobile && infoOpen && visible && (
          <motion.div
            className="mobile-details-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.24 }}
            onClick={() => setInfoOpen(false)}
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
              aria-label="Dettagli sede Autoscuola Prantini"
            >
              <div className="mobile-details-drawer__head">
                <span className="editorial-panel__kicker">
                  {businessConfig.name.toUpperCase()} · {businessConfig.city.toUpperCase()}
                </span>
                <button
                  type="button"
                  className="fullscreen-menu__close"
                  onClick={() => setInfoOpen(false)}
                  aria-label="Chiudi dettagli sede"
                >
                  <span>CHIUDI</span>
                  <CloseIcon />
                </button>
              </div>

              <dl className="contact-meta-grid">
                <div>
                  <dt>SEDE</dt>
                  <dd>
                    {businessConfig.streetAddress ||
                      `${businessConfig.city} (${businessConfig.province}) — indirizzo civico da confermare`}
                  </dd>
                </div>
                <div>
                  <dt>ORARI</dt>
                  <dd>{businessConfig.openingHours || "Da confermare con l'autoscuola"}</dd>
                </div>
                <div>
                  <dt>EMAIL</dt>
                  <dd>{businessConfig.email || "Da confermare prima della pubblicazione"}</dd>
                </div>
              </dl>

              <nav className="contact-destination__nav" aria-label="Ripercorri il viaggio">
                {journeyChapters.slice(0, 4).map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    className="contact-nav-link"
                    onClick={() => {
                      setInfoOpen(false);
                      onNavigateStop(chapter.id);
                    }}
                  >
                    <span>{chapter.index}</span> {chapter.navLabel}
                  </button>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
