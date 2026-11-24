# Media della Renault Captur

Inserire qui il filmato definitivo, esportato dalla vettura reale dell'autoscuola:

- Nome consigliato: `captur-drive.mp4`
- Formato: MP4 H.264, muted, senza audio incorporato
- Risoluzione desktop consigliata: 1920×1080 (creare una versione mobile dedicata)
- Durata indicativa: 30–45 secondi
- Inquadratura: tracking posteriore o tre-quarti posteriore, macchina sempre leggibile e cielo/strada con margine per sovratitoli
- Esportare con keyframe ravvicinati per favorire il seek durante lo scroll; testare su Safari iOS e Chrome Android
- Non inserire targhe, volti o altri dati personali visibili senza aver verificato i permessi

Dopo aver aggiunto il file, impostare `NEXT_PUBLIC_CAPTUR_FILM_SRC=/media/captur-drive.mp4` nel file `.env.local`.

Per un'esperienza mobile migliore, aggiungere anche `captur-drive-mobile.mp4` con crop verticale e impostare `NEXT_PUBLIC_CAPTUR_FILM_MOBILE_SRC=/media/captur-drive-mobile.mp4`.

La grafica SVG attualmente presente è soltanto un segnaposto stilizzato: non rappresenta fedelmente una Renault Captur e va sostituita con riprese reali o con un modello 3D accurato e con licenza adeguata.
