"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "";
  const isHistory = pathname === "/history" || pathname === "/history/";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200/20 z-50">
      <div className="max-w-md mx-auto flex justify-around items-center py-3">
        <Link
          href="/"
          className={`flex flex-col items-center no-underline ${
            isHome ? "text-[#ff5121]" : "text-[#cdcdcd]"
          }`}
        >
          <span className="material-icons text-2xl pb-1">home</span>
          <span className="text-xs">전체 보기</span>
        </Link>

        <Link
          href="/history/"
          className={`flex flex-col items-center no-underline ${
            isHistory ? "text-[#ff5121]" : "text-[#cdcdcd]"
          }`}
        >
          <span className="material-icons text-2xl pb-1">person</span>
          <span className="text-xs">지난 보고서</span>
        </Link>
      </div>
    </nav>
  );
}
