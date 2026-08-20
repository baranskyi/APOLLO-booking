/**
 * Design tokens and page CSS.
 *
 * Inlined rather than served as a file, deliberately: the §7 budget is a <1 s
 * full load on mobile 4G with the whole page under 80 KB gzip, and a separate
 * stylesheet costs a round trip that a few KB of inline CSS does not. That
 * budget is HTML+CSS+JS only (spec §7); fonts are their own resource class —
 * fetched async, never blocking first paint, and a returning visitor pays
 * the ~120 KB combined cost once, cached long past any single page's budget.
 *
 * Tokens are the APOLLO NEXT brand system. Halvar Breitschrift carries the
 * whole voice (display AND body — the brand uses one face for both); IBM Plex
 * Mono handles times, slugs and code. All are self-hosted under assets/fonts/
 * rather than called at runtime, so a visitor's request never leaves this
 * origin. Halvar is commercial and therefore untracked in git — see
 * assets/fonts/HALVAR-README.txt for what a clone without it renders.
 *
 * `font-display: optional`, not `swap`, on every face: whichever font the
 * first paint uses is the font the page KEEPS — the brand face when it's
 * ready in time (nearly always: every used file is preloaded in shellHead
 * and served same-origin from the edge), the system stack otherwise. Swap
 * repainted the whole page mid-view as each face arrived, which read as the
 * layout "loading in real time" — text shifting under the visitor on every
 * cold cache. The system stacks after each face are that fallback, and the
 * total fallback if a self-hoster strips assets/fonts/ from their deploy.
 */

/**
 * Halvar ships NO unicode-range: the UI is Ukrainian, so every page needs the
 * Cyrillic in it and range-gating the brand face would only add a rule the
 * browser always satisfies. The 500 face declares `font-weight:500 800` — the
 * brand book's own trick (Halvar ships Regular and Medium only), so the 600
 * and 700 that BASE_CSS already sets resolve to real Medium rather than a
 * synthesised faux-bold.
 *
 * IBM Plex Mono keeps the range split, because it genuinely has two jobs:
 * Latin for slugs/keys/code, Cyrillic for the localized dates that render in
 * .pu-time. A browser fetches whichever the page actually needs.
 */
export const FONT_FACES = `
@font-face{font-family:"Halvar Breitschrift";font-style:normal;font-weight:400;font-display:optional;
  src:url(/fonts/halvar-400.woff2) format("woff2")}
@font-face{font-family:"Halvar Breitschrift";font-style:normal;font-weight:500 800;font-display:optional;
  src:url(/fonts/halvar-500.woff2) format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:400;font-display:optional;
  src:url(/fonts/ibmplexmono-400.woff2) format("woff2");
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:400;font-display:optional;
  src:url(/fonts/ibmplexmono-cyrillic-400.woff2) format("woff2");
  unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:600;font-display:optional;
  src:url(/fonts/ibmplexmono-600.woff2) format("woff2");
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
`

