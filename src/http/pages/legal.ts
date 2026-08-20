/**
 * Privacy policy and terms.
 *
 * These exist because Google's OAuth verification checks that both URLs
 * resolve and describe the actual data handling for the requested scopes — a
 * generic template is a common rejection reason. So this describes what the
 * engine genuinely does, and every claim is checkable against the code.
 *
 * Written for THIS deployment: one company's internal scheduling tool, whose
 * hosts are its own staff and whose guests are the people they meet. The
 * upstream project's self-hosting and open-source sections are gone — they
 * described a public product with third-party deployments, which would be
 * simply untrue on a policy page here.
 *
 * The Google API Services User Data Policy paragraph in `privacyPage` is
 * load-bearing for OAuth verification. Reword it only with care; do not drop
 * the Limited Use commitments.
 */

import { escapeHtml } from './booking.js'

export interface LegalPageOptions {
  brandName: string
  supportEmail: string
  baseUrl: string
  /** Company or individual acting as data controller. */
  operator?: string
  lastUpdated?: string
}

function shell(body: string): string {
  return `<article class="pu-card" style="max-width:44rem;margin:0 auto">
  ${body}
</article>`
}

export function privacyPage(o: LegalPageOptions): string {
  const updated = o.lastUpdated ?? '2026-08-20'
  const operator = o.operator ?? o.brandName
  return shell(
    `<h1>Політика приватності</h1>
<p class="pu-muted">Оновлено ${escapeHtml(updated)}</p>

<p>${escapeHtml(o.brandName)} — сервіс бронювання зустрічей. Ця політика описує, які дані
збирає ${escapeHtml(operator)} за адресою ${escapeHtml(o.baseUrl)} і навіщо.</p>

<h2>Що ми збираємо</h2>

<h3>Якщо ти організатор (маєш акаунт)</h3>
<ul>
  <li><strong>Email та імʼя</strong> — щоб ідентифікувати акаунт і надсилати сповіщення про бронювання.</li>
  <li><strong>Часовий пояс і розклад</strong> — щоб порахувати, коли тебе можна забронювати.</li>
  <li><strong>Токени підключеного календаря</strong> — зашифровані на диску (AES-GCM), використовуються лише щоб читати твою зайнятість і записувати бронювання, які ти отримуєш.</li>
</ul>

<h3>Якщо ти гість (забронював зустріч)</h3>
<ul>
  <li><strong>Імʼя та email</strong> — щоб ідентифікувати бронювання і надіслати підтвердження та запрошення в календар.</li>
  <li><strong>Відповіді на питання організатора</strong> — передаються організатору й потрапляють у подію календаря.</li>
  <li><strong>Часовий пояс</strong> — щоб показати час у твоєму поясі. Визначається з браузера або мережі, і ти можеш його змінити.</li>
</ul>

<p>Ми не використовуємо cookies для реклами чи аналітики. Сторінка бронювання не
ставить жодного cookie. Сесійний cookie зʼявляється лише коли організатор входить в акаунт.</p>

<h2>Дані Google Calendar та Microsoft 365</h2>

<p>Підключаючи календар, ми запитуємо найвужчі дозволи, з якими сервіс працює:</p>

<ul>
  <li><strong>Зайнятість (free/busy)</strong> — ми бачимо, <em>коли</em> ти зайнятий. Ми не читаємо назви, описи, учасників чи місця твоїх наявних подій.</li>
  <li><strong>Події</strong> — ми створюємо, оновлюємо й видаляємо лише ті події, які бронює сам ${escapeHtml(o.brandName)}. Події, створені деінде, не змінюємо.</li>
  <li><strong>Список календарів</strong> — лише читання, щоб ти міг обрати, які календарі перевіряти й у який записувати.</li>
</ul>

<p><strong>Дані про зайнятість не зберігаються.</strong> Вони запитуються під час
рендеру сторінки бронювання, кешуються щонайбільше 60 секунд, щоб не навантажувати
провайдера, і ніколи не потрапляють у нашу базу.</p>

<p>Використання сервісом ${escapeHtml(o.brandName)} інформації, отриманої з Google API,
відповідає
<a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>,
включно з вимогами Limited Use. Ми не передаємо ці дані третім сторонам, окрім випадків,
необхідних для роботи сервісу; не використовуємо їх для реклами; і не дозволяємо людям
їх читати, окрім як за твоєю явною згодою, з міркувань безпеки або на вимогу закону.</p>

<h2>З ким ділимося</h2>

<p>Ми не продаємо персональні дані. Ділимося лише з підрядниками, необхідними для роботи
сервісу: хостинг-провайдером (Cloudflare) і провайдером транзакційної пошти. Деталі
бронювання отримує друга сторона зустрічі — у цьому й суть бронювання.</p>

<h2>Скільки зберігаємо</h2>

<ul>
  <li>Бронювання зберігаються, поки існує акаунт, щоб у тебе лишалася історія зустрічей.</li>
  <li>Токени календаря видаляються одразу, щойно ти відключаєш календар.</li>
  <li>Видалення акаунта видаляє твої бронювання, розклад і підключення.</li>
</ul>

<h2>Твої права</h2>

<p>Ти можеш експортувати або видалити свої дані та відкликати доступ до календаря будь-коли —
у налаштуваннях ${escapeHtml(o.brandName)} і незалежно від нас на сторінці
<a href="https://myaccount.google.com/permissions">дозволів Google-акаунта</a>.
Якщо ти гість і хочеш, щоб дані твого бронювання прибрали, — напиши нам, і ми їх приберемо.</p>

<p>Згідно з GDPR ти маєш право на доступ, виправлення, стирання, обмеження обробки,
перенесення даних і заперечення. Пиши на
<a href="mailto:${escapeHtml(o.supportEmail)}">${escapeHtml(o.supportEmail)}</a>.</p>

<h2>Безпека</h2>

<p>Refresh-токени календаря шифруються AES-GCM перед збереженням. Ідентифікатори сесій
і API-ключі зберігаються лише у вигляді хешів. Посилання в листах, які дозволяють гостю
перенести чи скасувати зустріч, підписані й мають строк дії.</p>

<h2>Контакт</h2>
<p><a href="mailto:${escapeHtml(o.supportEmail)}">${escapeHtml(o.supportEmail)}</a></p>`,
  )
}

