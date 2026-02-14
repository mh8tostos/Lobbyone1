export default function sitemap() {
  const baseUrl = 'https://lobbyone1.com';

  return [
    {
      url: `${baseUrl}/`,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/auth`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/events`,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/messages`,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/legal`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
