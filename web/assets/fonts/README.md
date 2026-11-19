Fonts for the generated team images (`src/lib/story-image.tsx`). `ImageResponse` needs TTF/OTF data,
so these are static instances of the Google Fonts originals, subset with fontTools:

- Instrument Sans 400 and 600 (width 100): Latin
- IBM Plex Mono 500: Latin and Cyrillic
- Noto Sans KR 400 and 600: Hangul and Cyrillic, the fallback for non-Latin titles and names

All three are under the SIL Open Font License 1.1 (the OFL-*.txt files here).
Source: https://github.com/google/fonts (ofl/instrumentsans, ofl/ibmplexmono, ofl/notosanskr).