export const TOKENS = `
/* APOLLO NEXT palette. Black is the stage, Ignite orange is the call (one
   per viewport), Signal blue is the contract — links and anything
   transactional. The --pu-green-* names are kept verbatim from upstream: they
   are load-bearing across ~1000 references and renaming them would be pure
   churn, so read "green" as "the accent family" throughout this file.
   --pu-green-700/800 are Signal blue; --pu-green-fill/-hover are Ignite. */
:root{
  --pu-ink-950:#000000; --pu-ink-900:#181818; --pu-ink-700:#1D1D1D;
  --pu-ink-500:#3A3A3A; --pu-paper:#FFFFFF; --pu-paper-dim:#F0F0EE;
  --pu-line:#D9D9D9; --pu-green-700:#004FE8; --pu-green-800:#003CB5;
  --pu-signal:#FF6424; --pu-green-tint:#FFE3D6; --pu-danger:#FF2424;
  --pu-danger-800:#E01F1F; --pu-danger-text:#D41A1A; --pu-danger-tint:#FFE5E5;
  /* Ignite, behind the black label set by --pu-text-on-accent below. Stays
     pinned across BOTH themes — unlike --pu-green-700/800, which brighten in
     dark mode because they double as body links there. #FF6424 needs no
     per-theme reading of its own: black on it is 7.1:1 either way, which is
     also why the label is black and not the brand book's white (white on
     Ignite is 2.95:1 — below AA even for large text, and darkening the fill
     until white passes turns the brand orange brown). */
  --pu-green-fill:#FF6424; --pu-green-fill-hover:#E25517;
  /* Warn — added for the semantic layer below. Fill/border stays one
     value across themes, same discipline as --pu-green-fill above; a
     separate -text variant is redefined per theme below because #F5A623
     itself is ~1.9:1 on light paper (fine as a small border/icon, fails AA
     as text) and ~9:1 on dark paper (fine either way), so light mode needs a
     darkened amber for readable text while dark mode can stay near the
     brand hue. */
  --pu-warn:#F5A623; --pu-warn-text:#92400E; --pu-warn-tint:#FCEFD9;
  /* One face for display and body — the brand runs Halvar everywhere, so
     these two tokens are deliberately the same stack rather than a pairing.
     Archivo is the nearest widely-installed geometric industrial grotesk and
     stands in when the licensed file is absent (a public clone, see
     assets/fonts/HALVAR-README.txt). */
  --pu-font-display:"Halvar Breitschrift","Archivo",system-ui,-apple-system,sans-serif;
  --pu-font-ui:"Halvar Breitschrift","Archivo",system-ui,-apple-system,sans-serif;
  --pu-font-mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  /* The squircle scale. --pu-radius-pill is the brand's signature: every
     button and single-line input is a full pill. -lg is 32 rather than the
     brand book's 40 for cards, because this is dense utility UI and a 40px
     corner starts eating the calendar grid inside it. */
  --pu-radius:12px; --pu-radius-lg:32px; --pu-radius-pill:999px;
  --pu-shadow-sm:0 1px 2px rgba(0,0,0,.06);
  --pu-ring:0 0 0 4px color-mix(in srgb,var(--pu-green-700) 12%,transparent);
  /* Code blocks (docs pages): deliberately NOT redefined under the dark-mode
     media query or [data-theme=dark] below — a code panel that's always a
     dark "terminal" surface reads clearly against either a light or dark
     page background, which is simpler and more reliable than trying to keep
     a code block's syntax contrast correct across two flipped palettes. */
  --pu-code-bg:#0C0C0C; --pu-code-fg:#F0F0EE; --pu-code-line:#222222;

  /* ---------------------------------------------------------------------
   * Semantic layer. Product UI states, one level above the raw
   * palette above — components should reach for these, not for
   * --pu-ink-*, --pu-green-*, --pu-danger or --pu-warn directly, so a future
   * repaint of the brand only ever touches this block.
   *
   * Every value here is a var() onto a primitive already defined above
   * (or, where a state needs a light/dark-specific reading and the flipped
   * primitive doesn't fit, a literal redefined per theme below — never a
   * color that exists ONLY inside a dark-mode block).
   * ------------------------------------------------------------------- */

  /* Surface: canvas < raised < sunken, by how far off the base page a thing
     sits. "raised" is the same fill as canvas on light (elevation reads via
     --pu-shadow-sm/border, exactly how .pu-card already works) but goes
     lighter than canvas in dark mode below, because a drop shadow barely
     reads against a near-black page — dark-mode elevation has to come from
     value contrast instead. "overlay" is new: nothing in the product uses a
     modal/backdrop yet, but a scrim still needs to read as "a wash over
     content" on either theme, so it is a plain ink-tinted rgba() in light
     mode and a plain black rgba() in dark mode below — not composed from
     any other token, since nothing else in the palette is meant to be used
     at partial opacity over arbitrary content. */
  --pu-surface-canvas:var(--pu-paper);
  --pu-surface-raised:var(--pu-paper);
  --pu-surface-sunken:var(--pu-paper-dim);
  --pu-surface-overlay:rgba(0,0,0,.45);

  /* Text: primary/secondary track --pu-ink-950/--pu-ink-500 verbatim — they
     already flip for dark mode below the same way. "muted" and "disabled"
     are new, both ink-500 with alpha baked in (not the bare token plus a
     sibling opacity rule) so a single custom property is the full color
     in either theme. "disabled" alpha (.45) matches the treatment
     .pu-day[aria-disabled] already shipped; "muted" (.72) is one step above
     it — dim enough to read as decoration, e.g. table timestamps, not body
     copy — deliberately sub-AA at 3.2:1 (large-text tier only), same trade
     already accepted for e.g. .pu-cal-head. */
  --pu-text-primary:var(--pu-ink-950);
  --pu-text-secondary:var(--pu-ink-500);
  --pu-text-muted:rgba(58,58,58,.72);
  /* Black, not white: every accent fill in this system is Ignite orange or
     Redline, and both carry black text far better than white (7.1:1 and
     5.5:1, against 2.95:1 and 3.8:1). One token decides it everywhere. */
  --pu-text-on-accent:#000000;
  --pu-text-disabled:rgba(58,58,58,.45);

  /* Border: subtle = --pu-line's existing job. strong = a border with more
     presence than a hairline but no status meaning (e.g. a divider that
     needs to read on its own, not next to a card's shadow) — set to
     --pu-ink-500 rather than a new hex, so "strong border" and "secondary
     text" are always the same value by construction. focus reuses
     --pu-green-700, matching :focus-visible's existing outline color below
     — a11y focus indication is expected to borrow the accent; that is a
     different thing from rule 1's "system states don't get the accent",
     which is about background/fill states like held/booked, not the
     global focus ring. */
  --pu-border-subtle:var(--pu-line);
  --pu-border-strong:var(--pu-ink-500);
  --pu-border-focus:var(--pu-green-700);

  /* Status: independent decisions, not aliases of whatever the marketing
     palette (docs/branding/assets/tokens.css) happens to alias.
     - success reuses --pu-green-700, NOT --pu-signal. --pu-signal is a
       fixed, always-vivid accent meant for a small dot (the wordmark colon,
       a status pip) and is never contrast-managed for use as text — using
       it here would mean unreadable status text the day someone sets it as
       a label color. --pu-green-700 already does the light/dark contrast
       flip a status text color needs (5.0:1 light, 7.8:1 dark — see
       styles.ts's own note above on why fills stay pinned but this token
       doesn't).
     - danger/warning follow the same shape: a text-safe color plus a light
       tint for a badge/callout background.
     - info deliberately has NO owned hue. The brand system is one green +
       conventional danger/warn — a blue "info" would be a hue the
       brand doesn't own and no page currently needs one. .pu-docs-callout
       already renders informational asides in neutral ink-on-sunken-surface
       with no color at all; --pu-status-info/-bg codify that as the
       intentional choice rather than leaving it undocumented. */
  --pu-status-success:var(--pu-green-700);
  /* A literal, not var(--pu-green-tint): that tint is Ignite's, and Ignite
     belongs to the guest's own pick in the slot picker (rule below), never to
     a system verdict. This is Signal blue at ~8% — blue status text on it
     reads 5.9:1. Redefined per theme below, like every other literal here. */
  --pu-status-success-bg:#E8EFFD;
  --pu-status-danger:var(--pu-danger-text);
  --pu-status-danger-bg:var(--pu-danger-tint);
  --pu-status-warning:var(--pu-warn-text);
  --pu-status-warning-bg:var(--pu-warn-tint);
  --pu-status-info:var(--pu-text-secondary);
  --pu-status-info-bg:var(--pu-surface-sunken);

  /* Slot: the booking flow's own state machine (see src/core/slot-state.ts).
     Rule: held/booked are visually distinct from available
     WITHOUT the accent — the accent is the guest's own current pick
     (hover/selected), never a system state. held borrows the warning hue
     (in flux, someone else is mid-booking, may free up); booked borrows the
     neutral surface/border family (settled, permanently gone — distinct
     hue from held on purpose, so the two read as different kinds of
     unavailable, not different intensities of the same one). past and
     outside-notice-window are both neutral too, and stay distinguishable
     from booked and each other structurally (see .pu-slot-past/
     .pu-slot-outside-notice border-style/opacity in BASE_CSS below), not
     just by color, so the distinction survives greyscale. */
  --pu-slot-available-bg:var(--pu-surface-raised);
  --pu-slot-available-border:var(--pu-border-subtle);
  --pu-slot-available-text:var(--pu-text-primary);
  --pu-slot-hover-bg:var(--pu-green-tint);
  --pu-slot-hover-border:var(--pu-green-fill);
  --pu-slot-hover-text:var(--pu-text-primary);
  --pu-slot-selected-bg:var(--pu-green-tint);
  --pu-slot-selected-border:var(--pu-green-fill);
  --pu-slot-selected-text:var(--pu-text-primary);
  --pu-slot-held-bg:var(--pu-warn-tint);
  --pu-slot-held-border:var(--pu-warn);
  --pu-slot-held-text:var(--pu-warn-text);
  --pu-slot-booked-bg:var(--pu-surface-sunken);
  --pu-slot-booked-border:var(--pu-border-subtle);
  --pu-slot-booked-text:var(--pu-text-disabled);
  --pu-slot-past-bg:var(--pu-surface-canvas);
  --pu-slot-past-border:transparent;
  --pu-slot-past-text:var(--pu-text-muted);
  --pu-slot-outside-notice-bg:var(--pu-surface-raised);
  --pu-slot-outside-notice-border:var(--pu-border-subtle);
  --pu-slot-outside-notice-text:var(--pu-text-muted);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme=light]){
    --pu-paper:#000000; --pu-paper-dim:#181818; --pu-line:#2E2E2E;
    --pu-ink-950:#FFFFFF; --pu-ink-500:#BDBDBD; --pu-green-700:#4D8DFF;
    --pu-green-800:#7AAAFF; --pu-green-tint:#3D1F10; --pu-danger-text:#FF4D4D;
    --pu-danger-tint:#3D1212; --pu-warn-text:#FBBF24; --pu-warn-tint:#3A2C12;
    --pu-shadow-sm:0 1px 2px rgba(0,0,0,.4);
    --pu-surface-raised:#181818;
    --pu-status-success-bg:#0F1D3D;
    --pu-text-muted:rgba(189,189,189,.72); --pu-text-disabled:rgba(189,189,189,.45);
    --pu-surface-overlay:rgba(0,0,0,.6);
  }
}
:root[data-theme=dark]{
  --pu-paper:#000000; --pu-paper-dim:#181818; --pu-line:#2E2E2E;
  --pu-ink-950:#FFFFFF; --pu-ink-500:#BDBDBD; --pu-green-700:#4D8DFF;
  --pu-green-800:#7AAAFF; --pu-green-tint:#3D1F10; --pu-danger-text:#FF4D4D;
  --pu-danger-tint:#3D1212; --pu-warn-text:#FBBF24; --pu-warn-tint:#3A2C12;
  --pu-shadow-sm:0 1px 2px rgba(0,0,0,.4);
  --pu-surface-raised:#181818;
  --pu-status-success-bg:#0F1D3D;
  --pu-text-muted:rgba(189,189,189,.72); --pu-text-disabled:rgba(189,189,189,.45);
  --pu-surface-overlay:rgba(0,0,0,.6);
}
`

