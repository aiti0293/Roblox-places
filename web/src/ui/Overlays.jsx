import { forwardRef, useState } from 'react'
import { ROOMS, ANCHORS } from '../config'

const Logo = ({ className = '' }) => (
  <span className={`flex items-center gap-3 ${className}`}>
    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand font-serif text-[22px] leading-none text-paper ring-1 ring-white/15">
      M
    </span>
    <span className="font-display text-[13px] font-normal uppercase tracking-[0.22em]">Мичурин</span>
  </span>
)

const Arrow = () => (
  <svg className="arrow" width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
    <path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)

export function Header({ onNav }) {
  const link = (id, label) => (
    <a
      href={`#${id}`}
      onClick={(e) => {
        e.preventDefault()
        onNav(ANCHORS[id])
      }}
      className="nav-link caps"
      style={{ color: 'var(--fg-soft)' }}
    >
      {label}
    </a>
  )
  return (
    <header data-ov="header" className="fixed inset-x-0 top-0 z-30">
      <div className="flex items-center justify-between px-4 py-4 md:px-10 md:py-6">
        <a
          href="#top"
          aria-label="Мичурин — в начало"
          onClick={(e) => {
            e.preventDefault()
            onNav(0)
          }}
        >
          <Logo />
        </a>
        <nav aria-label="Основная навигация" className="hidden items-center gap-9 lg:flex">
          {link('facade', 'Дом')}
          {link('views', 'Виды')}
          {link('plans', 'Планировки')}
          {link('contact', 'Контакты')}
        </nav>
        <a
          href="#contact"
          onClick={(e) => {
            e.preventDefault()
            onNav(ANCHORS.contact)
          }}
          className="pill pill-ghost h-10 px-4 text-[11px]"
          style={{ color: 'var(--fg)' }}
        >
          <span className="hidden sm:inline">Записаться на&nbsp;просмотр</span>
          <span className="sm:hidden">Просмотр</span>
        </a>
      </div>
      <div className="mx-4 h-px md:mx-10" style={{ background: 'var(--line)' }} />
    </header>
  )
}

