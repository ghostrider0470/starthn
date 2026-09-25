import { describe, expect, it } from 'vitest'
import { isHackSpam } from './spam-guard'
import { LEGACY_REDIRECTS } from './legacy-redirects'
import { STATIC_PATHS } from './sitemap'
import { ALL_LANGUAGE_CODES } from '@/lib/languages'
import { PRIVATE_ROUTE_PREFIXES, SEO_PRIORITY_LOCALES } from '@/lib/seo'

const BLOG_SLUGS = [
  'how-to-start-a-business-in-bih-a-practical-guide-tips-from-experience-with-the-n1-tv-appearance',
  'importance-of-entrepreneurship-programs',
]

const GAMBLING_SLUGS = [
  '/1xbet-live-casino-play-using-real-live-retailers-in-finland',
  '/w-jaki-sposob-bonus-za-rejestracje-w-mostbet-wplywa-na-zaklady',
  '/zastosowanie-optymalnej-strategii-poczatkowej-w-grach-kasynowych-vox',
  '/wie-verwalten-sie-ihren-bankroll-beim-sportwetten-ohne-oasis',
  '/offizielles-plinko-in-deutschland-spielen-97-56-rtp',
  '/kazino-pinko-legendy-i-mify-po-otzyvam',
  '/jak-zarabiac-na-bonusach-w-mostbet-analiza-ryzyka-i-zysku',
  '/die-zukunft-der-wettanbieter-ohne-oasis-im-wettmarkt',
  '/istoriia-pinko-kazino-ofitsialnyi-sait-i-ego-razvitie',
  '/rost-sportivnykh-stavok-na-1vin-tendentsii-i-perspektivy',
  '/wie-man-sichere-nicht-lizenzierte-wettanbieter-in-deutschland-erkennt-die-glucksspielaufsicht-verstehen',
  '/obzor-prilozheniia-1win-skachat-i-ego-osobennosti',
  '/in-depth-look-at-roulette-variants-in-best-online-casinos-in-canada',
  '/pinko-kazino-ofitsialnyi-sait-kak-otkliuchit-reklamu-i-uvedomleniia',
]

function expectSpam(paths: Array<string>) {
  for (const path of paths) expect(isHackSpam(path), path).toBe(true)
}

function expectNotSpam(paths: Array<string>) {
  for (const path of paths) expect(isHackSpam(path), path).toBe(false)
}

