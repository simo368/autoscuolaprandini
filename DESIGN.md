# DESIGN — Autoscuola Prantini

## Visual world
Automotive editorial / cinematic road film. Una singola narrazione accompagna una Renault Captur 2025 dalla notte all'alba.

## Palette
- Obsidian: `#090B0D`
- Graphite: `#20252A`
- Steel: `#646E76`
- Silver: `#ADB6BE`
- Ice: `#EFF2F4`

## Typography
Sans contemporanea con titoli grandi e compatti, body leggibile, etichette tecniche monospazio. Per la prima versione sono utilizzati font di sistema per non dipendere da font remoti.

## Motion thesis
- Focal moment: scroll storytelling della vettura, notte → blue hour → alba.
- Continuity: road line, progress verticale e transizione cromatica graduale.
- Feedback: menu fullscreen e hover discreti.
- Budget: limitare l'effetto principale alla scena sticky; animare soprattutto transform/opacity; supportare prefers-reduced-motion.

## Responsive
La scena mantiene il contrasto tra copy e veicolo su smartphone, riducendo il numero di dettagli e aumentando la dimensione tipografica. Le riprese finali dovranno prevedere un crop verticale dedicato.

## Asset truth
L'SVG della prima build è un segnaposto generico. Non rappresenta fedelmente il modello Renault Captur. Prima della release va sostituito con filmato reale autorizzato o asset 3D accurato e licenziato.
