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
    default: "AI 관상 테스트 | 관상가 양반",
    template: "%s",
  },
  description:
    "AI 관상 테스트로 나의 얼굴을 분석해보세요. 관상가 양반이 알려주는 관상, 동물상, 궁합, 연애 사주까지 한 번에!",
  keywords: [
    "관상 테스트",
    "관상",
    "관상가 양반",
    "사주",
    "운세",
    "AI",
    "인공지능",
    "동물상",
    "궁합",
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
    title: "AI 관상 테스트 | 관상가 양반",
    description:
      "AI 관상 테스트로 나의 얼굴을 분석해보세요. 관상가 양반이 알려주는 관상, 동물상, 궁합, 연애 사주까지 한 번에!",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "관상가 양반",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 관상 테스트 | 관상가 양반",
    description:
      "AI 관상 테스트로 나의 얼굴을 분석해보세요. 관상가 양반이 알려주는 관상, 동물상, 궁합, 연애 사주까지 한 번에!",
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
