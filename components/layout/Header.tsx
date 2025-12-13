"use client";

import Link from "next/link";

interface HeaderProps {
  activePage?: "face" | "saju" | "animal" | "history";
  showBack?: boolean;
  backHref?: string;
  title?: string;
}

export default function Header({
  activePage = "face",
  showBack = false,
  backHref = "/",
  title,
}: HeaderProps) {
  if (showBack) {
    return (
      <header className="fixed top-0 left-0 right-0 z-[999] bg-white shadow-[0_1px_20px_rgba(54,54,54,0.1)]">
        <div className="flex items-center px-5 py-3 max-w-md mx-auto">
          <Link href={backHref} className="flex items-center gap-1 text-[#0f0f0f] no-underline">
            <span className="material-icons text-base">arrow_back_ios</span>
            <span className="font-[family-name:var(--font-kimjungchul)] text-xl">
              {title || "뒤로"}
            </span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-[999] bg-white shadow-[0_1px_20px_rgba(54,54,54,0.1)]">
      <div className="flex items-center px-5 py-3 max-w-md mx-auto font-[family-name:var(--font-kimjungchul)]">
        <Link href="/" className="mr-3 no-underline">
          <span
            className={`text-xl ${
              activePage === "face" ? "text-[#0f0f0f]" : "text-[#828282]"
            }`}
          >
            관상
          </span>
        </Link>

        <Link href="/saju-love/" className="mr-3 no-underline relative">
          <span
            className={`text-xl ${
              activePage === "saju" ? "text-[#0f0f0f]" : "text-[#828282]"
            }`}
          >
            연애 사주
          </span>
          <span className="absolute -top-2 -right-2 bg-gradient-to-br from-[#ff5252] to-[#ff1744] text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide">
            NEW
          </span>
        </Link>

        <Link href="/animalface/" className="mr-3 no-underline">
          <span
            className={`text-xl ${
              activePage === "animal" ? "text-[#0f0f0f]" : "text-[#828282]"
            }`}
          >
            동물상
          </span>
        </Link>
      </div>
    </header>
  );
}
