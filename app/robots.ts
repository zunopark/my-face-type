import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/payment/",
          "/face/result",
          "/couple/result",
          "/saju-love/result",
          "/saju-love/detail",
          "/new-year/result",
          "/new-year/detail",
          "/history/",
        ],
      },
      {
        userAgent: "Yeti", // 네이버 봇
        allow: "/",
        crawlDelay: 1,
      },
    ],
    sitemap: "https://yangban.ai/sitemap.xml",
  };
}
