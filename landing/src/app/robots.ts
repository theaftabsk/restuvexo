export default function robots(): any {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/private/'],
    },
    sitemap: 'https://restuvexo.shop/sitemap.xml',
  }
}
