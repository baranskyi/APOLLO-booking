/**
 * The host dashboard (spec §5.1).
 *
 * Same rendering model as the public booking page: server-rendered template
 * strings, no component framework, no client bundle. The dashboard has no
 * <100 ms TTFB budget (ADR-0005 §2) — it is here for a different reason. Every
 * screen below is a form that submits to a URL, so the whole product works with
 * JavaScript disabled, degrades to plain HTML on a bad connection, and stays
 * auditable: what a POST does is visible in the markup that produced it.
 *
 * Two rules hold across this file and are load-bearing rather than stylistic:
 *
 *  - EVERY interpolation of user-controlled text goes through `escapeHtml`.
 *    Host names, event titles, calendar names and provider account addresses
 *    are all attacker-influenceable in a self-hosted deployment.
 *  - EVERY form that mutates carries the double-submit CSRF token (ADR-0005
 *    §5). The two exceptions are documented at their call sites: the login form
 *    (no session exists yet, so there is nothing to derive a token from) and
 *    the guest manage forms (no session and no ambient authority — the signed
 *    manage token IS the credential, exactly as on the booking page).
 *
 * Text formats (weekly windows, date overrides, custom questions) are defined
 * here together with their parsers. Rendering and parsing of one wire format
 * belong in one place; splitting them across the page and the route is how the
 * two silently diverge.
 */

import type {
  ApiKey,
  Availability,
  Booking,
  CalendarConnection,
  DateOverride,
  DayWindow,
  EventType,
  EventTypeQuestion,
  Slot,
  Team,
  TeamMember,
  User,
} from '../../core/domain/types.js'
import type { CalendarProviderName } from '../../ports.js'
import { slotStateClassName } from '../../core/slot-state.js'
import { formatInZone, localDateString, offsetLabel } from '../../core/time/zone.js'
import { avatarHtml, escapeHtml, shellFoot, shellHead } from './booking.js'
import { apolloWordmark } from '../brand.js'

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

/** Form field carrying the double-submit token. Routes read the same name. */
export const CSRF_FIELD = 'csrf'

export type NavKey = 'events' | 'availability' | 'teams' | 'connections' | 'keys' | 'settings' | 'admin'

const NAV: ReadonlyArray<{ key: NavKey; href: string; label: string }> = [
  { key: 'events', href: '/dashboard', label: 'Події' },
  { key: 'availability', href: '/dashboard/availability', label: 'Розклад' },
  { key: 'teams', href: '/dashboard/teams', label: 'Команди' },
  { key: 'connections', href: '/dashboard/connections', label: 'Календарі' },
  { key: 'keys', href: '/dashboard/api-keys', label: 'API-ключі' },
  { key: 'settings', href: '/dashboard/settings', label: 'Профіль' },
  // Rendered for admins only (shellTop filters on chrome.user.role); the
  // routes behind it are gated separately — hiding a link is not access
  // control.
  { key: 'admin', href: '/dashboard/admin', label: 'Адмін' },
]

/** Common shape of every authenticated page. */
export interface DashboardChrome {
  brandName: string
  user: User
  /** Double-submit token for this session (ADR-0005 §5). */
  csrf: string
}

export function csrfField(csrf: string): string {
  return `<input type="hidden" name="${CSRF_FIELD}" value="${escapeHtml(csrf)}">`
}

/**
 * Head + primary navigation.
 *
 * Sign-out is a POST, not a link: a GET that destroys a session can be fired by
 * any `<img>` on any page on the internet, and the CSRF token cannot travel on
 * a link the user might bookmark.
 */
function shellTop(chrome: DashboardChrome, title: string, active: NavKey | null): string {
  const links = NAV.filter((item) => item.key !== 'admin' || chrome.user.role === 'admin')
    .map((item) => {
      const current = item.key === active ? ' aria-current="page"' : ''
      return `<a class="pu-nav-link" href="${item.href}"${current}>${escapeHtml(item.label)}</a>`
    })
    .join('\n      ')

  return (
    shellHead({ title: `${title} · ${chrome.brandName}`, brandName: chrome.brandName }) +
    `<header class="pu-dash-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem">
  <a class="pu-mark" href="/dashboard" aria-label="${escapeHtml(chrome.brandName)}">${apolloWordmark()}</a>
  <nav aria-label="Меню панелі" style="display:flex;gap:1rem;flex-wrap:wrap;font-size:.9375rem">
      ${links}
  </nav>
  <form method="post" action="/logout" style="margin:0">
    ${csrfField(chrome.csrf)}
    <button class="pu-btn pu-btn-ghost" type="submit" style="padding:.4rem .8rem;font-size:.875rem">Вийти</button>
  </form>
</header>
<p class="pu-sr">Ви увійшли як ${escapeHtml(chrome.user.email)}</p>`
  )
}

function shellBottom(brandName: string): string {
  // A utility footer: the wordmark links home, and the only other pages worth
  // a standing link are the legal ones the engine serves unconditionally, so
  // this needs no per-deployment config. (The docs links that used to live
  // here went with /docs — an operator reads those in the repo.)
  return (
    `</div>
<footer class="pu-dash-foot">
  <div class="pu-wrap pu-dash-foot-row">
    <a class="pu-mark" href="/" aria-label="${escapeHtml(brandName)}">${apolloWordmark()}</a>
    <nav aria-label="Нижнє меню">
      <a href="/privacy">Приватність</a>
      <a href="/terms">Умови</a>
    </nav>
  </div>
</footer>
</body></html>`
  )
}

/** A dismissible-looking status strip. Not an error — errors use `.pu-err`. */
function notice(message: string): string {
  return `<p class="pu-badge" role="status" style="display:block;padding:.5rem .75rem;border-radius:var(--pu-radius)">${escapeHtml(message)}</p>`
}

function fieldError(id: string, errors: Record<string, string>): string {
  const err = errors[id]
  return err ? `<p class="pu-err" id="err-${escapeHtml(id)}">${escapeHtml(err)}</p>` : ''
}

