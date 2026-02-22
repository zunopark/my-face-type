import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import MixpanelProvider from "@/components/providers/MixpanelProvider";
import InAppBrowserBanner from "@/components/InAppBrowserBanner";

// 한글 폰트 (김정철명조)
const kimjungchul = localFont({
  src: "./fonts/KimjungchulMyungjo-Bold.woff2",
  variable: "--font-kimjungchul",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://yangban.ai"),
  title: {
    default: "관상 테스트 - AI 관상, 사주, 궁합, 운세 | 양반가",
    template: "%s | 양반가",
  },
  description:
    "관상 테스트 무료로 해보세요! AI가 얼굴 사진으로 관상을 분석하고, 사주, 궁합, 연애운, 신년 운세까지 풀어드립니다.",
  keywords: [
    "관상 테스트",
    "관상",
    "AI 관상",
    "관상 보기",
    "사주",
    "궁합",
    "운세",
    "연애 사주",
    "신년 운세",
    "동물상 테스트",
    "양반가",
  ],
  authors: [{ name: "관상가 양반 | Nmax" }],
  verification: {
    google: [
      "5jMrJKVs7H177f1geuB5P3ich8NWoORj_j7ihOOSarQ",
      "1OfOPLe0KtYlpDARcO1LVhTvWfNRNKndeIhnkYo_i34",
    ],
    other: {
      "naver-site-verification": [
        "95cd8990ed3962c82f8898a9372ce4b24dddbcb9",
        "d2a00bde5ae1184c75d29957787926125e1183c8",
      ],
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "양반가",
    title: "관상 테스트 - AI 관상, 사주, 궁합, 운세 | 양반가",
    description:
      "관상 테스트 무료로 해보세요! AI가 얼굴 사진으로 관상을 분석하고, 사주, 궁합, 연애운, 신년 운세까지 풀어드립니다.",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "양반가 - 관상 테스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "관상 테스트 - AI 관상, 사주, 궁합, 운세 | 양반가",
    description:
      "관상 테스트 무료로 해보세요! AI가 얼굴 사진으로 관상을 분석하고, 사주, 궁합, 연애운, 신년 운세까지 풀어드립니다.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon.ico", sizes: "16x16", type: "image/x-icon" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 모바일 브라우저 자동 링크 변환 비활성화 */}
        <meta
          name="format-detection"
          content="telephone=no, date=no, email=no, address=no"
        />
        {/* Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css?family=Asap:400,500,700"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        className={`${kimjungchul.variable} antialiased bg-gray-50`}
        suppressHydrationWarning
      >
        <MixpanelProvider>
          <InAppBrowserBanner />
          {children}
        </MixpanelProvider>

        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}

        {/* Google Ads (gtag.js) - 전환 측정 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17969586043"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17969586043');
          `}
        </Script>

        {/* AdSense */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        )}

        {/* TossPayments */}
        <Script
          src="https://js.tosspayments.com/v1/payment-widget"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
