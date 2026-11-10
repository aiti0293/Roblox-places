import { forwardRef, useEffect, useState } from 'react'
import { ROOMS, ANCHORS, FLAT, OFFICE, PLAN_FLOOR } from '../config'

/* ── brand atoms ─────────────────────────────────────────────── */

const LeafDash = ({ flip = false }) => (
  <svg width="22" height="6" viewBox="0 0 22 6" aria-hidden="true" className={flip ? '-scale-x-100' : ''}>
    <path d="M1 3c6-3.5 14-3.5 20 0-6 3.5-14 3.5-20 0z" fill="#CBDFA2" />
  </svg>
)

export const Wordmark = ({ className = '' }) => (
  <span className={`inline-flex flex-col items-center leading-none ${className}`}>
    <span className="font-display text-[21px] tracking-[0.02em] sm:text-[26px] md:text-[30px]">МИЧУРИН</span>
    <span className="mt-1 flex items-center gap-1.5 text-[10px] lowercase sm:text-[11px] tracking-[0.12em] opacity-90">
      <LeafDash /> жилой дом <LeafDash flip />
    </span>
  </span>
)

const Arrow = () => (
  <svg className="arrow" width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
    <path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

const BuildingIcon = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <rect x="7" y="3" width="18" height="22" />
    {[7, 12, 17].map((y) => [11, 16, 21].map((x) => <rect key={`${x}${y}`} x={x - 1.6} y={y - 1.6} width="3.2" height="3.2" />))}
    <path d="M3 25h26v4H3zM6 25v4M10 25v4M14 25v4M18 25v4M22 25v4M26 25v4" />
  </svg>
)

const navTo = (onNav, vh) => (e) => {
  e.preventDefault()
  onNav(vh)
}

/* ── header + leaf menu ─────────────────────────────────────── */