/** `aria-describedby` only when there is something to describe. */
function describedBy(id: string, errors: Record<string, string>): string {
  return errors[id] ? ` aria-describedby="err-${escapeHtml(id)}"` : ''
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export interface LoginPageData {
  brandName: string
  /** Providers with OAuth credentials configured. Empty is a normal deployment. */
  providers: CalendarProviderName[]
  /** True after a magic link request — identical for known and unknown addresses. */
  sent?: boolean
  error?: string
  /** Echoed back only on a malformed address, never on the neutral "sent" state. */
  email?: string
}

/**
 * The sign-in page.
 *
 * No CSRF token, deliberately. A double-submit token is derived from the
 * session id hash (ADR-0005 §5) and there is no session here — that is the
 * point of the page. What a forged submit could achieve is sending the victim
 * a login email they did not ask for, which the email itself flags with the
 * requesting IP and user agent (ADR-0005 §3), and which per-email and per-IP
 * rate limits bound (ADR-0006 §3). The token would add a cookie round trip and
 * no security.
 *
 * The success state says nothing about whether the address has an account. Any
 * branch here is an enumeration oracle, so the copy carries no address at all.
 */
export function loginPage(d: LoginPageData): string {
  const buttons = d.providers
    .map(
      (p) =>
        `<a class="pu-btn pu-btn-ghost" style="display:block;margin-top:.5rem"
       href="/auth/${p}/start?purpose=identity">Continue with ${escapeHtml(providerLabel(p))}</a>`,
    )
    .join('\n    ')

  const body = d.sent
    ? `<h1>Перевір пошту</h1>
  <p class="pu-muted">Якщо ця адреса має доступ, лінк уже летить. Він одноразовий і живе 15 хвилин.</p>
  <p style="margin-top:1.25rem"><a class="pu-btn pu-btn-ghost" href="/login">Назад до входу</a></p>`
    : `<h1>Вхід</h1>
  <p class="pu-muted">Без пароля. Надішлемо на пошту одноразовий лінк.</p>
  <form method="post" action="/login">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required aria-required="true" autocomplete="email"
           inputmode="email" value="${escapeHtml(d.email ?? '')}"${describedBy('email', d.error ? { email: d.error } : {})}>
    ${d.error ? `<p class="pu-err" id="err-email">${escapeHtml(d.error)}</p>` : ''}
    <div style="margin-top:1.25rem"><button class="pu-btn" type="submit">Надіслати лінк</button></div>
  </form>
  ${
    d.providers.length > 0
      ? `<div style="margin-top:1.5rem;border-top:1px solid var(--pu-line);padding-top:1.25rem">
    <p class="pu-muted" style="font-size:.8125rem">Під час входу запитуємо тільки імʼя та email. Доступ до календаря —
       окремо, коли підключатимеш його.</p>
    ${buttons}
  </div>`
      : ''
  }`

  return (
    shellHead({ title: `Вхід · ${d.brandName}`, brandName: d.brandName }) +
    `<section class="pu-card" style="max-width:26rem;margin:3rem auto">${body}</section>` +
    shellFoot(d.brandName)
  )
}

function providerLabel(p: CalendarProviderName): string {
  return p === 'google' ? 'Google' : 'Microsoft'
}

// ---------------------------------------------------------------------------
// Home — event types and what is coming up
// ---------------------------------------------------------------------------

export interface UpcomingBooking {
  booking: Booking
  /** Resolved by the route; a deleted event type leaves the id as the label. */
  eventTitle: string
}

/**
 * One row of the home list. The owner slug travels WITH the event type rather
 * than being derived from the signed-in user, because a team-owned event's
 * public link starts with the TEAM's slug — using the user's slug there would
 * print a URL that 404s.
 */
export interface EventTypeListItem {
  eventType: EventType
  /** First path segment of the public link: the user's slug, or the owning team's. */
  ownerSlug: string
  /** Set for team-owned rows, so the card can say whose event this is. */
  teamName?: string
}

export interface DashboardHomeData extends DashboardChrome {
  eventTypes: EventTypeListItem[]
  upcomingBookings: UpcomingBooking[]
  /** Public origin, so the copyable URL is the one a guest would receive. */
  baseUrl: string
  notice?: string
}

export function dashboardHome(d: DashboardHomeData): string {
  const events =
    d.eventTypes.length === 0
      ? `<p class="pu-muted">Подій ще немає. Створи одну — і сторінка бронювання запрацює.</p>`
      : d.eventTypes.map((item) => eventTypeCard(d, item)).join('\n')

  const upcoming =
    d.upcomingBookings.length === 0
      ? `<p class="pu-muted">Ще нічого не заброньовано.</p>`
      : `<ul style="list-style:none;padding:0;margin:0;display:grid;gap:.75rem">
      ${d.upcomingBookings.map((u) => upcomingRow(u, d.user.tz)).join('\n      ')}
    </ul>`

  return (
    shellTop(d, 'Панель', 'events') +
    (d.notice ? notice(d.notice) : '') +
    `<div class="pu-grid" style="grid-template-columns:1fr">
  <section aria-label="Події">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.75rem">
      <h1 style="margin:0">Події</h1>
      <a class="pu-btn" href="/dashboard/event-types/new">Нова подія</a>
    </div>
    <div style="display:grid;gap:1rem">${events}</div>
  </section>
  <section class="pu-card" aria-label="Найближчі бронювання">
    <h2>Найближчі</h2>
    <p class="pu-muted" style="font-size:.8125rem">Час у зоні ${escapeHtml(d.user.tz)} (${escapeHtml(offsetLabel(Date.now(), d.user.tz))})</p>
    ${upcoming}
  </section>
</div>` +
    shellBottom(d.brandName)
  )
}

/**
 * One-tap copy for a `.pu-url` value. Inline handler, same minimal-island
 * policy as the timezone picker's `onchange` — no shared script to load, and
 * the page works without it (the input still select-alls on click).
 * `navigator.clipboard` only EXISTS in a secure context — on plain http from
 * a non-localhost origin (a LAN IP, an untls'd proxy) it is `undefined` and
 * calling it throws synchronously, before any promise a `.catch` could see —
 * so the guard has to come first; both failure paths land on the same
 * select-the-input fallback rather than a button that silently does nothing.
 */
function copyButton(value: string): string {
  return `<button type="button" class="pu-btn pu-btn-ghost pu-copy" data-copy="${escapeHtml(value)}"
    onclick="var b=this,f=function(){var i=b.parentElement.querySelector('input');i.focus();i.select()};if(navigator.clipboard){navigator.clipboard.writeText(b.dataset.copy).then(function(){b.textContent='Скопійовано';setTimeout(function(){b.textContent='Копіювати'},1500)}).catch(f)}else{f()}">Копіювати</button>`
}

function eventTypeCard(d: DashboardHomeData, item: EventTypeListItem): string {
  const et = item.eventType
  const url = `${trimSlash(d.baseUrl)}/${encodeURIComponent(item.ownerSlug)}/${encodeURIComponent(et.slug)}`
  const inputId = `url-${escapeHtml(et.id)}`
  return `<article class="pu-card">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap">
    <h2 style="margin:0">${escapeHtml(et.title)}</h2>
    <div style="display:flex;gap:.5rem">
      ${item.teamName ? `<span class="pu-badge">${escapeHtml(item.teamName)}</span>` : ''}
      ${et.active ? '' : '<span class="pu-badge" style="background:var(--pu-paper-dim);color:var(--pu-ink-500)">Прихована</span>'}
    </div>
  </div>
  <ul class="pu-meta">
    <li><span class="pu-dot"></span> ${et.durationMinutes} хв</li>
    <li>${escapeHtml(schedulingLabel(et))}</li>
    <li>${escapeHtml(locationLabel(et))}</li>
  </ul>
  <label for="${inputId}">Публічне посилання</label>
  <div class="pu-url">
    <input id="${inputId}" class="pu-url-input" readonly value="${escapeHtml(url)}" onclick="this.select()">
    ${copyButton(url)}
  </div>
  <div style="margin-top:.75rem;display:flex;gap:.75rem;flex-wrap:wrap">
    <a class="pu-btn pu-btn-ghost" href="/dashboard/event-types/${encodeURIComponent(et.id)}">Редагувати</a>
    <a class="pu-btn pu-btn-ghost" href="${escapeHtml(url)}">Переглянути</a>
  </div>
</article>`
}

function upcomingRow(u: UpcomingBooking, tz: string): string {
  const when = formatInZone(u.booking.startUtc, tz, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `<li style="border-bottom:1px solid var(--pu-line);padding-bottom:.75rem">
        <strong class="pu-time">${escapeHtml(when)}</strong><br>
        ${escapeHtml(u.eventTitle)} — ${escapeHtml(u.booking.guestName)}
        <span class="pu-muted">(${escapeHtml(u.booking.guestEmail)})</span>
      </li>`
}

function schedulingLabel(et: EventType): string {
  switch (et.schedulingType) {
    case 'round_robin':
      return 'Почергово'
    case 'collective':
      return 'Разом'
    default:
      return 'Особиста'
  }
}

function locationLabel(et: EventType): string {
  switch (et.locationType) {
    case 'google_meet':
      return 'Google Meet'
    case 'phone':
      return 'Телефонний дзвінок'
    case 'in_person':
      return et.locationValue ?? 'Особисто'
    default:
      return et.locationValue ?? 'Онлайн'
  }
}

// ---------------------------------------------------------------------------
// Event type form
// ---------------------------------------------------------------------------

export interface EventTypeFormData extends DashboardChrome {
  /** Absent for a create. On a failed create the route passes the draft back. */
  eventType?: EventType
  /**
   * Teams the host belongs to — the owner choices beside "Me (personal)".
   * When empty the owner/scheduling selects are not rendered at all, and the
   * route forces a personal event: a host with no teams has nothing to choose.
   */
  teams?: Team[]
  /**
   * The raw question text as typed. Set when it failed to parse — the draft's
   * `questions` are empty in that case, and re-rendering from them would erase
   * exactly the text the host has to correct.
   */
  questionsText?: string
  errors?: Record<string, string>
}

const LOCATION_OPTIONS: ReadonlyArray<{ value: EventType['locationType']; label: string }> = [
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'custom_link', label: 'Своє посилання' },
  { value: 'phone', label: 'Телефонний дзвінок' },
  { value: 'in_person', label: 'Особисто' },
]

export function eventTypeForm(d: EventTypeFormData): string {
  const et = d.eventType
  const errors = d.errors ?? {}
  const teams = d.teams ?? []
  // An id is what separates "edit this row" from "create a row"; a draft handed
  // back after a failed create has none, so it correctly re-posts as a create.
  const editing = Boolean(et && et.id !== '')
  const action = editing
    ? `/dashboard/event-types/${encodeURIComponent(et!.id)}`
    : '/dashboard/event-types'

  const num = (v: number | null | undefined, fallback: string): string =>
    v === null || v === undefined ? fallback : String(v)

  return (
    shellTop(d, editing ? 'Редагувати подію' : 'Нова подія', 'events') +
    `<section class="pu-card" aria-label="${editing ? 'Редагувати подію' : 'Нова подія'}">
  <h1>${editing ? 'Редагувати подію' : 'Нова подія'}</h1>
  <form method="post" action="${escapeHtml(action)}">
    ${csrfField(d.csrf)}

    <label for="title">Назва</label>
    <input id="title" name="title" required aria-required="true" maxlength="120"
           value="${escapeHtml(et?.title ?? '')}"${describedBy('title', errors)}>
    ${fieldError('title', errors)}

    <label for="slug">URL-адреса</label>
    <input id="slug" name="slug" required aria-required="true" maxlength="60" pattern="[a-z0-9\-]+"
           value="${escapeHtml(et?.slug ?? '')}"${describedBy('slug', errors)}>
    <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">
      Малі латинські літери, цифри та дефіси. Стане /${escapeHtml(d.user.slug)}/&lt;адреса&gt;.</p>
    ${fieldError('slug', errors)}

    ${ownershipFields(d, teams, errors)}

    <label for="description">Опис</label>
    <textarea id="description" name="description" maxlength="2000"${describedBy('description', errors)}>${escapeHtml(et?.description ?? '')}</textarea>
    ${fieldError('description', errors)}

    <div class="pu-grid" style="grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:0 1rem">
      <div>
        <label for="durationMinutes">Тривалість (хвилин)</label>
        <input id="durationMinutes" name="durationMinutes" type="number" min="5" max="1440" step="5"
               required aria-required="true" value="${escapeHtml(num(et?.durationMinutes, '30'))}"${describedBy('durationMinutes', errors)}>
        <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">Кратно 5 — сітка бронювання йде по 5 хвилин.</p>
        ${fieldError('durationMinutes', errors)}
      </div>
      <div>
        <label for="slotIntervalMinutes">Крок сітки (хвилин)</label>
        <input id="slotIntervalMinutes" name="slotIntervalMinutes" type="number" min="5" max="1440" step="5"
               value="${escapeHtml(num(et?.slotIntervalMinutes, ''))}"${describedBy('slotIntervalMinutes', errors)}>
        <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">Порожньо — один слот на тривалість.</p>
        ${fieldError('slotIntervalMinutes', errors)}
      </div>
      <div>
        <label for="bufferBeforeMinutes">Буфер до (хвилин)</label>
        <input id="bufferBeforeMinutes" name="bufferBeforeMinutes" type="number" min="0" max="240" step="5"
               value="${escapeHtml(num(et?.bufferBeforeMinutes, '0'))}"${describedBy('bufferBeforeMinutes', errors)}>
        ${fieldError('bufferBeforeMinutes', errors)}
      </div>
      <div>
        <label for="bufferAfterMinutes">Буфер після (хвилин)</label>
        <input id="bufferAfterMinutes" name="bufferAfterMinutes" type="number" min="0" max="240" step="5"
               value="${escapeHtml(num(et?.bufferAfterMinutes, '0'))}"${describedBy('bufferAfterMinutes', errors)}>
        ${fieldError('bufferAfterMinutes', errors)}
      </div>
      <div>
        <label for="minNoticeMinutes">Мінімум часу до зустрічі (хвилин)</label>
        <input id="minNoticeMinutes" name="minNoticeMinutes" type="number" min="0" max="43200" step="5"
               value="${escapeHtml(num(et?.minNoticeMinutes, '60'))}"${describedBy('minNoticeMinutes', errors)}>
        ${fieldError('minNoticeMinutes', errors)}
      </div>
      <div>
        <label for="maxHorizonDays">Бронювати наперед (днів)</label>
        <input id="maxHorizonDays" name="maxHorizonDays" type="number" min="1" max="730"
               value="${escapeHtml(num(et?.maxHorizonDays, '60'))}"${describedBy('maxHorizonDays', errors)}>
        ${fieldError('maxHorizonDays', errors)}
      </div>
      <div>
        <label for="maxPerDay">Максимум на день</label>
        <input id="maxPerDay" name="maxPerDay" type="number" min="1" max="100"
               value="${escapeHtml(num(et?.maxPerDay, ''))}"${describedBy('maxPerDay', errors)}>
        <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">Порожньо — без обмежень. Рахується за днем у твоєму поясі.</p>
        ${fieldError('maxPerDay', errors)}
      </div>
    </div>

    <label for="locationType">Місце</label>
    <select id="locationType" name="locationType"${describedBy('locationType', errors)}>
      ${LOCATION_OPTIONS.map(
        (o) =>
          `<option value="${o.value}"${(et?.locationType ?? 'google_meet') === o.value ? ' selected' : ''}>${escapeHtml(o.label)}</option>`,
      ).join('\n      ')}
    </select>
    ${fieldError('locationType', errors)}

    <label for="locationValue">Деталі місця</label>
    <input id="locationValue" name="locationValue" maxlength="500"
           value="${escapeHtml(et?.locationValue ?? '')}"${describedBy('locationValue', errors)}>
    <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">
      Посилання на зустріч, номер телефону або адреса. Для Google Meet не потрібно — він створює лінк сам.</p>
    ${fieldError('locationValue', errors)}

    <label for="questions">Власні питання</label>
    <textarea id="questions" name="questions" rows="5"${describedBy('questions', errors)}>${escapeHtml(d.questionsText ?? formatQuestions(et?.questions ?? []))}</textarea>
    <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">
      По рядку на питання: <code>Підпис | text|textarea|select | required|optional | варіант, варіант</code>.
      Імʼя та email питаємо завжди — їх тут вказувати не треба.</p>
    ${fieldError('questions', errors)}

    <label for="active" style="display:flex;align-items:center;gap:.5rem;margin-top:1rem">
      <input id="active" name="active" type="checkbox" value="1" style="width:auto"
             ${et === undefined || et.active ? 'checked' : ''}>
      <span>Показувати на сторінці бронювання</span>
    </label>

    <div style="margin-top:1.5rem;display:flex;gap:.75rem;flex-wrap:wrap">
      <button class="pu-btn" type="submit">${editing ? 'Зберегти' : 'Створити подію'}</button>
      <a class="pu-btn pu-btn-ghost" href="/dashboard">Скасувати</a>
    </div>
  </form>
</section>
${
  editing
    ? `<form class="pu-card" method="post" style="margin-top:1.5rem"
        action="/dashboard/event-types/${encodeURIComponent(et!.id)}/delete">
  ${csrfField(d.csrf)}
  <h2>Видалити цю подію</h2>
  <p class="pu-muted">Наявні бронювання лишаться; сторінка перестане приймати нові.</p>
  <button class="pu-btn pu-btn-danger" type="submit">Видалити подію</button>
</form>`
    : ''
}` +
    shellBottom(d.brandName)
  )
}

/**
 * The owner and scheduling selects, rendered only when the host has a team to
 * offer. Both selects are always visible when rendered — no client JS shows
 * or hides anything — and the SERVER is the source of truth: with owner "me"
 * the scheduling value is ignored and forced to 'personal' (readEventTypeForm),
 * so a stale or crafted scheduling value cannot make a personal event
 * round-robin.
 */
function ownershipFields(d: EventTypeFormData, teams: Team[], errors: Record<string, string>): string {
  // No teams, no selects — but a crafted POST naming a team the user is not
  // in still needs its refusal VISIBLE, or the 400 renders with no explanation.
  if (teams.length === 0) return fieldError('owner', errors)
  const et = d.eventType
  const teamOptions = teams
    .map(
      (t) =>
        `<option value="${escapeHtml(t.id)}"${et?.ownerTeamId === t.id ? ' selected' : ''}>${escapeHtml(t.name)}</option>`,
    )
    .join('\n      ')
  return `<div class="pu-grid" style="grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:0 1rem">
      <div>
        <label for="owner">Власник</label>
        <select id="owner" name="owner"${describedBy('owner', errors)}>
      <option value=""${et?.ownerTeamId ? '' : ' selected'}>Я (особиста)</option>
      ${teamOptions}
    </select>
        <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">
          A team-owned event is booked at /&lt;team-slug&gt;/&lt;slug&gt;.</p>
        ${fieldError('owner', errors)}
      </div>
      <div>
        <label for="schedulingType">Спосіб призначення</label>
        <select id="schedulingType" name="schedulingType"${describedBy('schedulingType', errors)}>
      <option value="round_robin"${et?.schedulingType === 'collective' ? '' : ' selected'}>Почергово — кожне бронювання бере один учасник</option>
      <option value="collective"${et?.schedulingType === 'collective' ? ' selected' : ''}>Разом — присутні всі учасники</option>
    </select>
        <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">
          Діє, коли подією володіє команда. Для особистої не застосовується.</p>
        ${fieldError('schedulingType', errors)}
      </div>
    </div>`
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/**
 * Indexed by `WeeklySchedule`'s own day numbering, which starts at Sunday —
 * the field names (`day-${index}`) bind to it and dashboard-routes.ts parses
 * them back by index, so this array must NOT be reordered. Display order is a
 * separate concern; see DAY_DISPLAY_ORDER.
 */
const DAY_NAMES: readonly string[] = [
  'Неділя',
  'Понеділок',
  'Вівторок',
  'Середа',
  'Четвер',
  "П'ятниця",
  'Субота',
]

/** Monday first, the way the week reads in Ukrainian. Values are DAY_NAMES indices. */
const DAY_DISPLAY_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0]

/** Enough to cover most hosts without shipping the whole tz database. */
const COMMON_ZONES: readonly string[] = [
  'UTC',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Warsaw',
  'Europe/Kyiv',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
]

export interface AvailabilityPageData extends DashboardChrome {
  availability: Availability
  errors?: Record<string, string>
  notice?: string
}

export function availabilityPage(d: AvailabilityPageData): string {
  const errors = d.errors ?? {}
  const rows = DAY_DISPLAY_ORDER.map((index) => {
    const name = DAY_NAMES[index] as string
    const id = `day-${index}`
    const windows = d.availability.weekly[index] ?? []
    return `<div>
      <label for="${id}">${escapeHtml(name)}</label>
      <input id="${id}" name="${id}" value="${escapeHtml(formatWindows(windows))}"
             placeholder="09:00-17:00" autocomplete="off"${describedBy(id, errors)}>
      ${fieldError(id, errors)}
    </div>`
  }).join('\n    ')

  const zones = [...new Set([d.availability.timezone, ...COMMON_ZONES])]

  return (
    shellTop(d, 'Розклад', 'availability') +
    (d.notice ? notice(d.notice) : '') +
    `<section class="pu-card" aria-label="Тижневий розклад">
  <h1>Розклад</h1>
  <form method="post" action="/dashboard/availability">
    ${csrfField(d.csrf)}

    <label for="timezone">Часовий пояс</label>
    <input id="timezone" name="timezone" list="pu-zones" required aria-required="true"
           value="${escapeHtml(d.availability.timezone)}"${describedBy('timezone', errors)}>
    <datalist id="pu-zones">
      ${zones.map((z) => `<option value="${escapeHtml(z)}"></option>`).join('\n      ')}
    </datalist>
    <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">
      Робочі години нижче читаються в цьому поясі, тож вони переводяться разом із літнім часом.</p>
    ${fieldError('timezone', errors)}

    <h2 style="margin-top:1.5rem">Робочі години</h2>
    <p class="pu-muted" style="font-size:.8125rem">
      Діапазони у 24-годинному форматі через кому, наприклад <code>09:00-12:00, 13:00-17:00</code>. Порожній рядок — вихідний.</p>
    ${rows}

    <h2 style="margin-top:1.5rem">Винятки за датами</h2>
    <label for="overrides">Конкретні дати</label>
    <textarea id="overrides" name="overrides" rows="5" placeholder="2026-12-24"${describedBy('overrides', errors)}>${escapeHtml(formatOverrides(d.availability.overrides))}</textarea>
    <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">
      По рядку на дату: <code>YYYY-MM-DD 10:00-14:00</code>. Дата без діапазонів — вихідний, а виняток
      повністю замінює робочі години того дня.</p>
    ${fieldError('overrides', errors)}

    <div style="margin-top:1.5rem"><button class="pu-btn" type="submit">Зберегти розклад</button></div>
  </form>
</section>` +
    shellBottom(d.brandName)
  )
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export interface TeamMemberView {
  member: TeamMember
  /** Null when the user row is gone; the id is then the only label left. */
  user: User | null
}

export interface TeamView {
  team: Team
  members: TeamMemberView[]
}

export interface TeamsPageData extends DashboardChrome {
  /** Teams the signed-in user belongs to, with their full member lists. */
  teams: TeamView[]
  /** Echo of a failed create, same reasoning as settingsPage's slugValue. */
  nameValue?: string
  slugValue?: string
  /** Echo of a failed add-member submit, scoped to one team's form. */
  addValues?: { teamId: string; email: string; weight: string }
  errors?: Record<string, string>
  notice?: string
}

export function teamsPage(d: TeamsPageData): string {
  const errors = d.errors ?? {}
  const cards =
    d.teams.length === 0
      ? `<p class="pu-muted">Команд ще немає. Створи нижче, потім обери власником події.</p>`
      : d.teams.map((view) => teamCard(d, view)).join('\n')

  return (
    shellTop(d, 'Команди', 'teams') +
    (d.notice ? notice(d.notice) : '') +
    `<section aria-label="Команди">
  <h1>Команди</h1>
  <p class="pu-muted">Команда володіє почерговими та спільними подіями за адресою
    /&lt;команда&gt;/&lt;подія&gt;. Будь-який учасник може керувати складом.
    Видалення команди поки не підтримується.</p>
  <div style="display:grid;gap:1rem">${cards}</div>
  <form class="pu-card" method="post" action="/dashboard/teams" style="margin-top:1.5rem">
    ${csrfField(d.csrf)}
    <h2>Створити команду</h2>
    <label for="team-name">Назва</label>
    <input id="team-name" name="name" required aria-required="true" maxlength="120"
           value="${escapeHtml(d.nameValue ?? '')}"${describedBy('team-name', errors)}>
    ${fieldError('team-name', errors)}
    <label for="team-slug">URL-адреса</label>
    <input id="team-slug" name="slug" required aria-required="true" maxlength="40" pattern="[a-z0-9\-]+"
           value="${escapeHtml(d.slugValue ?? '')}"${describedBy('team-slug', errors)}>
    <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">
      Малі латинські літери, цифри та дефіси, 2&ndash;40 символів. Це перша частина посилань команди:
      /&lt;адреса&gt;/&lt;подія&gt;. Ти станеш її першим учасником.</p>
    ${fieldError('team-slug', errors)}
    <div style="margin-top:1.25rem"><button class="pu-btn" type="submit">Створити команду</button></div>
  </form>
</section>` +
    shellBottom(d.brandName)
  )
}

function teamCard(d: TeamsPageData, view: TeamView): string {
  const team = view.team
  const teamId = encodeURIComponent(team.id)
  const errors = d.errors ?? {}
  const add = d.addValues?.teamId === team.id ? d.addValues : { teamId: team.id, email: '', weight: '1' }

  const rows = view.members
    .map((m) => {
      const label = m.user ? m.user.name || m.user.slug : m.member.userId
      const email = m.user?.email ?? ''
      // The only member gets no remove button at all — the server refuses it
      // too, but offering a button that can only fail is UI lying (same
      // reasoning as the admin page's last-admin row).
      const action =
        view.members.length <= 1
          ? '<span class="pu-muted">Єдиний учасник</span>'
          : `<form method="post" style="margin:0"
            action="/dashboard/teams/${teamId}/members/${encodeURIComponent(m.member.userId)}/remove">
            ${csrfField(d.csrf)}
            <button class="pu-btn pu-btn-ghost" type="submit" style="padding:.3rem .6rem;font-size:.8125rem">Прибрати</button>
          </form>`
      return `<tr>
        <td>${escapeHtml(label)}${email ? `<br><span class="pu-muted" style="font-size:.8125rem">${escapeHtml(email)}</span>` : ''}</td>
        <td>${m.member.rrWeight}</td>
        <td>${action}</td>
      </tr>`
    })
    .join('\n')

  return `<article class="pu-card">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap">
    <h2 style="margin:0">${escapeHtml(team.name)}</h2>
    <span class="pu-time pu-muted">/${escapeHtml(team.slug)}</span>
  </div>
  ${fieldError(`members-${team.id}`, errors)}
  <div class="pu-docs-table-wrap"><table style="width:100%">
    <thead><tr><th scope="col" style="text-align:left">Учасник</th>
      <th scope="col" style="text-align:left">Вага</th><th scope="col" style="text-align:left"></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <form method="post" action="/dashboard/teams/${teamId}/members" style="margin-top:1rem">
    ${csrfField(d.csrf)}
    <div class="pu-grid" style="grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:0 1rem">
      <div>
        <label for="email-${escapeHtml(team.id)}">Add a member by email</label>
        <input id="email-${escapeHtml(team.id)}" name="email" type="email" required aria-required="true"
               inputmode="email" value="${escapeHtml(add.email)}"${describedBy(`email-${team.id}`, errors)}>
        ${fieldError(`email-${team.id}`, errors)}
      </div>
      <div>
        <label for="weight-${escapeHtml(team.id)}">Round-robin weight</label>
        <input id="weight-${escapeHtml(team.id)}" name="weight" type="number" min="1" max="100"
               value="${escapeHtml(add.weight)}"${describedBy(`weight-${team.id}`, errors)}>
        ${fieldError(`weight-${team.id}`, errors)}
      </div>
    </div>
    <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">
      Будь-хто з акаунтом на цьому сервері. Більша вага — пропорційно більша частка почергових бронювань.
      Якщо додати того, хто вже в команді, оновиться його вага.</p>
    <div style="margin-top:.75rem"><button class="pu-btn" type="submit">Додати учасника</button></div>
  </form>
</article>`
}

// ---------------------------------------------------------------------------
// Calendar connections
// ---------------------------------------------------------------------------

export interface ConnectionView {
  connection: CalendarConnection
  /**
   * Calendars the provider lists. Empty when the provider could not be reached
   * — the page then falls back to showing the stored ids, so a host with a
   * broken connection can still see and fix what is selected.
   */
  calendars: Array<{ id: string; name: string; primary: boolean }>
}

export interface ConnectionsPageData extends DashboardChrome {
  connections: ConnectionView[]
  /** Providers with credentials configured in this deployment. */
  availableProviders: CalendarProviderName[]
  notice?: string
}

export function connectionsPage(d: ConnectionsPageData): string {
  const cards =
    d.connections.length === 0
      ? `<p class="pu-muted">Календарів не підключено. Бронювання працюють — просто ніхто не перевіряє накладки.</p>`
      : d.connections.map((c) => connectionCard(d, c)).join('\n')

  const connectButtons =
    d.availableProviders.length === 0
      ? `<p class="pu-muted">На цьому сервері не налаштовано жодного провайдера календарів. Додай client id
       і secret, щоб зʼявилося підключення.</p>`
      : d.availableProviders
          .map(
            (p) =>
              `<a class="pu-btn" style="margin-right:.75rem" href="/auth/${p}/start?purpose=calendar">Підключити ${escapeHtml(providerLabel(p))} Calendar</a>`,
          )
          .join('\n    ')

  return (
    shellTop(d, 'Календарі', 'connections') +
    (d.notice ? notice(d.notice) : '') +
    `<section aria-label="Підключені календарі">
  <h1>Календарі</h1>
  <p class="pu-muted">Календарі на читання перевіряються на накладки. У календар на запис потрапляє саме бронювання.</p>
  <div style="display:grid;gap:1rem">${cards}</div>
  <div class="pu-card" style="margin-top:1.5rem">
    <h2>Підключити ще календар</h2>
    <p class="pu-muted" style="font-size:.8125rem">
      Підключення запитує доступ до календаря. Вхід — ніколи: це окремі дозволи, тож відкликання одного
      не впливає на інший.</p>
    ${connectButtons}
  </div>
</section>` +
    shellBottom(d.brandName)
  )
}

function connectionCard(d: ConnectionsPageData, view: ConnectionView): string {
  const c = view.connection
  const id = encodeURIComponent(c.id)
  // A provider list we could not fetch must not silently drop the host's
  // selection, so fall back to the stored ids as their own labels.
  const calendars =
    view.calendars.length > 0
      ? view.calendars
      : c.calendarIdsRead.map((cid) => ({ id: cid, name: cid, primary: false }))

  const readRows = calendars
    .map((cal) => {
      const inputId = `read-${escapeHtml(c.id)}-${escapeHtml(cal.id)}`
      const checked = c.calendarIdsRead.includes(cal.id) ? ' checked' : ''
      return `<label for="${inputId}" style="display:flex;align-items:center;gap:.5rem;font-weight:400;margin:.35rem 0">
        <input id="${inputId}" name="read" type="checkbox" value="${escapeHtml(cal.id)}"${checked} style="width:auto">
        <span>${escapeHtml(cal.name)}${cal.primary ? ' <span class="pu-muted">(primary)</span>' : ''}</span>
      </label>`
    })
    .join('\n      ')

  const writeOptions = [
    `<option value=""${c.calendarIdWrite === null ? ' selected' : ''}>Не записувати події</option>`,
    ...calendars.map(
      (cal) =>
        `<option value="${escapeHtml(cal.id)}"${c.calendarIdWrite === cal.id ? ' selected' : ''}>${escapeHtml(cal.name)}</option>`,
    ),
  ].join('\n        ')

  return `<article class="pu-card">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap">
    <h2 style="margin:0">${escapeHtml(providerLabel(c.provider))}</h2>
    ${syncBadge(c)}
  </div>
  <p class="pu-muted" style="margin:.25rem 0 0">${escapeHtml(c.providerAccountEmail || 'Unknown account')}</p>
  ${
    c.syncStatus === 'needs_reconnect'
      ? `<div style="margin:.75rem 0" role="alert">
    <p class="pu-err" style="font-size:.9375rem">Доступ відкликано або він протермінувався. Накладки з цього календаря
       не перевіряються, нові бронювання в нього не пишуться.</p>
    <a class="pu-btn" href="/auth/${c.provider}/start?purpose=calendar">Перепідключити ${escapeHtml(providerLabel(c.provider))}</a>
  </div>`
      : ''
  }
  <form method="post" action="/dashboard/connections/${id}">
    ${csrfField(d.csrf)}
    <fieldset style="border:0;padding:0;margin:1rem 0 0">
      <legend style="font-size:.875rem;font-weight:600;padding:0">Перевіряти на конфлікти</legend>
      ${readRows || '<p class="pu-muted">Календарів немає.</p>'}
    </fieldset>
    <label for="write-${escapeHtml(c.id)}">Write bookings to</label>
    <select id="write-${escapeHtml(c.id)}" name="write">
        ${writeOptions}
    </select>
    <div style="margin-top:1rem"><button class="pu-btn" type="submit">Зберегти</button></div>
  </form>
  <form method="post" action="/dashboard/connections/${id}/disconnect" style="margin-top:.75rem">
    ${csrfField(d.csrf)}
    <button class="pu-btn pu-btn-danger" type="submit">Відключити</button>
  </form>
</article>`
}

function syncBadge(c: CalendarConnection): string {
  if (c.syncStatus === 'ok') return '<span class="pu-badge">Підключено</span>'
  const label = c.syncStatus === 'needs_reconnect' ? 'Потрібне перепідключення' : 'Помилка синхронізації'
  return `<span class="pu-badge" style="background:var(--pu-paper-dim);color:var(--pu-danger-text)">${label}</span>`
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

export interface ApiKeysPageData extends DashboardChrome {
  keys: ApiKey[]
  /**
   * The raw key, rendered EXACTLY once immediately after creation (ADR-0005
   * §7). Only its SHA-256 is stored, so this string cannot be produced again by
   * anyone, including us.
   */
  newKey?: string
  errors?: Record<string, string>
}

export function apiKeysPage(d: ApiKeysPageData): string {
  const errors = d.errors ?? {}

  const list =
    d.keys.length === 0
      ? '<p class="pu-muted">Ключів ще немає.</p>'
      : `<ul style="list-style:none;padding:0;margin:0;display:grid;gap:.75rem">
      ${d.keys.map((k) => apiKeyRow(d, k)).join('\n      ')}
    </ul>`

  return (
    shellTop(d, 'API-ключі', 'keys') +
    (d.newKey
      ? `<section class="pu-card" role="alert" aria-label="Твій новий API-ключ"
    style="border-color:var(--pu-green-fill);margin-bottom:1.5rem">
  <h2>Скопіюй ключ зараз</h2>
  <p><strong>Показуємо його лише раз.</strong> Ми зберігаємо тільки хеш, тож якщо загубиш —
     доведеться створити новий.</p>
  <label for="new-key">Новий API-ключ</label>
  <div class="pu-url">
    <input id="new-key" class="pu-url-input" readonly value="${escapeHtml(d.newKey)}" onclick="this.select()">
    ${copyButton(d.newKey)}
  </div>
</section>`
      : '') +
    `<section aria-label="API keys">
  <h1>API-ключі</h1>
  <p class="pu-muted">Ключі автентифікують REST API та MCP-сервер. Повноваження агента — рівно права його ключа.</p>
  ${list}
  <form class="pu-card" method="post" action="/dashboard/api-keys" style="margin-top:1.5rem">
    ${csrfField(d.csrf)}
    <h2>Створити ключ</h2>
    <label for="name">Назва</label>
    <input id="name" name="name" required aria-required="true" maxlength="80"
           placeholder="Ноутбук CLI"${describedBy('name', errors)}>
    ${fieldError('name', errors)}
    <label for="scopes">Права</label>
    <input id="scopes" name="scopes" value="read write"
           maxlength="200"${describedBy('scopes', errors)}>
    <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">Через пробіл. Давай мінімум, який працює.</p>
    ${fieldError('scopes', errors)}
    <div style="margin-top:1.25rem"><button class="pu-btn" type="submit">Створити ключ</button></div>
  </form>
</section>` +
    shellBottom(d.brandName)
  )
}

function apiKeyRow(d: ApiKeysPageData, k: ApiKey): string {
  const created = formatInZone(k.createdAt, d.user.tz, { month: 'short', day: 'numeric', year: 'numeric' })
  const used =
    k.lastUsedAt === null
      ? 'never used'
      : `last used ${formatInZone(k.lastUsedAt, d.user.tz, { month: 'short', day: 'numeric' })}`
  return `<li class="pu-card" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
        <div>
          <strong>${escapeHtml(k.name || 'Unnamed key')}</strong><br>
          <span class="pu-time pu-muted">pk_${escapeHtml(k.prefix)}…</span>
          <span class="pu-muted">· created ${escapeHtml(created)} · ${escapeHtml(used)}</span>
        </div>
        <form method="post" action="/dashboard/api-keys/${encodeURIComponent(k.id)}/delete" style="margin:0">
          ${csrfField(d.csrf)}
          <button class="pu-btn pu-btn-danger" type="submit"
                  style="padding:.4rem .8rem;font-size:.875rem">Відкликати</button>
        </form>
      </li>`
}

// ---------------------------------------------------------------------------
// Settings — the host's own slug
// ---------------------------------------------------------------------------

export interface SettingsPageData extends DashboardChrome {
  /**
   * What the slug field shows. Defaults to the current slug. Set to the raw
   * typed value on a failed submit, same reasoning as `readEventTypeForm`:
   * discarding a bad value here would silently clear the field the host needs
   * to fix.
   */
  slugValue?: string
  /** Same reasoning as `slugValue`, for the profile form's Name field. */
  nameValue?: string
  /** Same reasoning as `slugValue`, for the profile form's Position field. */
  jobTitleValue?: string
  /** Same reasoning as `slugValue`, for the profile form's Company field. */
  companyValue?: string
  /** Same reasoning as `slugValue`, for the profile form's Company link field. */
  companyUrlValue?: string
  errors?: Record<string, string>
  notice?: string
}

export function settingsPage(d: SettingsPageData): string {
  const errors = d.errors ?? {}
  const slugValue = d.slugValue ?? d.user.slug
  const nameValue = d.nameValue ?? d.user.name
  const jobTitleValue = d.jobTitleValue ?? d.user.jobTitle ?? ''
  const companyValue = d.companyValue ?? d.user.company ?? ''
  const companyUrlValue = d.companyUrlValue ?? d.user.companyUrl ?? ''

  return (
    shellTop(d, 'Профіль', 'settings') +
    (d.notice ? notice(d.notice) : '') +
    // One panel, one identity: the photo IS part of the profile, and the
    // split cards read as two unrelated features. Photo column left (the
    // file input is visually hidden — the styled label is the whole control,
    // and choosing a file submits immediately, so there is no separate
    // Upload step to explain), fields right.
    `<section class="pu-card" aria-label="Твій профіль" style="margin-bottom:1.25rem">
  <h1>Профіль</h1>
  <h2>Твій профіль</h2>
  <p class="pu-muted">Показується на сторінці бронювання і в листах-підтвердженнях.</p>
  <div class="pu-profile">
    <div class="pu-profile-photo">
      ${avatarHtml({ key: d.user.avatarKey, name: d.user.name || d.user.slug, size: 88 })}
      <form method="post" action="/dashboard/settings/avatar" enctype="multipart/form-data">
        ${csrfField(d.csrf)}
        <label class="pu-btn pu-btn-ghost pu-file-btn">Завантажити
          <input type="file" name="avatar" accept="image/png,image/jpeg,image/webp" class="pu-sr"
                 aria-label="Обери фото" onchange="this.form.submit()"${describedBy('avatar', errors)}>
        </label>
        <noscript><button class="pu-btn" type="submit" style="margin-top:.5rem">Завантажити</button></noscript>
      </form>
      ${
        d.user.avatarKey
          ? `<form method="post" action="/dashboard/settings/avatar/delete">
        ${csrfField(d.csrf)}
        <button class="pu-btn-plain" type="submit">Прибрати</button>
      </form>`
          : ''
      }
      <p class="pu-muted" style="font-size:.75rem;margin:0;text-align:center">PNG, JPEG або WebP,<br>до 5&nbsp;МБ</p>
      ${fieldError('avatar', errors)}
    </div>
    <form method="post" action="/dashboard/settings/profile" class="pu-profile-fields">
      ${csrfField(d.csrf)}
      <label for="name">Назва</label>
      <input id="name" name="name" required aria-required="true" maxlength="120"
             value="${escapeHtml(nameValue)}"${describedBy('name', errors)}>
      ${fieldError('name', errors)}
      <label for="job_title">Посада</label>
      <input id="job_title" name="job_title" maxlength="120" placeholder="Не обовʼязково"
             value="${escapeHtml(jobTitleValue)}"${describedBy('job_title', errors)}>
      ${fieldError('job_title', errors)}
      <label for="company">Компанія</label>
      <input id="company" name="company" maxlength="120" placeholder="Не обовʼязково"
             value="${escapeHtml(companyValue)}"${describedBy('company', errors)}>
      ${fieldError('company', errors)}
      <label for="company_url">Посилання компанії</label>
      <input id="company_url" name="company_url" type="url" maxlength="200" placeholder="https://… (не обовʼязково)"
             value="${escapeHtml(companyUrlValue)}"${describedBy('company_url', errors)}>
      <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">Обгортає назву компанії на сторінці бронювання посиланням.</p>
      ${fieldError('company_url', errors)}
      <div style="margin-top:1.25rem"><button class="pu-btn" type="submit">Зберегти профіль</button></div>
    </form>
  </div>
</section>
<section class="pu-card" aria-label="Налаштування акаунта">
  <h2>Адреса твоєї сторінки</h2>
  <p class="pu-muted">Кожна твоя подія публікується за адресою
    <code>/${escapeHtml(d.user.slug)}/&lt;подія&gt;</code>. Зміна адреси переносить
    <strong>усі</strong> події одночасно.</p>
  <div role="alert" class="pu-callout" style="margin:.75rem 0">
    <p style="margin:0">
      Будь-яке посилання чи QR-код, який ти вже поширив &mdash; у підписі листа, на сайті, на друкованій
      листівці &mdash; перестане працювати щойно збережеш. Перенаправлення зі старої адреси
      <code>${escapeHtml(d.user.slug)}</code> немає: гість зі старим посиланням побачить сторінку
      &laquo;не знайдено&raquo;. Онови всі місця, де публікував посилання, до або одразу після зміни.</p>
  </div>
  <form method="post" action="/dashboard/settings">
    ${csrfField(d.csrf)}
    <label for="slug">Адреса</label>
    <input id="slug" name="slug" required aria-required="true" maxlength="40" pattern="[a-z0-9\-]+"
           value="${escapeHtml(slugValue)}"${describedBy('slug', errors)}>
    <p class="pu-muted" style="font-size:.8125rem;margin:.25rem 0 0">
      Лише малі латинські літери, цифри та дефіси, 2&ndash;40 символів. Це перша частина всіх твоїх
      посилань: /&lt;адреса&gt;/&lt;подія&gt;.</p>
    ${fieldError('slug', errors)}
    <div style="margin-top:1.25rem"><button class="pu-btn" type="submit">Зберегти адресу</button></div>
  </form>
</section>` +
    shellBottom(d.brandName)
  )
}

// ---------------------------------------------------------------------------
// Guest manage page
// ---------------------------------------------------------------------------

export interface BookingDetailPageData {
  brandName: string
  booking: Booking
  /** Null when the event type has since been deleted; the booking still stands. */
  eventType: EventType | null
  host: User
  /**
   * The signed manage token from the query string. It is the credential
   * (ADR-0005 §4) and travels back on every form, which is also why these
   * forms carry no CSRF token: there is no session and no ambient authority to
   * forge, exactly as on the public booking page (ADR-0005 §5).
   */
  token: string
  /** What this token is allowed to do. A cancel link cannot reschedule. */
  /**
   * The token's real purpose. `manage` authorises BOTH actions and is the only
   * purpose the coordinator mints, so narrowing this type is what previously
   * hid the cancel form from every guest.
   */
  purpose: 'manage' | 'cancel' | 'reschedule'
  /** Times offered for a reschedule, when the guest picked a day. */
  slots?: Slot[]
  selectedDate?: string
  /** Set once the guest chose a time, so the page can ask for confirmation. */
  newStart?: number
  error?: string
}

export function bookingDetailPage(d: BookingDetailPageData): string {
  const tz = d.booking.guestTimezone
  const when = formatInZone(d.booking.startUtc, tz, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const title = d.eventType?.title ?? 'Твоє бронювання'
  const cancelled = d.booking.status !== 'confirmed'
  const tokenField = `<input type="hidden" name="token" value="${escapeHtml(d.token)}">`

  return (
    shellHead({ title: `${title} · ${d.brandName}`, brandName: d.brandName }) +
    `<section class="pu-card" aria-label="Твоє бронювання">
  <p><span class="pu-badge"${cancelled ? ' style="background:var(--pu-paper-dim);color:var(--pu-ink-500)"' : ''}>${escapeHtml(statusLabel(d.booking))}</span></p>
  <h1>${escapeHtml(title)}</h1>
  <p>· ${escapeHtml(d.host.name || d.host.slug)}</p>
  <p class="pu-time"><strong>${escapeHtml(when)}</strong><br>
    <span class="pu-muted">${escapeHtml(tz)} (${escapeHtml(offsetLabel(d.booking.startUtc, tz))}) · ${
      Math.round((d.booking.endUtc - d.booking.startUtc) / 60000)
    } хв</span></p>
  ${d.eventType ? `<p class="pu-muted">${escapeHtml(locationLabel(d.eventType))}</p>` : ''}
  ${d.error ? `<p class="pu-err" role="alert">${escapeHtml(d.error)}</p>` : ''}
</section>` +
    (cancelled
      ? `<section class="pu-card" style="margin-top:1.5rem">
  <p class="pu-muted">Це бронювання вже неактивне — змінювати нічого.</p>
</section>`
      : rescheduleSection(d, tokenField) + cancelSection(d, tokenField)) +
    shellFoot(d.brandName)
  )
}

function statusLabel(b: Booking): string {
  switch (b.status) {
    case 'cancelled':
      return 'Скасовано'
    case 'rescheduled':
      return 'Перенесено'
    default:
      return 'Підтверджено'
  }
}

function rescheduleSection(d: BookingDetailPageData, tokenField: string): string {
  // Same as cancelSection: 'manage' authorises this too.
  if (d.purpose !== 'reschedule' && d.purpose !== 'manage') {
    return `<section class="pu-card" style="margin-top:1.5rem" aria-label="Перенесення">
  <h2>Потрібен інший час?</h2>
  <p class="pu-muted">Скористайся посиланням на перенесення з листа-підтвердження — це лише скасовує.</p>
</section>`
  }

  const path = d.eventType
    ? `/booking/${encodeURIComponent(d.booking.id)}?token=${encodeURIComponent(d.token)}`
    : null
  if (!path) {
    return `<section class="pu-card" style="margin-top:1.5rem" aria-label="Перенесення">
  <h2>Перенести</h2>
  <p class="pu-muted">Цю подію більше не проводять, тож перенести не вийде. Скасуй і забронюй заново.</p>
</section>`
  }

  if (d.newStart !== undefined) {
    const when = formatInZone(d.newStart, d.booking.guestTimezone, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    return `<section class="pu-card" style="margin-top:1.5rem" aria-label="Підтвердження нового часу">
  <h2>Перенести на цей час?</h2>
  <p class="pu-time"><strong>${escapeHtml(when)}</strong><br>
    <span class="pu-muted">${escapeHtml(d.booking.guestTimezone)}</span></p>
  <form method="post" action="/booking/${encodeURIComponent(d.booking.id)}/reschedule">
    ${tokenField}
    <input type="hidden" name="start" value="${d.newStart}">
    <div style="display:flex;gap:.75rem;flex-wrap:wrap">
      <button class="pu-btn" type="submit">Підтвердити новий час</button>
      <a class="pu-btn pu-btn-ghost" href="${escapeHtml(path)}">Back</a>
    </div>
  </form>
</section>`
  }

  const date = d.selectedDate ?? localDateString(d.booking.startUtc, d.booking.guestTimezone)
  const slots = d.slots ?? []
  const list =
    slots.length === 0
      ? '<p class="pu-muted">На цей день вільних слотів немає.</p>'
      : `<div class="pu-slots">
    ${slots
      .map((s) => {
        const label = formatInZone(s.start, d.booking.guestTimezone, { hour: 'numeric', minute: '2-digit' })
        const href = `${path}&date=${encodeURIComponent(date)}&start=${s.start}`
        return `<a class="${slotStateClassName('available')}" href="${escapeHtml(href)}">
      <time datetime="${new Date(s.start).toISOString()}">${escapeHtml(label)}</time></a>`
      })
      .join('\n    ')}
  </div>`

  return `<section class="pu-card" style="margin-top:1.5rem" aria-label="Перенесення">
  <h2>Обери новий час</h2>
  <form method="get" action="/booking/${encodeURIComponent(d.booking.id)}">
    <input type="hidden" name="token" value="${escapeHtml(d.token)}">
    <label for="date">День</label>
    <input id="date" name="date" type="date" value="${escapeHtml(date)}">
    <div style="margin-top:.75rem"><button class="pu-btn pu-btn-ghost" type="submit">Показати час</button></div>
  </form>
  <p class="pu-muted" style="font-size:.8125rem;margin-top:1rem">
    Час у зоні ${escapeHtml(d.booking.guestTimezone)}</p>
  ${list}
</section>`
}

function cancelSection(d: BookingDetailPageData, tokenField: string): string {
  // A 'manage' token authorises both actions, and it is the ONLY purpose the
  // coordinator mints. Refusing anything that is not literally 'cancel' left
  // every real guest looking at "use the cancel link in your email" — while
  // that email's cancel link is this same URL. The loop never terminated.
  if (d.purpose !== 'cancel' && d.purpose !== 'manage') {
    return `<section class="pu-card" style="margin-top:1.5rem" aria-label="Скасування">
  <h2>Потрібно скасувати?</h2>
  <p class="pu-muted">Скористайся посиланням на скасування з листа-підтвердження — це лише переносить.</p>
</section>`
  }
  return `<form class="pu-card" method="post" style="margin-top:1.5rem"
      action="/booking/${encodeURIComponent(d.booking.id)}/cancel">
  ${tokenField}
  <h2>Скасувати бронювання</h2>
  <p class="pu-muted">Ми повідомимо організатора, а час звільнимо для інших.</p>
  <button class="pu-btn pu-btn-danger" type="submit">Скасувати бронювання</button>
</form>`
}

/** Shared "this link is not valid" page. Says nothing about why. */
export function manageLinkErrorPage(brandName: string, message: string): string {
  return (
    shellHead({ title: `Link not valid · ${brandName}`, brandName }) +
    `<section class="pu-card">
  <h1>Посилання недійсне</h1>
  <p class="pu-muted">${escapeHtml(message)}</p>
  <p class="pu-muted">Посилання мають строк дії, а перенесення скасовує всі попередні. У найсвіжішому
     листі-підтвердженні посилання завжди робоче.</p>
</section>` +
    shellFoot(brandName)
  )
}

// ---------------------------------------------------------------------------
// Text formats — rendered and parsed side by side, on purpose
// ---------------------------------------------------------------------------

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function timeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  // 24:00 is accepted as "end of day" — it is the only way to express a window
  // that runs to midnight without an off-by-one at the boundary.
  if (h > 24 || min > 59 || (h === 24 && min !== 0)) return null
  return h * 60 + min
}

export function formatWindows(windows: DayWindow[]): string {
  return windows.map((w) => `${minutesToTime(w.startMinute)}-${minutesToTime(w.endMinute)}`).join(', ')
}

/**
 * `09:00-12:00, 13:00-17:00` → windows. Null on anything malformed.
 *
 * Rejects rather than repairs: silently dropping an unparseable range would
 * make a host believe they are bookable when they are not.
 */
export function parseWindows(value: string): DayWindow[] | null {
  const trimmed = value.trim()
  if (trimmed === '') return []
  const out: DayWindow[] = []
  for (const part of trimmed.split(',')) {
    const [rawStart, rawEnd, ...rest] = part.split('-')
    if (rawStart === undefined || rawEnd === undefined || rest.length > 0) return null
    const start = timeToMinutes(rawStart)
    const end = timeToMinutes(rawEnd)
    if (start === null || end === null || end <= start) return null
    // Snap INWARD to the 5-minute bucket grid: start up, end down. A window
    // beginning at 09:07 would anchor the slot grid off-grid, which lets two
    // adjacent offered slots claim the same bucket and 409 each other
    // (ADR-0004 §4). Snapping inward can never widen availability beyond what
    // the host typed.
    const snappedStart = Math.ceil(start / 5) * 5
    const snappedEnd = Math.floor(end / 5) * 5
    if (snappedEnd <= snappedStart) return null
    out.push({ startMinute: snappedStart, endMinute: snappedEnd })
  }
  return out.sort((a, b) => a.startMinute - b.startMinute)
}

export function formatOverrides(overrides: DateOverride[]): string {
  return overrides
    .map((o) => (o.windows.length === 0 ? o.date : `${o.date} ${formatWindows(o.windows)}`))
    .join('\n')
}

/** One override per line: `YYYY-MM-DD` alone is a day off. Null on malformed input. */
export function parseOverrides(text: string): DateOverride[] | null {
  const out: DateOverride[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line === '') continue
    const date = line.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
    const windows = parseWindows(line.slice(10))
    if (windows === null) return null
    out.push({ date, windows })
  }
  return out
}

const QUESTION_TYPES: readonly EventTypeQuestion['type'][] = ['text', 'textarea', 'select']

export function formatQuestions(questions: EventTypeQuestion[]): string {
  return questions
    .map((q) => {
      const base = `${q.label} | ${q.type} | ${q.required ? 'required' : 'optional'}`
      return q.type === 'select' && q.options && q.options.length > 0
        ? `${base} | ${q.options.join(', ')}`
        : base
    })
    .join('\n')
}

/**
 * `Label | type | required | a, b` per line. Null on malformed input.
 *
 * The id is derived from the label rather than kept hidden in the form: this
 * editor has no client JS to carry ids around, and a stable derivation gives
 * the same id back for an unchanged label. Renaming a question therefore
 * changes its id and orphans answers already stored under the old one — which
 * is the honest outcome, since a renamed question is usually a different
 * question.
 */
export function parseQuestions(text: string): EventTypeQuestion[] | null {
  const out: EventTypeQuestion[] = []
  const seen = new Set<string>()
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line === '') continue
    const parts = line.split('|').map((p) => p.trim())
    const label = parts[0] ?? ''
    if (label === '' || label.length > 200) return null

    const type = (parts[1] ?? 'text') as EventTypeQuestion['type']
    if (!QUESTION_TYPES.includes(type)) return null

    const requiredWord = (parts[2] ?? 'optional').toLowerCase()
    if (requiredWord !== 'required' && requiredWord !== 'optional') return null

    const options = (parts[3] ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o !== '')
    if (type === 'select' && options.length === 0) return null

    let id = slugify(label)
    if (id === '') return null
    // Two questions with the same label would otherwise share an id, and the
    // second answer would overwrite the first.
    let n = 2
    while (seen.has(id)) id = `${slugify(label)}-${n++}`
    seen.add(id)

    const question: EventTypeQuestion = { id, label, type, required: requiredWord === 'required' }
    if (type === 'select') question.options = options
    out.push(question)
  }
  return out
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function trimSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminPageData extends DashboardChrome {
  /** Every user on the instance, oldest first. */
  allUsers: User[]
  /**
   * The signup policy as stored/effective, in SIGNUPS env syntax
   * ('open' | 'closed' | comma list), plus whether the env var pins it —
   * a pinned policy renders read-only, because silently out-ranking an
   * operator's wrangler config from a web form is how two people each
   * believe they control the same setting.
   */
  signups: { value: string; pinnedByEnv: boolean }
  errors?: Record<string, string>
  notice?: string
}

export function adminPage(d: AdminPageData): string {
  const errors = d.errors ?? {}
  const parsedMode = d.signups.value === 'closed' ? 'closed' : d.signups.value === 'open' || d.signups.value === '' ? 'open' : 'allowlist'
  const allowlistValue = parsedMode === 'allowlist' ? d.signups.value : ''

  const admins = d.allUsers.filter((u) => u.role === 'admin').length
  const rows = d.allUsers
    .map((u) => {
      const isSelf = u.id === d.user.id
      const lastAdmin = u.role === 'admin' && admins <= 1
      // The last admin gets no demote button at all — the server enforces it
      // too, but offering a button that can only fail is UI lying.
      const action = lastAdmin
        ? '<span class="pu-muted">Останній адмін</span>'
        : `<form method="post" action="/dashboard/admin/users/${encodeURIComponent(u.id)}/role" style="margin:0">
            ${csrfField(d.csrf)}
            <input type="hidden" name="role" value="${u.role === 'admin' ? 'member' : 'admin'}">
            <button class="pu-btn pu-btn-ghost" type="submit" style="padding:.3rem .6rem;font-size:.8125rem">
              ${u.role === 'admin' ? 'Зняти адміна' : 'Зробити адміном'}</button>
          </form>`
      return `<tr>
        <td>${escapeHtml(u.name || u.slug)}${isSelf ? ' <span class="pu-muted">(you)</span>' : ''}<br>
          <span class="pu-muted" style="font-size:.8125rem">${escapeHtml(u.email)}</span></td>
        <td class="pu-time">/${escapeHtml(u.slug)}</td>
        <td>${u.role === 'admin' ? '<span class="pu-badge">Адмін</span>' : '<span class="pu-muted">Учасник</span>'}</td>
        <td>${action}</td>
      </tr>`
    })
    .join('\n')

  const signupsBody = d.signups.pinnedByEnv
    ? `<p class="pu-muted">Pinned to <code>${escapeHtml(d.signups.value)}</code> by the <code>SIGNUPS</code>
        variable on this deployment. Remove that variable to manage sign-ups from here.</p>`
    : `<form method="post" action="/dashboard/admin/signups">
    ${csrfField(d.csrf)}
    <label style="display:flex;align-items:baseline;gap:.5rem;font-weight:400;margin:.5rem 0 0">
      <input type="radio" name="mode" value="open"${parsedMode === 'open' ? ' checked' : ''} style="width:auto">
      <span><strong>Відкрита</strong> — будь-хто, хто дійшов до сторінки входу, може створити акаунт</span>
    </label>
    <label style="display:flex;align-items:baseline;gap:.5rem;font-weight:400;margin:.5rem 0 0">
      <input type="radio" name="mode" value="closed"${parsedMode === 'closed' ? ' checked' : ''} style="width:auto">
      <span><strong>Закрита</strong> — лише наявні користувачі; нових не буде</span>
    </label>
    <label style="display:flex;align-items:baseline;gap:.5rem;font-weight:400;margin:.5rem 0 0">
      <input type="radio" name="mode" value="allowlist"${parsedMode === 'allowlist' ? ' checked' : ''} style="width:auto">
      <span><strong>Список</strong> — лише ці адреси та <code>@домени</code>:</span>
    </label>
    <input name="allowlist" value="${escapeHtml(allowlistValue)}" placeholder="jo@acme.com, @acme.com"
           style="margin-top:.5rem"${describedBy('allowlist', errors)}>
    ${fieldError('allowlist', errors)}
    <div style="margin-top:1.25rem"><button class="pu-btn" type="submit">Зберегти політику реєстрації</button></div>
  </form>`

  return (
    shellTop(d, 'Адмін', 'admin') +
    (d.notice ? notice(d.notice) : '') +
    `<section class="pu-card" aria-label="Реєстрація" style="margin-bottom:1.25rem">
  <h1>Адмін</h1>
  <h2>Реєстрація</h2>
  <p class="pu-muted">Хто може створити акаунт на цьому сервері. Наявні користувачі входять завжди.</p>
  ${signupsBody}
</section>
<section class="pu-card" aria-label="Користувачі">
  <h2>Користувачі</h2>
  ${fieldError('role', errors)}
  <div class="pu-docs-table-wrap"><table style="width:100%">
    <thead><tr><th scope="col" style="text-align:left">Користувач</th><th scope="col" style="text-align:left">Сторінка</th>
      <th scope="col" style="text-align:left">Роль</th><th scope="col" style="text-align:left"></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
</section>` +
    shellBottom(d.brandName)
  )
}