export function termsPage(o: LegalPageOptions): string {
  const updated = o.lastUpdated ?? '2026-08-20'
  const operator = o.operator ?? o.brandName
  return shell(
    `<h1>Умови користування</h1>
<p class="pu-muted">Оновлено ${escapeHtml(updated)}</p>

<p>Ці умови стосуються сервісу ${escapeHtml(o.brandName)} за адресою
${escapeHtml(o.baseUrl)}, який керується ${escapeHtml(operator)}. Користуючись сервісом,
ти їх приймаєш.</p>

<h2>Сервіс</h2>
<p>${escapeHtml(o.brandName)} дозволяє опублікувати сторінку бронювання, щоб інші люди
могли забронювати час. Він підключається до твого календаря, щоб знати, коли ти зайнятий,
і записувати зустрічі, які ти приймаєш.</p>

<h2>Твій акаунт</h2>
<ul>
  <li>Ти відповідаєш за все, що відбувається під твоїм акаунтом, і за збереження доступу до своєї пошти.</li>
  <li>Не використовуй сервіс для небажаних розсилок, видавання себе за іншого чи будь-чого протиправного.</li>
</ul>

<h2>Доступність</h2>
<p>Ми намагаємося тримати сервіс у робочому стані й не вдаватимемо, що все гаразд, коли
щось зламалося. Сервіс надається «як є», без гарантій. Ми не несемо відповідальності за
пропущені зустрічі, втрачені бронювання чи бізнесові наслідки простою або помилки —
у межах, дозволених законом.</p>

<h2>Твій контент</h2>
<p>Твої бронювання, розклад і описи подій лишаються твоїми. Ти надаєш нам лише той дозвіл,
який потрібен для роботи сервісу: зберігати ці дані, показувати їх людям, з якими ти
зустрічаєшся, і передавати їх твоєму календарному провайдеру.</p>

<h2>Припинення</h2>
<p>Ти можеш припинити користуватися сервісом і видалити акаунт будь-коли. Ми можемо
призупинити акаунт, який зловживає сервісом або створює ризик для інших, — і скажемо, чому.</p>

<h2>Зміни</h2>
<p>Якщо ми суттєво змінимо ці умови, повідомимо до того, як зміни наберуть чинності.</p>

<h2>Контакт</h2>
<p><a href="mailto:${escapeHtml(o.supportEmail)}">${escapeHtml(o.supportEmail)}</a></p>`,
  )
}
