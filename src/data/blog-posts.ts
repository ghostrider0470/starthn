export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  author: string
  readTime: string
  category: string
  subcategory?: string
  tags: string[]
  content: string[]
  isFeatured?: boolean
  coverImage?: string
  bannerImage?: string
  authorSlug?: string
  authorAvatarUrl?: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'kako-zapoceti-biznis-u-bih',
    title: 'Kako započeti biznis u BiH: praktičan vodič + savjeti iz iskustva',
    excerpt:
      'Pokretanje biznisa u BiH često počinje s idejom, a nastavlja se pitanjima o formi, troškovima i administraciji. U ovom vodiču dijelimo praktične savjete iz iskustva.',
    publishedAt: '2025-11-22',
    author: 'Start HN Tim',
    readTime: '6 min',
    category: 'Poduzetništvo',
    tags: ['Biznis', 'BiH', 'Osnivanje firme', 'Savjeti'],
    content: [
      'Pokretanje biznisa u Bosni i Hercegovini često počinje s idejom, a nastavlja se pitanjima o formi registracije, troškovima osnivanja i administrativnim obavezama.',
      'Jedan od prvih koraka je odabir pravne forme — da li ćete registrovati d.o.o., obrt ili udruženje. Svaka forma ima svoje prednosti i specifičnosti u pogledu poreza, odgovornosti i obaveza.',
      'Za novoosnovane subjekte, Start HN pruža posebne pogodnosti od prvog dana poslovanja — od vođenja knjiga do savjetovanja o poreznim obavezama.',
      'Kontaktirajte nas za besplatnu konsultaciju i saznajte kako vam možemo pomoći da vaš biznis krene pravim putem.',
    ],
    isFeatured: true,
  },
  {
    slug: 'vaznost-projekta-za-poduzetnistvo',
    title: 'Važnost projekta za poduzetništvo',
    excerpt:
      'Finansijski poticaj sa inkubacijom je program koji Ministarstvo privrede KS provodi svake godine, a čiji je cilj da olakša pokretanje novih biznisa.',
    publishedAt: '2024-12-12',
    author: 'Start HN Tim',
    readTime: '4 min',
    category: 'Poduzetništvo',
    tags: ['Poticaji', 'Ministarstvo privrede', 'Inkubacija', 'KS'],
    content: [
      'Finansijski poticaj sa inkubacijom je program koji Ministarstvo privrede Kantona Sarajevo provodi svake godine, a čiji je cilj da olakša pokretanje i razvoj novih biznisa.',
      'Ovaj program pruža finansijsku podršku novoosnovanim firmama i poduzetnicima, pomažući im da prebrode početne izazove poslovanja.',
      'Start HN aktivno podržava svoje klijente u apliciranju na ovakve projekte, pružajući savjetovanje i pripremu potrebne dokumentacije.',
    ],
    isFeatured: false,
  },
]

export function getBlogPostBySlug(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug)
}
