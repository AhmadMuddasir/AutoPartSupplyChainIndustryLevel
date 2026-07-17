"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnection } from "./WalletConnect";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/manufacturer", label: "Manufacturer" },
  { href: "/retailer", label: "Retailer" },
  { href: "/parts", label: "Parts Service" },
  { href: "/customer", label: "Customer Service" },
];

export default function Navbar() {
  const pathName = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
        <ul className="flex items-center gap-1">
          {navLinks.map((link)=>{
               const isActive = pathName === link.href;
               return(
                    <li key={link.href}>
                         <Link
                         href={link.href}
                         aria-current={isActive ? "page": undefined}
                         className={`relative px-3 py-2 text-md font-medium text-white transition-colors ${
                         isActive ? "text-white" : "text-white/70 hover:text-white"
                         }`}
                         >
                              {link.label}
                              {isActive && (
                         <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-[#089a00]" />
                         )}
                         </Link>
                    </li>
               );
          })}
        </ul>
        <WalletConnection/>
      </nav>
    </header>
  );
}