/**
 * Design notes (kept here, not as comments inside the template literal below,
 * because every byte inside BASE_CSS ships in the response):
 *
 * - .pu-event-header has no card box: it leads the page, the calendar/slot
 *   cards below it are the task.
 * - Calendar availability and "today" are both marked by shape + weight, not
 *   colour alone — a dot under the number for bookable days, a bar above it
 *   for today — so the distinction survives greyscale/colour-blind viewing.
 * - .pu-slot-chosen is a static echo of the slot picker on the confirm page:
 *   the picker itself has no persisted "selected" state because each slot is
 *   a navigation, not a client-side selection (no JS on this page).
 * - input/select/textarea get a red border via :has(+ .pu-err) — CSS-only,
 *   no per-field error class needed from the route.
 * - .pu-confirm-icon is the brand mark verbatim (the "dot at twelve" ring
 *   from docs' mark.svg: bold arc open at twelve, the dot landed in the
 *   gap = arrived on time). Same geometry, not a redraw — the ring is
 *   currentColor so it flips with the theme; only the dot is green.
 */
export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--pu-surface-canvas);color:var(--pu-text-primary);
  font-family:var(--pu-font-ui);line-height:1.5;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:var(--pu-font-display);font-weight:600;line-height:1.1;
  letter-spacing:-.015em;margin:0 0 .5rem}
