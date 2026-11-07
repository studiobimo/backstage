// The one source of truth for the site's metadata: index.html takes it at build time,
// and the app imports it for page titles.
export const site = {
  name: 'Backstage',
  title: 'Backstage',
  description: "Lean, reusable CMS for studio marketing sites on Cloudflare's free tier.",
  url: 'https://backstage.example.com',
  ogImage: '/og.png',
  themeColor: '#ffffff',
  locale: 'en_US'
} as const
