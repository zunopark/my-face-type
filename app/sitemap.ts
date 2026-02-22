import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://yangban.ai";

  const staticPages = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/face/", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/saju-love/", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/new-year/", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/couple/", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/animalface/", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/history/", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/refund/", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return staticPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