h1{font-size:1.5rem} h2{font-size:1.125rem} h3{font-size:1rem}
p{margin:0 0 .75rem}
a{color:var(--pu-green-700)}
time,.pu-time{font-family:var(--pu-font-mono);font-variant-numeric:tabular-nums}
::selection{background:var(--pu-green-fill);color:var(--pu-text-on-accent)}

.pu-wrap{max-width:900px;margin:0 auto;padding:1.5rem 1rem 4rem}
.pu-card{background:var(--pu-surface-raised);border:1px solid var(--pu-border-subtle);
  border-radius:var(--pu-radius-lg);padding:1.75rem;box-shadow:var(--pu-shadow-sm)}
.pu-muted{color:var(--pu-text-secondary)}
/* Host identity block atop a booking page — a person, not a label, so the
   name is set in the display face at text size (never uppercase/tracked:
   this is who the guest is meeting, not a section heading). The company gets
   its own muted line rather than a comma splice, so the two facts read at
   different weights the way they matter differently. */
.pu-host{display:flex;align-items:center;gap:.875rem;margin:0 0 1.25rem}
.pu-host-name{margin:0;font-family:var(--pu-font-display);font-size:1.0625rem;
  font-weight:600;line-height:1.3;color:var(--pu-text-primary)}
.pu-host-org{margin:.1rem 0 0;font-size:.875rem;line-height:1.35;color:var(--pu-text-secondary)}
.pu-host-link{color:var(--pu-green-700);text-decoration:none}
.pu-host-link:hover{text-decoration:underline}
/* The wordmark is an inline SVG (src/http/brand.ts) painted with
   currentColor, so it takes the ink of whatever surface it sits on — white in
   the black dashboard bar, ink in a light footer, white again in dark mode —
   from one asset. Height alone sizes it; the viewBox carries the aspect. */
.pu-mark{display:inline-flex;align-items:center;text-decoration:none;
  color:var(--pu-text-primary)}
.pu-mark svg{display:block;width:auto;height:1.375rem}

.pu-grid{display:grid;gap:1.5rem;grid-template-columns:1fr}
@media(min-width:780px){.pu-grid{grid-template-columns:300px 1fr}}

.pu-event-header{padding:0 0 1.5rem;margin:0 0 1.5rem;border-bottom:1px solid var(--pu-line)}
.pu-event-header h1{font-size:1.75rem;margin:0 0 .5rem}
.pu-event-header .pu-meta{margin-top:.85rem}

.pu-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.pu-cal-head{font-size:.75rem;font-weight:600;text-align:center;color:var(--pu-text-secondary);padding:.25rem 0}
.pu-day{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;
  border:1px solid transparent;border-radius:var(--pu-radius);background:none;
  font:inherit;font-family:var(--pu-font-mono);font-size:.9375rem;cursor:pointer;
  color:var(--pu-text-primary);text-decoration:none;transition:all .12s ease}
/* Bookable days carry Ignite's tint. The NUMBER stays ink rather than taking
   the accent as text — orange on its own tint is 2.4:1, unreadable; weight
   and the tint already mark the day. */
.pu-day[data-has-slots="1"]{background:var(--pu-green-tint);color:var(--pu-text-primary);font-weight:700}
.pu-day[aria-disabled="true"]{color:var(--pu-text-disabled);cursor:default}
.pu-day[aria-current="date"]{box-shadow:inset 0 0 0 2px var(--pu-border-focus);font-weight:700}
.pu-day:hover[data-has-slots="1"]{background:var(--pu-green-fill);color:var(--pu-text-on-accent);transform:translateY(-1px)}
.pu-day:focus-visible,.pu-slot:focus-visible,.pu-btn:focus-visible{
  outline:2px solid var(--pu-border-focus);outline-offset:2px}
