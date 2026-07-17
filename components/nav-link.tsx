"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: string;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
  children: ReactNode;
};

export function NavLink({ href, className, activeClassName, exact = false, children }: NavLinkProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link aria-current={active ? "page" : undefined} className={clsx(className, active && activeClassName)} href={href}>
      {children}
    </Link>
  );
}
