/**
 * The front page at `/`.
 *
 * Deliberately almost nothing: this deployment is an internal scheduling tool
 * for one company, not a product with visitors to convince. Anyone who lands
 * here either works here — and wants the way in — or followed a booking link
 * that has its own page. So the whole page is the wordmark, one line saying
 * what this is, and the door.
 *
 * Same rendering approach as the booking page (server-rendered template
 * strings, no client framework) but with its own shell: booking.ts's
 * `shellHead`/`shellFoot` bakes in the 900px reading column and the "powered
 * by" footer, neither of which suits a page that is one centred card.
 */

import { escapeHtml } from './booking.js'
import { apolloWordmark } from '../brand.js'
import { pageCss, LANDING_CSS } from '../styles.js'

export interface LandingPageOptions {
  brandName: string
  baseUrl: string
  /** Path to a real, live booking page, shown as a secondary link when set. */
  demoPath?: string
  /**
   * The legal entity operating this deployment — same source as /privacy and
   * /terms (EngineConfig.legalOperator). Unset by default: a deployment run
   * by nobody-in-particular has nothing honest to put here, so the footer
   * omits the line rather than inventing one.
   */
  operator?: string
}

function shell(
  opts: { title: string; description: string; baseUrl: string; brandName: string; path?: string },
  body: string,
): string {
  const origin = opts.baseUrl.replace(/\/$/, '')
  const url = `${origin}${opts.path ?? ''}`
  const image = `${origin}/og/default.png`
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${escapeHtml(opts.description)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#000000">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(opts.brandName)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:title" content="${escapeHtml(opts.title)}">
<meta property="og:description" content="${escapeHtml(opts.description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(opts.title)}">
<meta name="twitter:description" content="${escapeHtml(opts.description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<!-- All faces, same reasoning as shellHead in booking.ts: with
     font-display:optional the first paint is final, so anything not
     preloaded is likely never seen on a cold cache. -->
<link rel="preload" href="/fonts/halvar-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/halvar-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/ibmplexmono-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/ibmplexmono-cyrillic-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/ibmplexmono-600.woff2" as="font" type="font/woff2" crossorigin>
<style>${pageCss()}${LANDING_CSS}</style>
</head>
<body>
${body}
</body></html>`
}

function footer(operator?: string): string {
  return `<footer class="pu-landing-footer">
  <nav aria-label="Нижнє меню">
    <a href="/privacy">Приватність</a>
    <a href="/terms">Умови</a>
  </nav>
  ${operator ? `<p class="pu-muted" style="text-align:center;margin:.35rem 0 0;font-size:.8125rem">${escapeHtml(operator)}</p>` : ''}
</footer>`
}

export function landingPage(opts: LandingPageOptions): string {
  // No fallback: a fresh deployment has no host or event type seeded yet, and
  // a hardcoded demo identity here would point every such deployment's own
  // homepage at a 404. The link simply doesn't render without a real one.
  const demoPath = opts.demoPath

  const body = `<div class="pu-landing">
<header class="pu-hero">
  <a class="pu-mark" href="/" aria-label="${escapeHtml(opts.brandName)}">${apolloWordmark()}</a>
  <h1>Обери час.<br>Приходь.</h1>
  <p class="pu-hero-lede">Внутрішній сервіс бронювання зустрічей ${escapeHtml(opts.brandName)}.</p>
  <div class="pu-hero-cta">
    <a class="pu-btn" href="/login">Увійти</a>
    ${demoPath ? `<a class="pu-btn pu-btn-ghost" href="${escapeHtml(demoPath)}">Сторінка бронювання</a>` : ''}
  </div>
</header>
${footer(opts.operator)}
</div>`

  return shell(
    {
      title: `${opts.brandName} — бронювання`,
      description: `Внутрішній сервіс бронювання зустрічей ${opts.brandName}. Обери вільний час — запрошення прилетить у календар.`,
      baseUrl: opts.baseUrl,
      brandName: opts.brandName,
      path: '/',
    },
    body,
  )
}
