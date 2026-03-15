import { Metadata } from "next";

export const metadata: Metadata = {
  title: "인플루언서 대시보드 | 양반가",
  description: "양반가 인플루언서 대시보드",
  robots: "noindex, nofollow",
};

export default function InfluencerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