export function Header({ onNav }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (vh) => (e) => {
    setOpen(false)
    navTo(onNav, vh)(e)
  }
  const links = [
    ['facade', 'О доме'],
    ['views', 'Расположение'],
    ['plans', 'Квартиры'],
    ['contact', 'Контакты'],
  ]

  return (
    <>
      <header data-ov="header" className="fixed inset-x-0 top-0 z-30">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-10 md:py-5">
          <a href="#top" aria-label="Мичурин — в начало" onClick={go(0)}>
            <Wordmark />
          </a>
          <nav aria-label="Основная навигация" className="hidden items-center gap-9 xl:flex">
            {links.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={go(ANCHORS[id])} className="nav-link text-[15px] font-semibold" style={{ color: 'var(--fg-soft)' }}>
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="#contact" onClick={go(ANCHORS.contact)} className="pill pill-taupe h-11 px-4 text-[12px] md:h-12 md:px-6 md:text-[13px]">
              Заказать звонок
            </a>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
              onClick={() => setOpen((v) => !v)}
              className="leaf-sm grid h-11 w-12 shrink-0 place-items-center border-[1.5px] border-brand bg-sage text-brand transition-transform duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] hover:-rotate-6 md:h-12 md:w-14"
            >
              <span className="relative block h-3 w-6">
                <span className={`absolute left-0 h-[2.5px] w-6 rounded bg-brand transition-all duration-500 ${open ? 'top-1 rotate-45' : 'top-0'}`} />
                <span className={`absolute left-0 h-[2.5px] w-6 rounded bg-brand transition-all duration-500 ${open ? 'top-1 -rotate-45' : 'top-[9px]'}`} />
              </span>
            </button>
          </div>
        </div>
        <div className="mx-4 h-[1.5px] md:mx-10" style={{ background: 'var(--line)' }} />
      </header>

      <div
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Меню"
        className={`fixed inset-0 z-20 flex flex-col justify-center bg-brand px-6 pt-24 text-paper transition-[opacity,visibility] duration-500 md:px-16 ${open ? 'visible opacity-100' : 'invisible opacity-0'}`}
      >
        <nav aria-label="Меню" className="flex flex-col gap-2">
          {links.map(([id, label], i) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={go(ANCHORS[id])}
              className="display text-[40px] transition-[transform,opacity,color] duration-700 hover:text-sage md:text-[72px]"
              style={{
                transform: open ? 'none' : 'translateY(30px)',
                opacity: open ? 1 : 0,
                transitionDelay: `${open ? 80 + i * 60 : 0}ms`,
                transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)',
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="mt-12 flex flex-col gap-1 text-paper/75">
          <a href={OFFICE.phoneHref} className="font-display text-[28px] text-paper">{OFFICE.phone}</a>
          <span>{OFFICE.address} · {OFFICE.hours[0]}</span>
        </div>
      </div>
    </>
  )
}

/* ── hero ───────────────────────────────────────────────────── */

export function Hero({ onNav }) {
  return (
    <>
      <div
        aria-hidden="true"
        data-ov="hero-card"
        className="pointer-events-none fixed inset-0 z-[1] bg-[linear-gradient(90deg,rgba(27,40,32,.86)_0%,rgba(27,40,32,.55)_40%,rgba(27,40,32,0)_64%)] max-md:bg-[linear-gradient(0deg,rgba(27,40,32,.92)_0%,rgba(27,40,32,.6)_50%,rgba(27,40,32,0)_75%)]"
      />
      <section
        data-ov="hero"
        aria-labelledby="hero-title"
        className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-end px-4 pb-10 md:justify-center md:px-10 md:pb-0"
      >
        <div className="max-w-[700px]">
          <p data-r className="leaf-sm inline-block bg-sage px-5 py-1.5 text-[15px] font-bold uppercase tracking-[0.04em] text-ink md:text-[18px]">
            Дом сдан
          </p>
          <h1 id="hero-title" className="mt-4 font-display text-[60px] leading-none text-paper sm:text-[96px] lg:text-[128px]">
            <span data-r className="block">МИЧУРИН</span>
          </h1>
          <p data-r className="mt-3 text-[24px] font-semibold text-sage md:text-[34px]">
            Скидка 10% на квартиры
          </p>
          <p data-r className="mt-4 max-w-[460px] text-[15px] leading-relaxed text-paper/80 md:text-[17px]">
            Дом класса «комфорт-плюс» в районе Золотой Нивы — в пяти минутах пешком от метро,
            с закрытым двором и авторскими интерьерами холлов.
          </p>
          <div data-r className="pointer-events-auto mt-8 flex flex-wrap gap-3">
            <a href="#contact" className="pill pill-sage" onClick={navTo(onNav, ANCHORS.contact)}>
              Узнать о скидке
            </a>
            <a href="#plans" className="pill pill-ghost text-paper" onClick={navTo(onNav, ANCHORS.plans)}>
              Смотреть квартиры <Arrow />
            </a>
          </div>
        </div>
      </section>

      <aside
        data-ov="hero-card"
        aria-label="Квартиры в продаже"
        className="framed leaf card-green fixed right-12 top-[24%] z-10 hidden w-[310px] p-7 text-paper xl:block"
      >
        <p className="caps text-sage">Каталог квартир</p>
        <ul className="mt-4 divide-y divide-paper/10">
          {[
            ['1С', '28,49'],
            ['1С', '29,60'],
            ['1К', '39,10'],
          ].map(([t, a]) => (
            <li key={a} className="flex items-baseline justify-between py-3">
              <span className="leaf-sm bg-sage px-2.5 py-0.5 text-[13px] font-bold text-ink">{t}</span>
              <span className="font-display text-[26px] text-[#C9A88D]">
                {a} <span className="text-[16px]">м²</span>
              </span>
            </li>
          ))}
        </ul>
        <a href="#plans" onClick={navTo(onNav, ANCHORS.plans)} className="pill pill-sage mt-5 h-11 w-full text-[13px]">
          Узнать подробнее
        </a>
      </aside>

      {/* sage wave divider, as under the hero on the brand site */}
      <svg data-ov="hero-stats" aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-[92px] z-10 hidden h-10 w-full md:block" viewBox="0 0 1440 40" preserveAspectRatio="none">
        <path d="M0 34 C 280 4, 520 6, 760 22 S 1220 40, 1440 6" fill="none" stroke="#CBDFA2" strokeWidth="1.5" />
      </svg>
      <dl data-ov="hero-stats" className="fixed bottom-6 left-10 z-10 hidden grid-cols-4 gap-10 text-paper md:grid">
        {[
          ['5 мин', 'до метро «Золотая Нива»'],
          ['82', 'машино-места'],
          ['4', 'школы и лицея рядом'],
          ['2', 'детских сада рядом'],
        ].map(([n, l]) => (
          <div key={l}>
            <dt className="sr-only">{l}</dt>
            <dd className="font-display text-[28px] leading-none">{n}</dd>
            <dd className="mt-1.5 max-w-[150px] text-[13px] leading-snug text-paper/60">{l}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

/* round "open catalogue" badge, a fixture of the brand site */
export function CatalogButton({ onNav }) {
  return (
    <a
      href="#plans"
      onClick={navTo(onNav, ANCHORS.plans)}
      className="fixed bottom-6 right-6 z-20 hidden h-[118px] w-[118px] flex-col items-center justify-center gap-1 rounded-full border-[10px] border-[#5E6B47] bg-white text-center text-[11px] font-bold uppercase leading-tight text-[#5E6B47] shadow-[0_20px_40px_-20px_rgba(0,0,0,.5)] transition-transform duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] hover:scale-105 md:flex"
    >
      <BuildingIcon />
      Открыть
      <br />
      каталог
    </a>
  )
}

/* ── facade chapter ─────────────────────────────────────────── */

export const FloorMarker = forwardRef(function FloorMarker(_, ref) {
  return (
    <div data-ov="floor" aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-1/2 z-10 -translate-y-1/2 text-paper">
      <div className="flex items-center gap-4 pl-4 md:pl-10">
        <div>
          <p className="caps text-sage">Этаж</p>
          <p ref={ref} className="font-display text-[80px] leading-none tabular-nums md:text-[140px]">01</p>
        </div>
        <span className="h-[1.5px] flex-1 bg-sage/70" />
        <span className="leaf-sm mr-4 h-4 w-4 bg-sage md:mr-10" />
      </div>
    </div>
  )
})

const ZONES = [
  {
    floors: 'Этажи 1–2',
    title: 'Коммерческие помещения',
    text: 'Основание из тёмного кирпича с витринами в пол. Магазины и сервисы — в шаге от подъезда.',
  },
  {
    floors: 'Этажи 3–13',
    title: 'Светлый фасад и лоджии',
    text: 'Графитовые вертикали задают ритм светлой плоскости, лоджии остеклены от пола до потолка.',
  },
  {
    floors: 'Этажи 14–18',
    title: 'Графитовый верх',
    text: 'Этажи с 14 по 18 собраны в тёмный объём. Отсюда открываются виды на зелёные кварталы и весь город.',
  },
]

export function Zones() {
  return ZONES.map((z, i) => (
    <section
      key={z.title}
      data-ov={`zone-${i}`}
      id={i === 0 ? 'facade' : undefined}
      className="pointer-events-none fixed bottom-8 left-4 right-6 z-10 text-paper md:bottom-auto md:left-auto md:right-14 md:top-[22%] md:w-[400px]"
    >
      <div className="framed leaf card-green p-7" data-r>
        <p className="caps text-sage">{z.floors}</p>
        <h2 className="display mt-4 text-[26px] md:text-[32px]">{z.title}</h2>
        <p className="mt-4 text-[16px] leading-relaxed text-paper/80">{z.text}</p>
      </div>
    </section>
  ))
}

/* ── location chapter ───────────────────────────────────────── */

export function Views() {
  return (
    <section
      data-ov="views"
      id="views"
      aria-labelledby="views-title"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-8 text-paper md:inset-y-0 md:flex md:flex-col md:justify-center md:px-10 md:pb-0"
    >
      <div
        data-r
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(27,40,32,.85)_0%,rgba(27,40,32,.5)_42%,rgba(27,40,32,0)_66%)] max-md:bg-[linear-gradient(0deg,rgba(27,40,32,.95)_0%,rgba(27,40,32,.82)_55%,rgba(27,40,32,0)_88%)]"
      />
      <div className="max-w-[560px]">
        <h2 id="views-title" className="display text-[36px] md:text-[68px]">
          <span data-r className="block">Расположение</span>
        </h2>
        <p data-r className="mt-5 max-w-[480px] text-[16px] leading-relaxed text-paper/85 md:text-[17px]">
          В 5 минутах пешком — метро «Золотая Нива» и остановки общественного транспорта. Прямой выезд
          на улицу Богаткова ведёт к центру города, а через улицу Никитина и Гусинобродское шоссе — короткий
          путь к автовокзалу и загородным трассам.
        </p>
        <ul data-r className="mt-6 flex flex-wrap gap-2 text-[13px] font-semibold">
          {['Метро «Золотая Нива»', 'Гимназия № 11 «Гармония»', 'Лицей № 113', 'НГАУ', 'Поликлиника № 7', 'Детский сад № 372'].map((t) => (
            <li key={t} className="leaf-sm border-[1.5px] border-sage/60 px-3 py-1.5 text-paper/90">{t}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ── plans + tour ───────────────────────────────────────────── */

export function PlanIntro() {
  return (
    <section
      data-ov="plan"
      id="plans"
      aria-labelledby="plan-title"
      className="pointer-events-none fixed inset-x-0 top-24 z-10 px-4 text-brand md:top-auto md:bottom-14 md:px-10"
    >
      <p data-r className="leaf-sm inline-block bg-sage px-4 py-1 text-[13px] font-bold uppercase text-ink">
        {FLAT.type}-квартиры
      </p>
      <h2 id="plan-title" className="display mt-4 text-[40px] md:text-[68px]">
        <span data-r className="block">Планировки</span>
      </h2>
      <p data-r className="mt-3 max-w-[440px] text-[16px] leading-relaxed text-brand/75">
        Вынимаем {PLAN_FLOOR}-й этаж из дома и заходим в однокомнатную квартиру {FLAT.total} м² — комната за комнатой.
      </p>
    </section>
  )
}

export const Tour = forwardRef(function Tour(_, dotsRef) {
  return (
    <section
      data-ov="tour"
      aria-label="Тур по квартире"
      className="pointer-events-none fixed bottom-4 left-4 right-6 z-10 text-ink md:bottom-10 md:left-10 md:right-auto md:w-[400px]"
    >
      <div className="framed leaf card-white relative min-h-[236px] p-7">
        <div className="flex items-center justify-between">
          <span className="leaf-sm bg-sage px-2.5 py-0.5 text-[13px] font-bold">{FLAT.type}</span>
          <span className="text-[13px] text-ink/55">Общая площадь {FLAT.total} м²</span>
        </div>
        <div className="relative mt-4">
          {ROOMS.map((room, i) => (
            <article key={room.id} data-room={i} className={i === 0 ? 'relative' : 'absolute inset-0'}>
              <p data-r className="font-display text-[40px] leading-none text-taupe">
                {room.area} <span className="text-[22px]">м²</span>
              </p>
              <h3 data-r className="mt-2 text-[20px] font-bold uppercase tracking-[0.02em] text-brand">{room.title}</h3>
              <p data-r className="mt-2 text-[15px] leading-relaxed text-ink/70">{room.text}</p>
            </article>
          ))}
        </div>
      </div>
      <div ref={dotsRef} className="mt-5 flex gap-2 pl-1" aria-hidden="true">
        {ROOMS.map((r) => (
          <span key={r.id} className="h-2 w-2 rounded-full bg-brand/20 transition-[width,background-color] duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)]" />
        ))}
      </div>
    </section>
  )
})

/* ── contact ────────────────────────────────────────────────── */

const Leaves = () => (
  <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-[0.16]" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
    <g fill="#5E7A5F">
      <path d="M90 720 C 60 520, 180 380, 360 330 C 330 520, 240 660, 90 720 Z" />
      <path d="M520 120 C 640 60, 780 110, 820 240 C 690 280, 570 230, 520 120 Z" />
      <path d="M620 760 C 600 600, 690 500, 820 470 C 830 610, 760 720, 620 760 Z" />
      <path d="M-20 160 C 80 80, 220 90, 290 190 C 190 260, 60 250, -20 160 Z" />
    </g>
    <g fill="none" stroke="#7E9C74" strokeWidth="2">
      <path d="M90 720 C 180 560, 260 450, 360 330" />
      <path d="M520 120 C 620 160, 720 200, 820 240" />
      <path d="M-20 160 C 90 175, 200 185, 290 190" />
    </g>
  </svg>
)

export function Contact() {
  const [sent, setSent] = useState(false)
  return (
    <section
      data-ov="contact"
      id="contact"
      aria-labelledby="contact-title"
      className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-end px-4 pb-6 pt-24 text-paper md:justify-center md:px-10 md:pb-0 [&_[data-r]]:pointer-events-auto"
    >
      <div data-r aria-hidden="true" className="!pointer-events-none absolute inset-0 -z-10">
        <Leaves />
      </div>
      <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,560px)_minmax(0,360px)] lg:justify-between lg:pr-36">
        <div>
          <h2 id="contact-title" className="display text-[34px] md:text-[60px]">
            <span data-r className="block">Хотите узнать</span>
            <span data-r className="block">больше?</span>
          </h2>
          <p data-r className="mt-3 text-[16px] text-paper/80 md:text-[18px]">
            Оставьте свои контактные данные, и мы свяжемся с вами
          </p>
          <div data-r>
            {sent ? (
              <p role="status" className="mt-8 font-display text-[26px] text-sage">Спасибо! Мы перезвоним в течение рабочего дня.</p>
            ) : (
              <form
                className="mt-6 grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSent(true)
                }}
              >
                <label className="block">
                  <span className="sr-only">Имя</span>
                  <input required name="name" autoComplete="name" className="field" placeholder="Имя" />
                </label>
                <label className="block">
                  <span className="sr-only">Телефон</span>
                  <input required name="phone" type="tel" autoComplete="tel" inputMode="tel" pattern="[0-9+()\- ]{10,}" className="field" placeholder="+7 (000) 000-00-00" />
                </label>
                <label className="flex items-start gap-3 text-[13px] leading-snug text-paper/80 sm:col-span-2">
                  <input required type="checkbox" name="consent" className="check" />
                  <span>Я даю согласие на обработку моих персональных данных и принимаю условия политики их обработки</span>
                </label>
                <button type="submit" className="pill pill-sage mt-1 w-full sm:col-span-2 sm:w-fit sm:px-16">
                  Отправить
                </button>
              </form>
            )}
          </div>
        </div>

        <address data-r className="framed leaf card-green hidden p-8 not-italic lg:block">
          <p className="display text-[30px]">Офис продаж</p>
          <p className="mt-4 text-paper/85">{OFFICE.address}</p>
          <p className="mt-3 text-paper/70">
            {OFFICE.hours[0]}
            <br />
            {OFFICE.hours[1]}
          </p>
          <a href={OFFICE.phoneHref} className="mt-5 block font-display text-[28px] transition-colors hover:text-sage">
            {OFFICE.phone}
          </a>
          <a href={`mailto:${OFFICE.email}`} className="mt-1 block text-paper/80 hover:text-sage">{OFFICE.email}</a>
        </address>
      </div>
      <footer data-r className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t-[1.5px] border-sage/30 pt-4 text-[13px] text-paper/60 md:absolute md:inset-x-10 md:bottom-6 md:mt-0 md:pr-36">
        <a href={OFFICE.phoneHref} className="font-semibold text-paper lg:hidden">{OFFICE.phone}</a>
        <span className="lg:hidden">{OFFICE.address}</span>
        <span>© 2026 Жилой дом «Мичурин», Новосибирск</span>
        <span className="hidden md:inline">Финансирование строительства — АО «Банк ДОМ.РФ»</span>
      </footer>
    </section>
  )
}
