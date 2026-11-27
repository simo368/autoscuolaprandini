"use client";

import { useState } from "react";
import { businessConfig, carConfig, getWhatsAppHref, modelAttribution } from "@/data/configuration";
import {
  licenceCategories,
  recuperoPuntiService,
  rinnovoService,
  type LicenceCategoryId,
} from "@/data/services";
import { ArrowDiagonal } from "@/components/interface/Icons";

/**
 * Alternativa accessibile quando WebGL non è disponibile o viene disabilitato dal browser.
 * Comunica tutti i capitoli del viaggio, le categorie di patente e i contatti di Cavezzo.
 */
export default function FallbackExperience() {
  const [selected, setSelected] = useState<LicenceCategoryId>("b");
  const activeCat = licenceCategories.find((c) => c.id === selected) ?? licenceCategories[2];
  const whatsappHref = getWhatsAppHref();

  return (
    <main className="fallback-shell">
      <header className="fallback-header">
        <span className="brand-button__mark">
          P<span>.</span>
        </span>
        <span className="fallback-header__title">
          {businessConfig.name.toUpperCase()} · {businessConfig.city.toUpperCase()}
        </span>
      </header>

      <section className="fallback-hero">
        <span className="editorial-panel__kicker">
          <span className="hairline-accent" />
          00 / PARTENZA · {carConfig.modelLabel.toUpperCase()} {carConfig.modelYear}
        </span>
        <h1>OGNI STRADA INIZIA CON UNA SCELTA.</h1>
        <p>
          Esperienza informativa di {businessConfig.name}. Il tuo browser non ha WebGL attivo:
          puoi comunque consultare tutti i percorsi e i servizi.
        </p>
      </section>

      <section className="fallback-section" id="patenti">
        <span className="editorial-panel__kicker">STOP 01 · LE PATENTI</span>
        <h2>SCEGLI LA TUA DIREZIONE.</h2>
        <div className="category-tabs" role="tablist" aria-label="Categorie di patente">
          {licenceCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={cat.id === selected}
              className={`category-tab${cat.id === selected ? " is-selected" : ""}`}
              onClick={() => setSelected(cat.id)}
            >
              <span className="category-tab__code">{cat.code}</span>
              <span className="category-tab__meta">{cat.vehicleLabel}</span>
            </button>
          ))}
        </div>
        <div className="fallback-card">
          <h3>{activeCat.label} — {activeCat.headline}</h3>
          <p>{activeCat.description}</p>
          <ul className="editorial-list">
            {activeCat.focusPoints.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="fallback-section" id="rinnovo">
        <span className="editorial-panel__kicker">{rinnovoService.kicker}</span>
        <h2>{rinnovoService.title}</h2>
        <p>{rinnovoService.description}</p>
        <ul className="editorial-list">
          {rinnovoService.highlights.map((pt) => (
            <li key={pt}>{pt}</li>
          ))}
        </ul>
      </section>

      <section className="fallback-section" id="punti">
        <span className="editorial-panel__kicker">{recuperoPuntiService.kicker}</span>
        <h2>{recuperoPuntiService.title}</h2>
        <p>{recuperoPuntiService.description}</p>
        <ul className="editorial-list">
          {recuperoPuntiService.highlights.map((pt) => (
            <li key={pt}>{pt}</li>
          ))}
        </ul>
      </section>

      <section className="fallback-section fallback-section--dawn" id="contatti">
        <span className="editorial-panel__kicker">
          DESTINAZIONE FINALE · {businessConfig.city.toUpperCase()} ({businessConfig.province})
        </span>
        <h2>LA TUA STRADA COMINCIA QUI.</h2>
        <p>
          {businessConfig.name} · {businessConfig.city}
        </p>
        <div className="contact-actions">
          {whatsappHref ? (
            <a className="btn-primary" href={whatsappHref} target="_blank" rel="noreferrer">
              <span>WHATSAPP</span>
              <ArrowDiagonal />
            </a>
          ) : (
            <span className="btn-placeholder">WHATSAPP · DA CONFERMARE</span>
          )}
          {businessConfig.phoneHref ? (
            <a className="btn-secondary" href={businessConfig.phoneHref}>
              <span>CHIAMA · {businessConfig.phoneDisplay}</span>
              <ArrowDiagonal />
            </a>
          ) : (
            <span className="btn-placeholder">TELEFONO · DA CONFERMARE</span>
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
        </div>
      </section>

      <footer className="fallback-footer">
        <p className="contact-model-credit">
          3D model:{" "}
          <a href={modelAttribution.modelUrl} target="_blank" rel="noreferrer">
            {modelAttribution.modelTitle}
          </a>{" "}
          by{" "}
          <a href={modelAttribution.authorUrl} target="_blank" rel="noreferrer">
            {modelAttribution.authorName}
          </a>
          , licensed under{" "}
          <a href={modelAttribution.licenseUrl} target="_blank" rel="noreferrer">
            {modelAttribution.licenseLabel}
          </a>
          .
        </p>
      </footer>
    </main>
  );
}

