import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render } from '@testing-library/react'
import { createInstance } from 'i18next'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FadeIn,
  Reveal,
  SlideUp,
  StaggerContainer,
  StaggerItem,
} from './FadeIn'
import type { ComponentType, ReactNode } from 'react'
import { ClientLogosSection } from '@/components/landing/ClientLogosSection'
import { ContactCtaSection } from '@/components/landing/ContactCtaSection'
import { FAQSection } from '@/components/landing/FAQSection'
import { FeatureHighlightsSection } from '@/components/landing/FeatureHighlightsSection'
import { HeroSection } from '@/components/landing/HeroSection'
import { PromoCardsSection } from '@/components/landing/PromoCardsSection'
import { ServicesHexGrid } from '@/components/landing/ServicesHexGrid'
import { StatsSection } from '@/components/landing/StatsSection'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { ValuePropsSection } from '@/components/landing/ValuePropsSection'
import { ValuesSection } from '@/components/landing/ValuesSection'
import { WhyStartHNSection } from '@/components/landing/WhyStartHNSection'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/bs-BA' }),
}))

/** Matches any inline hidden state a reveal could leave in server HTML. */
const HIDDEN_STYLE = /opacity:\s*0(?![.\d])|translate(?:3d|X|Y)?\(/

describe('reveal components SSR', () => {
  it('renders FadeIn content fully visible (no inline opacity:0)', () => {
    const html = renderToString(
      <FadeIn>
        <p>x</p>
      </FadeIn>,
    )

    expect(html).toBe('<div><p>x</p></div>')
    expect(html).not.toContain('opacity:0')
  })

  it('renders every reveal wrapper without a hidden inline style', () => {
    const html = renderToString(
      <>
        <SlideUp as="section" offset={24} delay={0.2} className="a">
          <p>slide</p>
        </SlideUp>
        <Reveal x={-24} as="article" id="r">
          <p>reveal</p>
        </Reveal>
        <FadeIn as="h2" id="heading" className="b">
          title
        </FadeIn>
        <StaggerContainer as="ul" className="grid">
          <StaggerItem as="li">one</StaggerItem>
          <StaggerItem as="li">two</StaggerItem>
        </StaggerContainer>
      </>,
    )

    expect(html).not.toMatch(HIDDEN_STYLE)
    expect(html).not.toContain('style=')
    expect(html).toContain('<section class="a"><p>slide</p></section>')
    expect(html).toContain('<article id="r"><p>reveal</p></article>')
    expect(html).toContain('<h2 id="heading" class="b">title</h2>')
    expect(html).toContain('<ul class="grid"><li>one</li><li>two</li></ul>')
  })
})

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), `public/locales/${locale}/${ns}.json`),
      'utf8',
    ),
  ) as Record<string, unknown>
}

