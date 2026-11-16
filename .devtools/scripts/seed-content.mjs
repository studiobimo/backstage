export const SEED = {
  slugPrefix: 'seed-',
  titlePrefix: 'Seed: ',
  locales: ['en', 'es'],
  defaultLocale: 'en',
  collection: 'posts',
  latestCount: 6,
  homeCount: 3,
  status: { published: 'published', draft: 'draft', changed: 'changed' }
}

const words = (en, es) => ({ en, es })

const paragraph = (text) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
})

const copy = (en, es) => ({ en: paragraph(en), es: paragraph(es) })

const link = (en, es, href, hrefEs = href) => ({
  en: { href, label: en },
  es: { href: hrefEs, label: es }
})

const slug = (name) => `${SEED.slugPrefix}${name}`

const post = (name, title, summary, status = SEED.status.published) => ({
  slugs: { en: slug(name), es: slug(`${name}-es`) },
  content: { title, summary },
  status
})

export const POSTS = [
  post(
    'launching-the-new-site',
    words('Launching the new site', 'Lanzamos el nuevo sitio'),
    words(
      'What changed, what stayed, and how we built it.',
      'Qué cambió, qué se quedó y cómo lo construimos.'
    )
  ),
  post(
    'how-we-work',
    words('How we work', 'Cómo trabajamos'),
    words('A look at our process from first call to launch.', 'Un vistazo a nuestro proceso.')
  ),
  post(
    'notes-from-the-studio',
    words('Notes from the studio', 'Notas desde el estudio'),
    words('Small lessons from a busy season.', 'Pequeñas lecciones de una temporada ocupada.')
  ),
  post(
    'behind-the-scenes',
    words('Behind the scenes', 'Detrás de cámaras'),
    words('Sketches, drafts and the occasional mistake.', 'Bocetos, borradores y algún error.')
  ),
  post(
    'only-in-english',
    { en: 'Only in English' },
    { en: 'This post has no Spanish translation yet.' }
  ),
  post(
    'work-in-progress',
    words('A post still in draft', 'Una entrada en borrador'),
    words('Not published yet.', 'Aún sin publicar.'),
    SEED.status.draft
  )
]

export const EDITED_POST = {
  slug: POSTS[1].slugs.en,
  summary: words('A look at our process, updated after publishing.', 'Nuestro proceso, editado.')
}

const section = (heading, body) => ({
  heading,
  body,
  background: 'muted',
  spacing: 'md'
})

const postList = (heading, posts) => ({ heading, posts })

const latest = (count) => ({ mode: 'latest', count })

const chosen = (ids) => ({ mode: 'chosen', ids })

const textBlock = (heading, body) => ({ heading, body, width: 'narrow' })

const column = (heading, body) => ({ heading, body })