input:focus-visible,select:focus-visible,textarea:focus-visible{
  outline:2px solid var(--pu-border-focus);outline-offset:1px;box-shadow:var(--pu-ring)}

.pu-slots{display:grid;gap:.625rem;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
  max-height:60vh;overflow-y:auto;padding:2px}
/* Base .pu-slot is layout/typography only — every color comes from the
   .pu-slot-* state modifier (see src/core/slot-state.ts's
   slotStateClassName, which always pairs "pu-slot" with exactly one of
   these) so a slot's appearance is never a color chosen ad hoc at a call
   site. */
.pu-slot{padding:.75rem .5rem;border:1px solid var(--pu-line);border-radius:var(--pu-radius);
  font-family:var(--pu-font-mono);font-size:.9375rem;font-weight:600;
  text-align:center;text-decoration:none;display:block;transition:all .12s ease}
.pu-slot-available{background:var(--pu-slot-available-bg);border-color:var(--pu-slot-available-border);
  color:var(--pu-slot-available-text);cursor:pointer}
.pu-slot-available:hover{background:var(--pu-slot-hover-bg);border-color:var(--pu-slot-hover-border);
  color:var(--pu-slot-hover-text);box-shadow:var(--pu-shadow-sm);transform:translateY(-1px)}
.pu-slot-available:active{background:var(--pu-green-fill);border-color:var(--pu-green-fill);
  color:var(--pu-text-on-accent);transform:translateY(0)}
.pu-slot-selected{background:var(--pu-slot-selected-bg);border-color:var(--pu-slot-selected-border);
  color:var(--pu-slot-selected-text)}
/* held/booked/past/outside-notice-window are never links (see
   isInteractiveSlotState) — cursor/pointer-events say so even if a caller
   ever renders one as an <a> by mistake. Distinguished from each other by
   more than hue alone: held keeps a solid border (still "there", just not
   yours to take right now), booked adds a strikethrough on the time
   (settled, gone), past drops its border to blend into the canvas and dims
   further (simply elapsed, nothing to look at), outside-notice-window
   keeps a full card but switches to a dashed border (exists, just not
   bookable yet) — so the four read as different reasons, not four
   opacities of the same greyed-out slot. */
.pu-slot-held,.pu-slot-booked,.pu-slot-past,.pu-slot-outside-notice{cursor:not-allowed;pointer-events:none}
.pu-slot-held{background:var(--pu-slot-held-bg);border-color:var(--pu-slot-held-border);
  color:var(--pu-slot-held-text)}
.pu-slot-booked{background:var(--pu-slot-booked-bg);border-color:var(--pu-slot-booked-border);
  color:var(--pu-slot-booked-text)}
.pu-slot-booked time{text-decoration:line-through}
.pu-slot-past{background:var(--pu-slot-past-bg);border-color:var(--pu-slot-past-border);
  color:var(--pu-slot-past-text);opacity:.7}
.pu-slot-outside-notice{background:var(--pu-slot-outside-notice-bg);
  border-color:var(--pu-slot-outside-notice-border);border-style:dashed;
  color:var(--pu-slot-outside-notice-text)}

.pu-slot-chosen{display:flex;align-items:center;gap:.75rem;margin:0 0 1.25rem;
  padding:.85rem 1rem;border:1px solid var(--pu-slot-selected-border);border-radius:var(--pu-radius);
  background:var(--pu-slot-selected-bg)}
.pu-slot-chosen .pu-dot-lg{flex:0 0 auto;width:.65rem;height:.65rem;border-radius:99px;
  background:var(--pu-green-fill)}

/* The brand's signature control: a full pill, label in Medium caps on +8%
   tracking. Callers pass sentence-case copy — the uppercasing is presentation
   and belongs here, so a label is never shouted in the source string. */
.pu-btn{display:inline-block;padding:.8rem 1.5rem;border-radius:var(--pu-radius-pill);
  background:var(--pu-green-fill);color:var(--pu-text-on-accent);border:1px solid var(--pu-green-fill);
  font:inherit;font-family:var(--pu-font-display);font-weight:500;font-size:.875rem;
  text-transform:uppercase;letter-spacing:.08em;
  cursor:pointer;text-decoration:none;text-align:center;
  transition:all .12s ease}
.pu-btn:hover{background:var(--pu-green-fill-hover);border-color:var(--pu-green-fill-hover)}
.pu-btn[disabled]{opacity:.6;cursor:default}
/* Ghost is Signal blue outline — the brand's secondary action. Inside the
   black dashboard bar it is overridden to a white hairline (see
   .pu-dash-header below), where blue-on-black would fail. */
.pu-btn-ghost{background:none;color:var(--pu-green-700);border-color:var(--pu-green-700)}
.pu-btn-ghost:hover{background:color-mix(in srgb,var(--pu-green-700) 7%,transparent);
  border-color:var(--pu-green-800);color:var(--pu-green-800)}
