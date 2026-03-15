import { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 대시보드 | 양반가",
  description: "양반가 관리자 대시보드",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