describe('isHackSpam', () => {
  it('matches injected /items/ paths (bare and locale-prefixed)', () => {
    expect(isHackSpam('/items/Y156399317')).toBe(true)
    expect(isHackSpam('/items/Y156399317/')).toBe(true)
    expect(isHackSpam('/en-US/items/foo')).toBe(true)
    expect(isHackSpam('/bs/items/anything/deep')).toBe(true)
  })

  it('matches bare injected letter+digit IDs across locale forms', () => {
    expect(isHackSpam('/en-US/B471837416')).toBe(true)
    expect(isHackSpam('/bs/Y156399317')).toBe(true)
    expect(isHackSpam('/zh-Hans/X1234567')).toBe(true)
    expect(isHackSpam('/sr-Latn/Z9999999')).toBe(true)
    expect(isHackSpam('/B471837416')).toBe(true)
    expect(isHackSpam('/en-US/B471837416/')).toBe(true)
  })

  it('matches WordPress-era taxonomy junk', () => {
    expectSpam([
      '/cate-101',
      '/cate-136-177',
      '/cate-349-599/',
      '/en-US/cate-10-40',
      '/cate--33',
      '/cate--2',
      '/cate-50-55-60',
      '/case-studie-categorie/coportate',
      '/case-studie-categorie',
    ])
  })

  it('matches the hacked /pw entry point exactly', () => {
    expectSpam(['/pw', '/pw/', '/PW'])
    expectNotSpam(['/pwa', '/bs-BA/blog/pw-guide'])
  })

  it('matches old theme and shop roots, bare and locale-prefixed', () => {
    expectSpam([
      '/shop/pg/1recruit',
      '/shop',
      '/contents/event/kansyasai/',
      '/toyu/x',
      '/reserve/',
      '/information/abc',
      '/pxl-template/widget-contact/',
      '/pxl-template/x',
      '/en-US/pxl-template/footer',
      '/portfolio/project-1/',
      '/industries/finance',
      '/case-studies/x',
      '/service-category/accounting/',
      '/tag/porez/',
      '/author/admin',
      '/wp-admin/',
      '/wp-includes/js/jquery.js',
      '/wp-content/uploads/2020/01/x.jpg',
      '/wp-json/wp/v2/posts',
      '/sr-Latn/shop/x',
    ])
  })

  it('matches distinctive shop leaves, bare and locale-prefixed', () => {
    expectSpam([
      '/top/CKmSpSfTop',
      '/ko-KR/top/CKmSpSfTop',
      '/e/e1234567',
      '/storeSearch/',
      '/userreview/123',
      '/event/kansyasai',
      '/renga',
      '/renga/1',
      '/pg/1recruit',
      '/order',
      '/sr-Latn/order',
      '/customer/menu',
      '/cart/cart',
      '/category/categorylist',
      '/privacy_policy.html',
      '/ja-JP/privacy_policy.html',
    ])
  })

  it('matches WordPress feeds, pagination, date archives, scripts and sitemaps', () => {
    expectSpam([
      '/feed',
      '/feed/',
      '/comments/feed/',
      '/en-US/feed',
      '/page/2',
      '/blog/page/3/',
      '/category/marketing/page/2',
      '/2019/05/hello-world/',
      '/2019/05',
      '/wp-login.php',
      '/xmlrpc.php',
      '/wp-cron.php',
      '/wp-content/mu-plugins/wpse-loader.php',
      '/sitemap_index.xml',
      '/wp-sitemap.xml',
      '/wp-sitemap-posts-post-1.xml',
      '/post-sitemap.xml',
      '/page-sitemap2.xml',
    ])
  })

  it('matches old /service/<slug> pages except the three that 301', () => {
    expectSpam(['/service/foo', '/service/foo/', '/service/web-design/feed'])
  })

  it('matches the injected gambling posts, with and without a slash', () => {
    for (const slug of GAMBLING_SLUGS) {
      expectSpam([slug, `${slug}/`, slug.toUpperCase(), `${slug}/feed/`])
    }
  })

  it('does NOT match legitimate routes', () => {
    expectNotSpam([
      '/',
      '/en-US',
      '/en-US/services',
      '/en-US/services/tax-consulting',
      '/en-US/blog/how-to-start-a-business-in-bih',
      '/en-US/team/jan-horvat',
      '/bs/about',
      '/bs-BA/blog/cate-planning',
      '/bs-BA/services/business-consulting',
      '/bs-BA/blog/page-speed-tips',
      '/bs-BA/blog/tag-your-receipts',
    ])
  })

  it('does NOT match the WordPress URLs that 301 to a real page', () => {
    expectNotSpam([
      '/index.php',
      '/INDEX.PHP',
      '/bs-BA/index.php',
      '/en/index.php',
      '/zh-Hans/index.php',
      '/service',
      '/service/',
    ])
    for (const slug of [
      'racunovodstvene-knjigovodstvene',
      'porezno-planiranje-savejtovanje',
      'revizijske-slicne-usluge',
    ]) {
      expectNotSpam([
        `/service/${slug}`,
        `/service/${slug}/`,
        `/service/${slug}/feed`,
        `/bs-BA/${slug}`,
      ])
    }
    for (const key of Object.keys(LEGACY_REDIRECTS)) {
      expectNotSpam([key, `${key}/`, `/en-US${key}/`])
      expectNotSpam([`/bs-BA${key}`])
    }
    // Only index.php is exempt from the *.php rule.
    expectSpam(['/bs-BA/wp-login.php', '/en/xmlrpc.php', '/bs-BA/blog/index.php'])
  })

  it('does NOT match sitemaps, public files, API, images or OAuth', () => {
    expectNotSpam([
      '/sitemap.xml',
      '/sitemap-bs-BA.xml',
      '/sitemap-en-US.xml',
      '/sitemap-hr-HR.xml',
      '/sitemap-de-DE.xml',
      '/robots.txt',
      '/llms.txt',
      '/favicon.ico',
      '/favicon-32.png',
      '/manifest.json',
      '/ccf536f39896412a92fb14422b4d89d3.txt',
      '/api/blog',
      '/api/blog/tags',
      '/api/case-studies',
      '/api/case-studies/x',
      '/api/authors/selma',
      '/api/user/page/translate',
      '/api/manage/blog/missing-translations',
      '/img/blog-images/x',
      '/img/blog-images/2024/05/page/2.webp',
      '/assets/main-xK8ZlQzF.js',
      '/locales/bs-BA/common.json',
      '/_serverFn/abc',
      '/auth/callback',
      '/bs-BA/auth/callback',
    ])
  })

  it('does NOT match any private route', () => {
    for (const prefix of PRIVATE_ROUTE_PREFIXES) {
      expectNotSpam([prefix, `/bs-BA${prefix}`, `/bs-BA${prefix}/sub`])
    }
  })

  it('does NOT match any public page or post, in any locale or prefix-less', () => {
    const pages = [...STATIC_PATHS, ...BLOG_SLUGS.map((slug) => `/blog/${slug}`)]
    for (const locale of [...SEO_PRIORITY_LOCALES, ...ALL_LANGUAGE_CODES]) {
      expectNotSpam(pages.map((page) => `/${locale}${page}`))
    }
    expectNotSpam(pages.filter(Boolean))
  })
})