/* --pu-danger, not --pu-status-danger: a solid fill behind a label needs the
   same "pinned across themes" treatment as --pu-green-fill above —
   --pu-status-danger tracks --pu-danger-text, which deliberately brightens
   in dark mode for readability as TEXT and would drop this button's
   contrast the same way sharing --pu-green-700 would have. The label is
   black (--pu-text-on-accent): 5.5:1 on Redline, where white is 3.8:1. */
.pu-btn-danger{background:var(--pu-danger);border-color:var(--pu-danger);color:var(--pu-text-on-accent)}
.pu-btn-danger:hover{background:var(--pu-danger-800);border-color:var(--pu-danger-800)}

/* Field labels are set like the brand's technical captions — small caps on
   wide tracking. In the display face, not the mono one the brand book shows:
   these read in Ukrainian, and a monospaced caps label of "МІНІМАЛЬНИЙ ЧАС
   ДО ЗУСТРІЧІ" is half again as wide for no gain. */
label{display:block;font-family:var(--pu-font-display);font-size:.6875rem;
  font-weight:500;letter-spacing:.12em;text-transform:uppercase;
  color:var(--pu-text-secondary);margin:1rem 0 .45rem}
/* Single-line controls match the CTA geometry — pills. A textarea does not:
   a pill around several lines of prose reads as a speech bubble, so it takes
   the plain squircle instead. */
input,select,textarea{width:100%;padding:.8rem 1.25rem;border:1px solid var(--pu-line);
  border-radius:var(--pu-radius-pill);background:var(--pu-paper);color:var(--pu-ink-950);
  font:inherit;transition:border-color .12s ease}
textarea{min-height:5rem;resize:vertical;border-radius:var(--pu-radius-lg)}
input:has(+ .pu-err),select:has(+ .pu-err),textarea:has(+ .pu-err){border-color:var(--pu-status-danger)}
.pu-err{display:flex;align-items:flex-start;gap:.4rem;color:var(--pu-status-danger);
  font-size:.8125rem;margin:.4rem 0 0}
.pu-err::before{content:"!";flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;
  width:1rem;height:1rem;margin-top:.0625rem;border-radius:99px;background:var(--pu-danger);
  color:var(--pu-text-on-accent);font-size:.6875rem;font-weight:700;line-height:1}
/* A standing caution, not a one-line field error — normal block text flow
   (not .pu-err's flex layout, which mangles a multi-sentence paragraph with
   inline <code> into separate flex items) with its own visual weight. */
.pu-callout{background:var(--pu-status-danger-bg);border:1px solid var(--pu-danger);
  border-radius:var(--pu-radius);padding:.75rem 1rem;font-size:.875rem;color:var(--pu-text-primary)}
/* The brand's tag chip: outlined pill, small caps, tracked. Call sites that
   inline-override background/color (a filled variant) still work — this only
   changes the default and the type treatment. */
.pu-badge{display:inline-block;padding:.25rem .7rem;border-radius:var(--pu-radius-pill);
  font-family:var(--pu-font-display);font-size:.6875rem;font-weight:500;
  letter-spacing:.1em;text-transform:uppercase;
  background:transparent;border:1px solid currentColor;color:var(--pu-status-success)}
.pu-dot{display:inline-block;width:.5rem;height:.5rem;border-radius:99px;
  background:var(--pu-signal);vertical-align:middle}
/* align-items:center, not the default stretch: the timezone control is a
   bordered box taller than the text items, and without centering every
   plain-text item top-aligns against it — the whole line reads crooked. */
.pu-meta{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1rem;font-size:.875rem;color:var(--pu-text-secondary);
  list-style:none;padding:0;margin:.5rem 0 0}
.pu-tz-form{display:inline-flex;align-items:center;max-width:100%}
/* A real control, not dotted-underline text a guest never notices is
   interactive: one bordered block — globe, zone, offset, chevron — on the
   system radius, not a pill (nothing else on the page is a pill). The
   border and focus state live on the WRAP so all four pieces read as a
   single control; the select inside is borderless and sized to the selected
   zone's name server-side (a bare <select> is otherwise as wide as its
   widest option, leaving dead space before the chevron). Pill, like every
   other single-line control in this brand. The chevron is a
   CSS-drawn corner, not a data-URI image, so it takes its color from a
   token and stays correct in both themes. Focus is shown by border color
   plus the shared input ring — an outline on top of a border reads as a
   clumsy double ring (and Chrome applies :focus-visible to selects even on
   mouse click).*/
.pu-tz-wrap{position:relative;display:inline-flex;align-items:center;max-width:100%;
  border:1px solid var(--pu-border-subtle);border-radius:var(--pu-radius-pill);
  background:var(--pu-surface-raised);transition:border-color .12s ease}
