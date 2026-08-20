/**
 * Brand marks.
 *
 * The APOLLO NEXT wordmark, inlined rather than served from assets/, because
 * it has to change colour with its surface: white inside the black dashboard
 * bar, ink on a light page, white again when that page flips to dark mode.
 * `fill="currentColor"` does that with one asset and no second request; an
 * <img> would need a light and a dark file plus a media query to swap them.
 *
 * Geometry is the official wordmark verbatim — the drawn letterforms, not a
 * font rendering of "APOLLO NEXT". Only the strapline that sits bottom-left
 * in the source file is dropped: at the 14-28px this ships at, it resolves to
 * illegible mush, and NEXT already balances the lockup without it. viewBox is
 * the exact bounding box of the remaining paths, so height alone sizes it.
 *
 * ~2.4 KB inline, well under a KB gzipped against the <80 KB page budget.
 */

const WORDMARK_PATHS =
  '<path d="M205.1,59.4c-36,0-57.3,22.5-72.3,62.6L52.6,335h60l22.5-60.5h135.1l22.5,60.5h64.8l-80-213 C262.5,81.8,241.1,59.4,205.1,59.4z M153.2,225.7l36-96.5c2.4-6.6,7.2-9.9,13.5-9.9s11.1,3.3,13.5,9.9l36,96.5H153.2z"/><path d="M574.6,65.3H443.8c-30.3,0-54,23.7-54,53.9V335h57.9v-84.5h127c51.9,0,92.8-40.8,92.8-92.6 C667.4,106.1,626.6,65.3,574.6,65.3z M566.8,200.2H447.7v-68.6c0-6.6,5.4-12,12-12h107.2c21.9,0,39,17.7,39,39.9 C605.9,182.2,588.8,200.2,566.8,200.2z"/><path d="M928.3,61.1c-117.4,0-250.9,101.9-250.9,192.1c0,51.5,35.1,86,100.9,86c117.4,0,250.9-101.9,250.9-192.1 C1029.1,95.6,994,61.1,928.3,61.1z M783,285.3c-32.1,0-45-12.6-45-34.8c0-57.8,106-135.1,185.5-135.1c32.1,0,45,12.6,45,34.8 C968.5,208,862.5,285.3,783,285.3z"/><path d="M1091.9,257.1l133.3-191.8h-70.5l-129.4,186.1c-24.6,35.4,0.6,83.6,43.8,83.6h237.7v-56.9H1103 C1087.6,278.1,1083.4,269.4,1091.9,257.1z"/><path d="M1405.8,266.1V65.3h-60v215.8c0,30.3,23.7,53.9,54,53.9H1625v-56.9h-207.1C1411.2,278.1,1405.8,272.7,1405.8,266.1z"/><path d="M1915.8,80c-15.3-15.6-31.5-18-120.4-18s-105.1,2.4-120.7,18c-15.3,15.3-17.7,31.5-17.7,120.2s2.4,104.9,17.7,120.2 c15.6,15.6,31.8,18,120.7,18c88.9,0,105.1-2.4,120.4-18c15.3-15.3,18-31.5,18-120.2S1931.1,95.3,1915.8,80z M1872.9,277.5 c-3.3,3.3-5.4,3.9-77.4,3.9s-74.1-0.6-77.4-3.9s-3.9-5.4-3.9-77.3s0.6-74,3.9-77.3s5.4-3.9,77.4-3.9c72.1,0,74.1,0.6,77.4,3.9 s3.9,5.4,3.9,77.3S1876.2,274.2,1872.9,277.5z"/><path d="M1290.1,414.9v112c0,4.2-2.3,5.7-4.8,4l-90-107c-3.1-3.7-7.2-6.6-11.9-8.1c-20.4-6.4-43.2,7.4-43.2,29.1v136.2l37,0v-112 c0-5.2,3.4-6.2,6.7-2.4l66.5,79.2l19.2,23.1c0.7,0.9,1.5,1.7,2.3,2.5l0.8,0.9l0-0.1c11.2,10.3,28.2,12.1,41,3.4 c8-5.4,13.5-14.1,13.5-24.7V414.9L1290.1,414.9z"/><path d="M1406,449l126.7,0v-34.7l-137.4,0c-19.3,0-34.4,14.7-34.4,33.3v67.9v30.2v1.2c0,18.7,15.1,34.2,34.4,34.2h137.3v-35.6 l-126.7,0c-4.2,0-8.2-2.2-8.2-6.3v-23.7h0l0-0.9l89.6,0V480l-89.6,0v-24.6C1397.8,451.2,1401.8,449,1406,449z"/><path d="M1739.8,414.3h-44.5l-40.2,52.3c-1.3,1.7-3.2,2.9-5.3,3.3c-1,0.2-2,0.2-3,0.1c-2.3-0.3-4.4-1.5-5.8-3.4l-40.1-52.3h-44.9 l64.3,83.2l-64.3,83.6h44.5l40.2-52.3c1.3-1.7,3.2-2.9,5.3-3.3c1-0.2,2-0.2,3-0.1c2.3,0.3,4.4,1.5,5.8,3.4l40.1,52.3h44.9 l-64.3-83.2L1739.8,414.3z"/><path d="M1879.3,414.3h-15.7h-31.1h-17H1762v34.6h61.1c4.1,0,7.4,3.3,7.4,7.5v124.7l0,0h35.2l0,0V456.4c0-4.1,3.3-7.5,7.4-7.5h61.1 v-34.6H1879.3z"/>'

/**
 * The APOLLO NEXT wordmark as an inline <svg>. Inherits `color`, so callers
 * size it with CSS height and colour it by setting `color` on any ancestor.
 */
export function apolloWordmark(): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="52 59 1883 523" ' +
    'fill="currentColor" role="img" aria-label="APOLLO NEXT">' +
    WORDMARK_PATHS +
    '</svg>'
  )
}
