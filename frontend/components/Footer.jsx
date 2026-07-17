import Link from "next/link";

const footerLinks = [
  { href: "/manufacturer", label: "Manufacturer" },
  { href: "/retailer", label: "Retailer" },
  { href: "/parts", label: "Parts Service" },
  { href: "/customer", label: "Customer Service" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#4A5D48] bg-[#1C2620] px-8 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#8FA88A] text-sm font-bold text-[#1C2620]">
            A
          </span>
          <span className="text-sm font-semibold text-white">
            AutoPart<span className="text-[#8FA88A]">NFT</span>
          </span>
        </div>

        <ul className="flex flex-wrap items-center gap-6">
          {footerLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-white/60 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-sm text-white/40">
          © {new Date().getFullYear()} AutoPartNFT. All rights reserved.
        </p>
      </div>
    </footer>
  );
}