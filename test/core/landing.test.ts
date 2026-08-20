import { describe, expect, it } from 'vitest'
import { landingPage } from '../../src/http/pages/landing.js'

const base = { brandName: 'APOLLO NEXT', baseUrl: 'https://example.test' }

/**
 * The front page is the door to an internal tool, not a product pitch. These
 * guard the two ways it has historically drifted: pointing at a demo that
 * doesn't exist, and growing links to pages this deployment no longer serves.
 */
describe('landingPage', () => {
  it('sends the visitor to sign in', () => {
    expect(landingPage(base)).toContain('href="/login"')
  })

  it('renders the wordmark rather than the brand name as text', () => {
    const html = landingPage(base)
    expect(html).toContain('aria-label="APOLLO NEXT"')
    expect(html).toContain('<svg')
  })

  it('declares Ukrainian so screen readers and hyphenation get it right', () => {
    expect(landingPage(base)).toContain('<html lang="uk">')
  })

  /**
   * Regression: a fresh deployment has no host or event type seeded yet.
   * `landingPage` used to fall back to a hardcoded demo identity, which made
   * every such deployment's own homepage link to a booking page that 404s.
   * There is no safe default — it must come from the deployment's own config.
   */
  it('omits the booking-page link when no demo is configured', () => {
    expect(landingPage(base)).not.toContain('Сторінка бронювання')
  })

  it('links the booking-page link to the configured demo path', () => {
    const html = landingPage({ ...base, demoPath: '/serge/30min' })
    expect(html).toContain('href="/serge/30min">Сторінка бронювання')
  })

  /** Pages this deployment deliberately stopped serving (see router.ts). */
  it('links to no page that no longer exists', () => {
    const html = landingPage(base)
    expect(html).not.toContain('/docs')
    expect(html).not.toContain('/calendly-alternative')
    expect(html).not.toContain('github.com')
  })
})

/**
 * The footer's operator line uses the same EngineConfig.legalOperator source
 * as /privacy and /terms — unset by default, so a deployment run by
 * nobody-in-particular doesn't name someone else as its own operator.
 */
describe('footer operator line', () => {
  it('omits the operator line when unset', () => {
    expect(landingPage(base)).not.toContain('ТОВ «Аполлон»')
  })

  it('shows the configured operator', () => {
    expect(landingPage({ ...base, operator: 'ТОВ «Аполлон»' })).toContain('ТОВ «Аполлон»')
  })
})
