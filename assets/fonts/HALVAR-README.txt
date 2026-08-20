Halvar Breitschrift — APOLLO NEXT brand typeface
================================================

halvar-400.woff2 / halvar-500.woff2 are COMMERCIAL font software licensed to
APOLLO NEXT. They are deliberately NOT tracked in git (see .gitignore) because
this repository is public.

Consequences
------------
* A fresh clone has no Halvar files. The app still runs — every rule stacks
  "Halvar Breitschrift" -> "Archivo" -> system-ui, and font-display:optional
  means a missing face is simply never used. You get a system-font APOLLO.
* Deploys DO ship the fonts: wrangler uploads `[assets] directory = "./assets"`
  from the local filesystem, not from git. Copy the files in before deploying.
* `npm run predeploy` fails loudly if they are missing, so a deploy can never
  silently ship the fallback.

Where to get them
-----------------
See docs/PRIVATE.md.

Coverage (verified with fontTools)
----------------------------------
701 codepoints, 174 Cyrillic. Full Ukrainian: А-я, Ґ ґ Є є І і Ї ї,
apostrophes (U+2019, U+02BC), hryvnia U+20B4, numero U+2116.

IBM Plex Mono (ibmplexmono-*.woff2) is unrelated to the above: SIL OFL,
freely redistributable, tracked in git. See OFL-IBMPlexMono.txt.
The -cyrillic-400 file is the Cyrillic subset from @fontsource/ibm-plex-mono,
added because localized dates render in the mono face.
