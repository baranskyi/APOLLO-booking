/**
 * The satori element tree for a booking page's dynamic OG card (CCC-496).
 *
 * Pure and Cloudflare-free on purpose — it is exercised in `test/core` without
 * satori or the wasm runtime, so the "what does the card actually say" logic
 * is checkable in milliseconds rather than only under `test/workers`.
 *
 * satori takes React-element-like plain objects (no JSX transpiler is wired
 * up for this package, and pulling in `react` as a runtime dependency just
 * for OG rendering is not worth it) — see satori's "Use without JSX" mode.
 */

// Loose enough to avoid depending on satori's own (React-typed) element
// shape here; render.ts hands this straight to `satori()`, which is where it
// actually gets checked against satori's types.
export interface OgElement {
  type: string
  props: { children?: OgElement | OgElement[] | string; style?: Record<string, string | number>; [key: string]: unknown }
}

export interface OgCardProps {
  /** "Book {duration} min" — already formatted, so card.ts has no duration/pluralisation policy of its own. */
  titleLine: string
  /** "with {host}" */
  subtitleLine: string
  /** e.g. "10:30 GMT+3" */
  timeLabel: string
  brandName: string
}

const INK = '#000000'
const PAPER = '#FFFFFF'
/** Ignite — the brand's accent. 7.1:1 on the black card. */
const SIGNAL_GREEN = '#FF6424'
/** Paper at reduced opacity reads as "muted label" without a third color token. */
const PAPER_MUTED = 'rgba(255,255,255,0.55)'

/**
 * One face for the whole card, and it is the mono one.
 *
 * Halvar carries the brand everywhere else, but satori needs the font bytes
 * embedded and Halvar is licensed software in a public repository — it cannot
 * ship here (see assets/fonts/HALVAR-README.txt). Between the two OFL faces
 * that can, mono is the honest choice rather than a second sans nothing else
 * in the product uses: this card is a duration, a name and a clock, which is
 * exactly the tabular metadata the brand sets in mono anyway.
 */
const MONO = 'IBM Plex Mono'
const DISPLAY = MONO

/** Longer host/event combinations still fit at 1200x630 without overflowing satori's layout. */
function titleFontSize(titleLine: string, subtitleLine: string): number {
  const longest = Math.max(titleLine.length, subtitleLine.length)
  if (longest <= 16) return 76
  if (longest <= 24) return 60
  return 48
}

export function buildOgCard(props: OgCardProps): OgElement {
  const fontSize = titleFontSize(props.titleLine, props.subtitleLine)

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        backgroundColor: INK,
        padding: '64px',
        fontFamily: DISPLAY,
      },
      children: [
        wordmark(props.brandName),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              justifyContent: 'center',
              gap: '12px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', color: PAPER, fontSize: `${fontSize}px`, fontWeight: 600 },
                  children: props.titleLine,
                },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', color: SIGNAL_GREEN, fontSize: `${fontSize}px`, fontWeight: 600 },
                  children: props.subtitleLine,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: SIGNAL_GREEN,
              fontFamily: MONO,
              fontSize: '30px',
              fontWeight: 600,
            },
            children: props.timeLabel,
          },
        },
      ],
    },
  }
}

/** The wordmark: brand name in caps, with the accent carried by a trailing dot. */
function wordmark(brandName: string): OgElement {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        fontFamily: MONO,
        fontSize: '28px',
        fontWeight: 600,
        color: PAPER_MUTED,
      },
      children: [
        { type: 'span', props: { children: brandName.toUpperCase() } },
        { type: 'span', props: { style: { color: SIGNAL_GREEN }, children: '.' } },
      ],
    },
  }
}
