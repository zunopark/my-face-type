"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "";

  return (
    <nav className="nav_wrap">
      <Link
        href="/"
        className={`nav_content ${isHome ? "nav_seleted" : ""}`}
      >
        <span className="material-icons nav_icon">home</span>
        <div className="nav_title">전체 보기</div>
      </Link>
    </nav>
  );
}
