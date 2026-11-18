# Nærme PWA

Dette er en iPhone-vennlig prototype som kan åpnes i Safari og legges på Hjem-skjermen.

## Slik publiserer du den uten Mac

Den må ligge på en HTTPS-adresse for at PWA-funksjoner skal fungere best. En enkel løsning er GitHub Pages:

1. Opprett en gratis GitHub-konto.
2. Opprett et nytt repository, f.eks. `naerme`.
3. Last opp alle filene i denne mappen.
4. I repository: Settings → Pages → Deploy from branch → `main` → `/root`.
5. Åpne GitHub Pages-adressen på iPhone i Safari.
6. Trykk Del → Legg til på Hjem-skjermen.

## Hva denne prototypen gjør

- Kart
- Stedssøk
- Påminnelser
- Radius 100 m–2 km
- Lokal lagring
- Geolokasjon
- Proximity-sjekk når appen er aktiv
- Varsel i nettleseren hvis tillatt

## Viktig begrensning

Dette er en PWA-prototype, ikke en full native iOS-app. Safari/web-apper har ikke samme bakgrunns-geofencing som Core Location i en native app. For en produksjonsapp som skal varsle pålitelig mens appen er lukket, bør vi senere bygge en native iOS-versjon og distribuere den via TestFlight/App Store.

OpenStreetMap/Nominatim brukes til kart og stedsøk i prototypen. For produksjon bør vi vurdere en kommersiell kart-/søketjeneste og deres vilkår/rate limits.


## Viktig på iPhone
Åpne siden i Safari og velg **Del → Legg til på Hjem-skjermen**. Start deretter Nærme fra det nye ikonet. Denne versjonen lagrer påminnelser med en verifisert lokal lagring og gir en tydelig feilmelding hvis Safari nekter lagring.
