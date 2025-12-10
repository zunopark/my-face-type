import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/payment/success", "/payment/fail"],
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