export const PAGES = [
  {
    isHome: true,
    titles: words(`${SEED.titlePrefix}Home`, `${SEED.titlePrefix}Inicio`),
    status: SEED.status.published,
    blocks: () => [
      [
        'one-column-section',
        section(
          words('Welcome to the seed site', 'Bienvenida al sitio de ejemplo'),
          copy(
            'Sample content that lets you try lists, references and previews.',
            'Contenido de ejemplo para probar listas, referencias y vistas previas.'
          )
        )
      ],
      ['post-list', postList(words('Latest posts', 'Últimas entradas'), latest(SEED.homeCount))]
    ]
  },
  {
    slugs: words(slug('blog'), slug('blog')),
    titles: words(`${SEED.titlePrefix}Blog`, `${SEED.titlePrefix}Blog`),
    status: SEED.status.published,
    blocks: () => [
      ['post-list', postList(words('All the latest', 'Lo más reciente'), latest(SEED.latestCount))]
    ]
  },
  {
    slugs: words(slug('featured'), slug('destacados')),
    titles: words(`${SEED.titlePrefix}Featured`, `${SEED.titlePrefix}Destacados`),
    status: SEED.status.published,
    blocks: ({ entryId }) => [
      [
        'post-list',
        postList(
          words('Our picks', 'Nuestra selección'),
          chosen([entryId(POSTS[3]), entryId(POSTS[0]), entryId(POSTS[2]), entryId(POSTS[4])])
        )
      ]
    ]
  },
  {
    slugs: words(slug('about'), slug('acerca-de')),
    titles: words(`${SEED.titlePrefix}About`, `${SEED.titlePrefix}Acerca de`),
    status: SEED.status.published,
    blocks: () => [
      [
        'one-column-section',
        section(
          words('About the studio', 'Sobre el estudio'),
          copy('We make sites for people who make things.', 'Hacemos sitios para quienes crean.')
        )
      ],
      [
        'two-column-text',
        {
          left: column(
            words('What we do', 'Qué hacemos'),
            copy('Identity, websites and the odd poster.', 'Identidad, sitios web y algún cartel.')
          ),
          right: column(
            words('How we do it', 'Cómo lo hacemos'),
            copy('Small team, short feedback loops.', 'Equipo pequeño, ciclos cortos.')
          )
        }
      ],
      [
        'one-column-text',
        textBlock(
          words('A longer note', 'Una nota más larga'),
          copy(
            'Longer copy reads best in a narrow column, one idea at a time.',
            'Un texto largo se lee mejor en una columna estrecha, una idea a la vez.'
          )
        )
      ]
    ]
  },
  {
    slugs: words(slug('draft-page'), slug('pagina-borrador')),
    titles: words(`${SEED.titlePrefix}Draft page`, `${SEED.titlePrefix}Página en borrador`),
    status: SEED.status.draft,
    blocks: () => [
      [
        'one-column-text',
        textBlock(
          words('Not published', 'Sin publicar'),
          copy('A draft page.', 'Una página en borrador.')
        )
      ]
    ]
  },
  {
    slugs: words(slug('pending-changes'), slug('cambios-pendientes')),
    titles: words(`${SEED.titlePrefix}Pending changes`, `${SEED.titlePrefix}Cambios pendientes`),
    status: SEED.status.changed,
    blocks: () => [
      [
        'one-column-text',
        textBlock(
          words('Published version', 'Versión publicada'),
          copy('This is what the site shows.', 'Esto es lo que muestra el sitio.')
        )
      ]
    ],
    changedBlocks: () => [
      [
        'one-column-text',
        textBlock(words('Edited after publishing', 'Editada tras publicar'), {
          en: paragraph('Saved, but not published yet.')
        })
      ]
    ]
  }
]

export const SITE_SETTINGS = {
  siteName: words('Seed Studio', 'Estudio Seed'),
  defaultDescription: words(
    'A site filled with sample content.',
    'Un sitio con contenido de ejemplo.'
  )
}

export const SITE_SLOTS = {
  header: [
    'site-header',
    {
      navigation: [
        { link: link('Home', 'Inicio', '/'), dropdown: [] },
        { link: link('Blog', 'Blog', `/${slug('blog')}`), dropdown: [] },
        {
          link: link('Pages', 'Páginas', `/${slug('about')}`, `/es/${slug('acerca-de')}`),
          dropdown: [
            link('About', 'Acerca de', `/${slug('about')}`, `/es/${slug('acerca-de')}`),
            link('Featured', 'Destacados', `/${slug('featured')}`, `/es/${slug('destacados')}`)
          ]
        }
      ]
    }
  ],
  footer: [
    'site-footer',
    {
      text: words('Made with Backstage seed data.', 'Hecho con datos de ejemplo de Backstage.'),
      columns: [
        {
          heading: words('Read', 'Leer'),
          links: [link('Blog', 'Blog', `/${slug('blog')}`)]
        }
      ],
      contact: { email: 'hello@example.com' }
    }
  ]
}