export function Hero({ onNav }) {
  return (
    <>
      {/* readability scrim over the bright daytime sky */}
      <div
        aria-hidden="true"
        data-ov="hero-card"
        className="pointer-events-none fixed inset-0 z-[1] bg-[linear-gradient(90deg,rgba(18,36,30,.78)_0%,rgba(18,36,30,.42)_38%,rgba(18,36,30,0)_62%)] max-md:bg-[linear-gradient(0deg,rgba(18,36,30,.86)_0%,rgba(18,36,30,.5)_45%,rgba(18,36,30,0)_70%)]"
      />
      <section
        data-ov="hero"
        aria-labelledby="hero-title"
        className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-end px-4 pb-28 md:justify-center md:px-10 md:pb-0"
      >
        <div className="max-w-[640px]">
          <p data-r className="caps mb-6 flex items-center gap-3 text-paper/75">
            <span className="h-1.5 w-1.5 rounded-full bg-terracotta" /> Новосибирск · Жилой дом
          </p>
          <h1 id="hero-title" className="display text-[44px] text-paper sm:text-[64px] lg:text-[88px]">
            <span data-r className="block">Дом</span>
            <span data-r className="block">выше</span>
            <span data-r className="block">деревьев</span>
          </h1>
          <p data-r className="mt-7 max-w-[440px] text-[15px] leading-relaxed text-paper/80 md:text-base">
            Двадцать пять этажей над тихим зелёным кварталом. Панорамное остекление, видовые лоджии
            и спортивная площадка прямо во дворе.
          </p>
          <div data-r className="pointer-events-auto mt-9 flex flex-wrap gap-3">
            <a
              href="#plans"
              className="pill pill-light"
              onClick={(e) => {
                e.preventDefault()
                onNav(ANCHORS.plans)
              }}
            >
              Выбрать квартиру <Arrow />
            </a>
            <a
              href="#contact"
              className="pill pill-ghost text-paper"
              onClick={(e) => {
                e.preventDefault()
                onNav(ANCHORS.contact)
              }}
            >
              Записаться на просмотр
            </a>
          </div>
        </div>
      </section>

      <aside
        data-ov="hero-card"
        aria-label="Видовые этажи"
        className="glass-dark fixed bottom-28 right-10 z-10 hidden w-[300px] rounded-[18px] p-6 text-paper xl:block"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="caps text-paper/55">Видовые этажи</p>
            <p className="display mt-3 text-[56px]">19–25</p>
          </div>
          <span className="mt-1 grid h-8 w-8 place-items-center rounded-full border border-paper/25 text-[13px]">↗</span>
        </div>
        <p className="mt-2 text-sm text-paper/70">Графитовая «корона» дома — этажи с видом на весь город.</p>
        <dl className="mt-5 divide-y divide-paper/10 text-[13px]">
          {[
            ['Фасад', 'Три тона'],
            ['Остекление', 'В пол'],
            ['Лоджии', 'Панорамные'],
            ['Двор', 'Спортплощадка'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2.5">
              <dt className="text-paper/55">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <dl
        data-ov="hero-stats"
        className="fixed bottom-6 left-4 right-4 z-10 hidden grid-cols-4 gap-8 text-paper md:left-10 md:grid md:max-w-[620px]"
      >
        {[
          ['25', 'этажей'],
          ['3', 'тона фасада'],
          ['360°', 'панорама'],
          ['1', 'спортплощадка'],
        ].map(([n, l]) => (
          <div key={l} className="border-t border-paper/25 pt-3">
            <dt className="sr-only">{l}</dt>
            <dd className="font-display text-[26px] font-light">{n}</dd>
            <dd className="caps mt-1 text-paper/55">{l}</dd>
          </div>
        ))}
      </dl>

      <div data-ov="hint" aria-hidden="true" className="fixed bottom-7 right-4 z-10 flex items-center gap-3 text-paper/70 md:right-10">
        <span className="caps">Листайте</span>
        <span className="relative h-10 w-px overflow-hidden bg-paper/25">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[hint_2.2s_cubic-bezier(.65,0,.35,1)_infinite] bg-paper" />
        </span>
      </div>
    </>
  )
}

export const FloorMarker = forwardRef(function FloorMarker(_, ref) {
  return (
    <div data-ov="floor" aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-1/2 z-10 -translate-y-1/2 text-paper">
      <div className="flex items-center gap-4 pl-4 md:pl-10">
        <div>
          <p className="caps text-paper/60">Этаж</p>
          <p ref={ref} className="display text-[72px] tabular-nums md:text-[120px]">01</p>
        </div>
        <span className="h-px flex-1 bg-paper/50" />
        <span className="mr-4 h-2 w-2 rounded-full border border-paper md:mr-10" />
      </div>
    </div>
  )
})

const ZONES = [
  {
    floors: 'Этажи 01–02',
    title: 'Основание из тёмного кирпича',
    text: 'Тяжёлый, тёплый цоколь с витражами в пол — для кафе, сервисов и входных групп.',
  },
  {
    floors: 'Этажи 03–19',
    title: 'Светлый фасад и ритм лоджий',
    text: 'Графитовые вертикали делят светлую плоскость на ритм, лоджии остеклены от пола до потолка.',
  },
  {
    floors: 'Этажи 20–25',
    title: 'Графитовая корона',
    text: 'Верх дома собран в тёмный объём: с последних этажей город виден до самого горизонта.',
  },
]

export function Zones() {
  return ZONES.map((z, i) => (
    <section
      key={z.title}
      data-ov={`zone-${i}`}
      id={i === 0 ? 'facade' : undefined}
      className="pointer-events-none fixed bottom-24 right-4 z-10 max-w-[380px] text-paper md:bottom-auto md:right-10 md:top-[22%]"
    >
      <div className="glass-dark rounded-[18px] p-6" data-r>
        <p className="caps text-paper/60">{z.floors}</p>
        <h2 className="display mt-4 text-[26px] md:text-[32px]">{z.title}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-paper/75">{z.text}</p>
      </div>
    </section>
  ))
}

export function Views() {
  return (
    <section
      data-ov="views"
      id="views"
      aria-labelledby="views-title"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-10 text-paper md:inset-y-0 md:flex md:flex-col md:justify-center md:px-10 md:pb-0"
    >
      <div
        data-r
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(18,36,30,.72)_0%,rgba(18,36,30,.35)_40%,rgba(18,36,30,0)_65%)] max-md:bg-[linear-gradient(0deg,rgba(18,36,30,.8)_0%,rgba(18,36,30,0)_60%)]"
      />
      <div className="max-w-[560px]">
        <p data-r className="caps text-paper/70">Виды на 360°</p>
        <h2 id="views-title" className="display mt-5 text-[36px] md:text-[64px]">
          <span data-r className="block">Видно</span>
          <span data-r className="block">со всех</span>
          <span data-r className="block">сторон</span>
        </h2>
        <p data-r className="mt-6 max-w-[420px] text-[15px] leading-relaxed text-paper/80">
          Дом стоит свободно, без соседей вплотную. Каждая сторона открывается на свой пейзаж:
          кроны старого квартала, стадион во дворе, город до самого горизонта.
        </p>
      </div>
    </section>
  )
}

export function PlanIntro() {
  return (
    <section
      data-ov="plan"
      id="plans"
      aria-labelledby="plan-title"
      className="pointer-events-none fixed inset-x-0 top-24 z-10 px-4 text-ink md:top-auto md:bottom-14 md:px-10"
    >
      <p data-r className="caps text-ink/55">Этаж 18 · Типовой этаж</p>
      <h2 id="plan-title" className="display mt-4 text-[36px] md:text-[64px]">
        <span data-r className="block">Планировки</span>
      </h2>
      <p data-r className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-ink/70">
        Вынимаем один этаж из дома и заходим в квартиру — комната за комнатой.
      </p>
    </section>
  )
}

export const Tour = forwardRef(function Tour(_, dotsRef) {
  return (
    <section
      data-ov="tour"
      aria-label="Тур по квартире"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-10 text-ink md:inset-x-auto md:bottom-10 md:left-10 md:w-[380px]"
    >
      <div className="glass-light relative min-h-[214px] overflow-hidden rounded-[18px] p-6">
        <p className="caps flex items-center justify-between text-ink/50">
          <span>Квартира 18.4 · 71 м²</span>
          <span className="rounded-full border border-ink/15 px-2 py-0.5 text-[9px]">Пример планировки</span>
        </p>
        <div className="relative mt-4">
          {ROOMS.map((room, i) => (
            <article key={room.id} data-room={i} className={i === 0 ? 'relative' : 'absolute inset-0'}>
              <p data-r className="caps text-terracotta">{room.kicker}</p>
              <h3 data-r className="mt-2 font-display text-[22px] font-light leading-tight">{room.title}</h3>
              <p data-r className="mt-3 text-[14px] leading-relaxed text-ink/70">{room.text}</p>
            </article>
          ))}
        </div>
      </div>
      <div ref={dotsRef} className="mt-4 flex gap-2 pl-1" aria-hidden="true">
        {ROOMS.map((r) => (
          <span key={r.id} className="h-1.5 w-1.5 rounded-full bg-ink/20 transition-[width,background-color] duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)]" />
        ))}
      </div>
    </section>
  )
})

export function Contact() {
  const [sent, setSent] = useState(false)
  return (
    <section
      data-ov="contact"
      id="contact"
      aria-labelledby="contact-title"
      className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-end px-4 pb-8 text-paper md:justify-center md:px-10 md:pb-0 [&_[data-r]]:pointer-events-auto"
    >
      <div className="max-w-[520px]">
        <p data-r className="caps text-paper/60">Отдел продаж</p>
        <h2 id="contact-title" className="display mt-5 text-[36px] md:text-[64px]">
          <span data-r className="block">Приходите</span>
          <span data-r className="block">в гости</span>
        </h2>
        <p data-r className="mt-5 max-w-[420px] text-[15px] leading-relaxed text-paper/75">
          Покажем дом, двор и квартиры на верхних этажах. Оставьте телефон — менеджер перезвонит
          и подберёт удобное время.
        </p>
        <div data-r>
          {sent ? (
            <p role="status" className="mt-10 font-display text-xl font-light">Спасибо! Мы перезвоним в течение дня.</p>
          ) : (
            <form
              className="mt-8 grid gap-5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                setSent(true)
              }}
            >
              <label className="block">
                <span className="caps text-paper/55">Имя</span>
                <input required name="name" autoComplete="name" className="field" placeholder="Как к вам обращаться" />
              </label>
              <label className="block">
                <span className="caps text-paper/55">Телефон</span>
                <input required name="phone" type="tel" autoComplete="tel" inputMode="tel" pattern="[0-9+()\- ]{10,}" className="field" placeholder="+7 ___ ___-__-__" />
              </label>
              <button type="submit" className="pill pill-light mt-2 w-fit sm:col-span-2">
                Записаться на просмотр <Arrow />
              </button>
              <p className="text-[12px] text-paper/45 sm:col-span-2">
                Нажимая кнопку, вы соглашаетесь на обработку персональных данных.
              </p>
            </form>
          )}
        </div>
      </div>
      <footer data-r className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-paper/15 pt-5 text-[12px] text-paper/50 md:absolute md:inset-x-10 md:bottom-6 md:mt-0">
        <Logo className="text-paper" />
        <span>© 2026 Жилой дом «Мичурин», Новосибирск</span>
      </footer>
    </section>
  )
}