.pu-tz-wrap:hover{border-color:var(--pu-border-strong)}
.pu-tz-wrap:focus-within{border-color:var(--pu-border-focus);box-shadow:var(--pu-ring)}
.pu-tz-globe{position:absolute;left:.8rem;color:var(--pu-text-secondary);pointer-events:none}
.pu-tz-wrap::after{content:"";position:absolute;right:.7rem;top:50%;width:.4rem;height:.4rem;
  border-right:1.5px solid var(--pu-text-secondary);border-bottom:1.5px solid var(--pu-text-secondary);
  transform:translateY(-70%) rotate(45deg);pointer-events:none}
.pu-tz-select{appearance:none;-webkit-appearance:none;max-width:100%;min-width:0;
  padding:.3rem 0 .3rem 2.2rem;border:0;border-radius:var(--pu-radius-pill);outline:none;
  background:transparent;color:var(--pu-text-primary);font:inherit;font-size:.875rem;
  cursor:pointer;text-overflow:ellipsis}
/* Outranks the global select:focus-visible ring — focus indication for this
   control is the wrap's :focus-within border+ring above, and both firing at
   once is the double-ring this replaced. */
.pu-tz-select:focus-visible{outline:none;box-shadow:none}
/* Overlaid decoration, not a flex sibling: the SELECT spans the whole
   bordered control (its width and right padding reserve this label's space
   via the inline calc), so every pixel inside the border — offset and
   chevron included — opens the picker. A sibling taking its own flex space
   would leave the control's right half click-dead. */
.pu-tz-offset{position:absolute;right:1.7rem;top:50%;transform:translateY(-50%);
  font-size:.8125rem;color:var(--pu-text-secondary);white-space:nowrap;pointer-events:none}

.pu-confirm{text-align:center;padding:2rem 1.5rem}
.pu-confirm-icon{display:block;margin:0 auto .75rem;color:var(--pu-text-primary)}
.pu-ring-arc{stroke:currentColor}
.pu-ring-dot{fill:var(--pu-signal)}
.pu-confirm h1{margin:.15rem 0 .35rem}
.pu-confirm-details{text-align:left;list-style:none;margin:1.25rem 0;padding:1rem 1.25rem;
  background:var(--pu-surface-sunken);border-radius:var(--pu-radius);display:grid;gap:.6rem}
.pu-confirm-details div{display:flex;justify-content:space-between;align-items:baseline;
  gap:1rem;flex-wrap:wrap}
.pu-confirm-details dt{color:var(--pu-text-secondary);font-size:.8125rem;font-weight:600;margin:0}
.pu-confirm-details dd{margin:0;text-align:right}

.pu-nav-link{text-decoration:none;color:var(--pu-text-secondary);font-weight:500;
  font-size:.8125rem;letter-spacing:.1em;text-transform:uppercase;
  padding:.35rem 0;border-bottom:2px solid transparent}
.pu-nav-link:hover{color:var(--pu-text-primary)}
.pu-nav-link[aria-current="page"]{color:var(--pu-text-primary);font-weight:600;
  border-bottom-color:var(--pu-green-fill)}
/* The header is a black bar in BOTH themes — in this brand black is the
   stage, not a dark-mode reading of a light surface, so it is a literal here
   rather than a surface token that would flip to white in light mode. Its
   children are re-coloured for that fixed ground below. */
.pu-dash-header{background:#000000;color:#FFFFFF;border-radius:var(--pu-radius-lg);
  padding:.9rem 1.25rem}
