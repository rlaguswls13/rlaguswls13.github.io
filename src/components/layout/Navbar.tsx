"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/devlog", label: "Devlogs" },
  { href: "/journal", label: "Journal" },
  { href: "/career", label: "Career" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav aria-label="주 메뉴">
      <Link href="/" className="nav-brand" aria-label="TECH LOG KHJ 홈">
        <span className="nav-brand-tech">TECH</span> LOG <span className="nav-brand-signature">&lt;KHJ/&gt;</span>
      </Link>
      <div className="nav-links">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? "active" : ""}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