describe('landing sections SSR', () => {
  const sections: Record<string, ComponentType> = {
    ClientLogosSection,
    ContactCtaSection,
    FAQSection,
    FeatureHighlightsSection,
    HeroSection,
    PromoCardsSection,
    ServicesHexGrid,
    StatsSection,
    TestimonialsSection,
    ValuePropsSection,
    ValuesSection,
    WhyStartHNSection,
  }

  const i18n = createInstance()
  void i18n.init({
    lng: 'bs-BA',
    fallbackLng: false,
    ns: ['landing', 'common'],
    defaultNS: 'common',
    resources: {
      'bs-BA': {
        landing: readBundle('bs-BA', 'landing'),
        common: readBundle('bs-BA', 'common'),
      },
    },
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

  it.each(Object.entries(sections))(
    '%s server-renders no element with inline opacity:0',
    (_, Section) => {
      const html = renderToString(
        <I18nextProvider i18n={i18n}>
          <Section />
        </I18nextProvider>,
      )

      expect(html.length).toBeGreaterThan(0)
      expect(html).not.toMatch(/opacity:\s*0(?![.\d])/)
    },
  )

  it('no landing section imports a motion library', () => {
    const dir = resolve(process.cwd(), 'src/components/landing')
    const offenders = readdirSync(dir)
      .filter((file) => /\.tsx?$/.test(file) && !file.includes('.test.'))
      .filter((file) =>
        /from ['"](?:framer-motion|motion(?:\/[\w-]+)?)['"]/.test(
          readFileSync(resolve(dir, file), 'utf8'),
        ),
      )

    expect(offenders).toEqual([])
  })
})

type FakeAnimation = {
  el: Element
  keyframes: Array<Keyframe>
  options: KeyframeAnimationOptions
  pause: ReturnType<typeof vi.fn>
  play: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
}

describe('reveal components after hydration', () => {
  let animations: Array<FakeAnimation>
  let observers: Array<{
    callback: IntersectionObserverCallback
    options?: IntersectionObserverInit
    targets: Array<Element>
    disconnect: ReturnType<typeof vi.fn>
  }>
  let top: number
  let reducedMotion: boolean

  beforeEach(() => {
    animations = []
    observers = []
    top = 2000
    reducedMotion = false

    vi.stubGlobal(
      'IntersectionObserver',
      class {
        disconnect = vi.fn()
        targets: Array<Element> = []
        constructor(
          public callback: IntersectionObserverCallback,
          public options?: IntersectionObserverInit,
        ) {
          observers.push(this)
        }
        observe(el: Element) {
          this.targets.push(el)
        }
        unobserve() {}
      },
    )
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: reducedMotion && query.includes('reduce'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    )
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ top }) as DOMRect,
    )
    Element.prototype.animate = function (
      this: Element,
      keyframes: Array<Keyframe>,
      options: KeyframeAnimationOptions,
    ) {
      const animation: FakeAnimation = {
        el: this,
        keyframes,
        options,
        pause: vi.fn(),
        play: vi.fn(),
        cancel: vi.fn(),
      }
      animations.push(animation)
      return animation as unknown as Animation
    } as unknown as Element['animate']
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete (Element.prototype as Partial<Element>).animate
  })

  function enterViewport(index = 0) {
    const observer = observers[index]
    act(() => {
      observer.callback(
        observer.targets.map(
          (target) =>
            ({ isIntersecting: true, target }) as IntersectionObserverEntry,
        ),
        observer as unknown as IntersectionObserver,
      )
    })
  }

  it('holds a below-the-fold element hidden, then plays the reveal in view', () => {
    const { container, unmount } = render(
      <SlideUp offset={24} duration={0.6} delay={0.1}>
        <p>x</p>
      </SlideUp>,
    )
    const el = container.firstElementChild!

    expect(animations).toHaveLength(1)
    const [animation] = animations
    expect(animation.el).toBe(el)
    expect(animation.keyframes[0]).toMatchObject({
      opacity: 0,
      transform: 'translate3d(0px, 24px, 0)',
    })
    expect(animation.keyframes[1]).toMatchObject({
      opacity: 1,
      transform: 'none',
    })
    expect(animation.options).toMatchObject({
      duration: 600,
      delay: 100,
      fill: 'backwards',
    })
    expect(animation.pause).toHaveBeenCalledTimes(1)
    expect(animation.play).not.toHaveBeenCalled()
    // No inline style: the hidden state lives only in the paused animation.
    expect(el.getAttribute('style')).toBeNull()

    enterViewport()
    expect(animation.play).toHaveBeenCalledTimes(1)
    expect(observers[0].disconnect).toHaveBeenCalled()

    unmount()
    expect(animation.cancel).toHaveBeenCalled()
  })

  it('does not animate an element that is already on screen', () => {
    top = 100
    render(<FadeIn>x</FadeIn>)

    expect(animations).toHaveLength(0)
    expect(observers).toHaveLength(0)
  })

  it('does not animate under prefers-reduced-motion', () => {
    reducedMotion = true
    render(<FadeIn>x</FadeIn>)

    expect(animations).toHaveLength(0)
    expect(observers).toHaveLength(0)
  })

  it('does nothing without Element.animate', () => {
    delete (Element.prototype as Partial<Element>).animate
    render(<FadeIn>x</FadeIn>)

    expect(observers).toHaveLength(0)
  })

  it('staggers items in document order and leaves the container static', () => {
    const { container } = render(
      <StaggerContainer delayChildren={0.2} staggerChildren={0.1}>
        <StaggerItem offset={16} duration={0.5}>
          a
        </StaggerItem>
        <StaggerItem offset={16} duration={0.5}>
          b
        </StaggerItem>
        <StaggerItem offset={16} duration={0.5}>
          c
        </StaggerItem>
      </StaggerContainer>,
    )
    const containerEl = container.firstElementChild!
    const items = Array.from(containerEl.children)

    expect(observers).toHaveLength(1)
    expect(observers[0].targets).toEqual([containerEl])
    expect(animations.map((a) => a.el)).toEqual(items)
    expect(animations.map((a) => a.options.delay)).toEqual([200, 300, 400])
    expect(animations.every((a) => a.options.duration === 500)).toBe(true)

    enterViewport()
    expect(animations.every((a) => a.play.mock.calls.length === 1)).toBe(true)
  })

  it('hydrates the server HTML without a mismatch before arming the reveal', () => {
    const tree = (
      <Reveal as="section" x={-24} className="c">
        <p>x</p>
      </Reveal>
    )
    const host = document.createElement('div')
    host.innerHTML = renderToString(tree)
    document.body.appendChild(host)
    const onRecoverableError = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    let root: ReturnType<typeof hydrateRoot> | undefined
    act(() => {
      root = hydrateRoot(host, tree, { onRecoverableError })
    })

    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    expect(animations).toHaveLength(1)
    expect(animations[0].keyframes[0]).toMatchObject({
      transform: 'translate3d(-24px, 0px, 0)',
    })

    act(() => root?.unmount())
    host.remove()
  })
})