.pu-dash-header .pu-mark{color:#FFFFFF}
.pu-dash-header .pu-nav-link{color:rgba(255,255,255,.75)}
.pu-dash-header .pu-nav-link:hover{color:#FFFFFF}
.pu-dash-header .pu-nav-link[aria-current="page"]{color:#FFFFFF;
  border-bottom-color:var(--pu-green-fill)}
.pu-dash-header .pu-btn-ghost{color:#FFFFFF;border-color:rgba(255,255,255,.35)}
.pu-dash-header .pu-btn-ghost:hover{background:rgba(255,255,255,.1);
  border-color:rgba(255,255,255,.6);color:#FFFFFF}
/* Narrow enough that the nav's own wrapping (5 links) collides with the
   header's justify-content:space-between — one link stranded on its own row
   with the sign-out button, uneven gaps either side. Stacking the three
   header children instead of trying to keep them in one wrapping row reads
   as intentional rather than as an overflow accident. */
@media(max-width:480px){
  .pu-dash-header{flex-direction:column;align-items:flex-start}
}

.pu-url{display:flex;align-items:center;gap:.5rem;background:var(--pu-surface-sunken);
  border:1px solid var(--pu-line);border-radius:var(--pu-radius-pill);padding:.15rem .15rem .15rem 1rem}
.pu-url-input{flex:1;min-width:0;border:0;background:none;padding:.5rem 0;
  font-family:var(--pu-font-mono);font-size:.8125rem;color:var(--pu-text-primary);cursor:pointer}
/* Fixed width, so "Copy" -> "Copied" feedback doesn't shift the layout. */
.pu-copy{flex:none;min-width:4.5rem;padding:.4rem .6rem;font-size:.8125rem}

/* Settings: one profile panel — photo column left, identity fields right.
   The photo column is a fixed rail so the fields column defines the card's
   rhythm; on narrow screens the rail stacks on top, centred. */
.pu-profile{display:flex;gap:2rem;align-items:flex-start;margin-top:1rem}
.pu-profile-photo{flex:none;display:flex;flex-direction:column;align-items:center;gap:.6rem;width:8.5rem}
.pu-profile-fields{flex:1;min-width:0}
.pu-profile-fields label:first-of-type{margin-top:0}
@media(max-width:540px){.pu-profile{flex-direction:column;align-items:center}
  .pu-profile-fields{width:100%}}
/* A <label> acting as the file-picker's whole visible control (the input
   itself is .pu-sr-hidden inside it) — button look, real keyboard path via
   the focused input within. */
.pu-file-btn{position:relative;cursor:pointer;text-align:center;white-space:nowrap}
.pu-file-btn:has(input:focus-visible){outline:2px solid var(--pu-border-focus);outline-offset:2px}
/* De-emphasised destructive text action ("Remove") — a full ghost button
   next to Upload would give deleting the photo equal billing with adding
   one. */
.pu-btn-plain{border:0;background:none;padding:0;font:inherit;font-size:.8125rem;
  color:var(--pu-text-secondary);text-decoration:underline;text-underline-offset:.2rem;cursor:pointer}
.pu-btn-plain:hover{color:var(--pu-status-danger)}

.pu-skeleton{height:2.4rem;border-radius:var(--pu-radius);background:var(--pu-surface-sunken);
  animation:pu-pulse 1.2s ease-in-out infinite}
@keyframes pu-pulse{50%{opacity:.55}}
.pu-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
.pu-foot{margin-top:2.5rem;font-size:.8125rem;color:var(--pu-text-secondary);text-align:center}

/* Dashboard footer: utility navigation, not the marketing tagline — a
   hairline above, wordmark left, doc/legal links right, wrapping as one
   centred column on narrow screens. Sits OUTSIDE .pu-wrap's bottom padding
   so it reads as the page's floor rather than another card. */
.pu-dash-foot{border-top:1px solid var(--pu-border-subtle);margin-top:2.5rem}
.pu-dash-foot-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;
  gap:.5rem 1.5rem;padding-top:1.1rem;padding-bottom:1.5rem;font-size:.8125rem}
.pu-dash-foot nav{display:flex;flex-wrap:wrap;gap:1rem}
.pu-dash-foot nav a{color:var(--pu-text-secondary);text-decoration:none}
.pu-dash-foot nav a:hover{color:var(--pu-text-primary)}

@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;
    transition-duration:.01ms!important;scroll-behavior:auto!important}
  .pu-day:hover[data-has-slots="1"],.pu-slot-available:hover,.pu-slot-available:active{transform:none}
}
`

export function pageCss(): string {
  return FONT_FACES + TOKENS + BASE_CSS
}

/**
 * The front page only (`/`). Kept out of BASE_CSS so the booking page — the
 * one that has to hit the <80 KB budget on every request — never pays for
 * rules it doesn't use.
 *
 * One card on the black stage, centred. Everything else the old marketing
 * site needed (feature grids, comparison tables, docs typography, the
 * animated colon) went with the pages that used it.
 */
export const LANDING_CSS = `
.pu-landing{max-width:44rem;margin:0 auto;padding:2.5rem 1.25rem 3rem}
/* The stage: black in both themes, like the dashboard bar — in this brand
   black is a surface in its own right, not a dark-mode reading of a light
   one. Its contents are coloured for that fixed ground. */
.pu-hero{background:#000000;color:#FFFFFF;border-radius:var(--pu-radius-lg);
  padding:3.5rem 2rem 3rem;text-align:center}
.pu-hero .pu-mark{color:#FFFFFF}
.pu-hero .pu-mark svg{height:2.25rem;margin:0 auto}
.pu-hero h1{font-family:var(--pu-font-display);font-weight:700;
  font-size:clamp(2rem,5vw + 1rem,3.25rem);line-height:.95;letter-spacing:-.03em;
  color:#FFFFFF;margin:2rem 0 1rem}
.pu-hero-lede{font-size:1.0625rem;color:rgba(255,255,255,.7);
  max-width:26rem;margin:0 auto 2rem}
.pu-hero-cta{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
/* Ghost on black: the blue outline it carries on a light page disappears
   here, so it borrows the header bar's white hairline treatment. */
.pu-hero .pu-btn-ghost{color:#FFFFFF;border-color:rgba(255,255,255,.35)}
.pu-hero .pu-btn-ghost:hover{background:rgba(255,255,255,.1);
  border-color:rgba(255,255,255,.6);color:#FFFFFF}

.pu-landing-footer{margin-top:1.5rem;padding-top:.5rem}
.pu-landing-footer nav{display:flex;gap:1.25rem;justify-content:center;flex-wrap:wrap;
  font-size:.8125rem;margin-bottom:.25rem}
.pu-landing-footer nav a{color:var(--pu-text-secondary);text-decoration:none}
.pu-landing-footer nav a:hover{color:var(--pu-text-primary)}
`
