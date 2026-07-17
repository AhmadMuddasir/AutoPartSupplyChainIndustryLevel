"use client";

import Link from "next/link";
import { Factory, Store, ShieldCheck, Search } from "lucide-react";
import Footer from "@/components/Footer";

const features = [
  {
    icon: Factory,
    title: "Manufacturer Portal",
    description:
      "Mint Auto parts as NFTs,approved retailers,and recall products with full on-chain traceability.",
  },
  {
    icon: Store,
    title: "Retailer Portal",
    description:
      "Request supply, ship parts to customers, and manage defective returns",
  },
  {
    icon: ShieldCheck,
    title: "Parts Verification",
    description:
      "Verify your Auto parts genuinety,authenticity,condition, and complete supply chain history.",
  },
  {
    icon: Search,
    title: "Customer Verification",
    description:
      "No wallet required — customers can check if their part is genuine in seconds.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-[#1C2620] px-8 py-28">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[500px] rounded-full bg-[#8FA88A]/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#4A5D48] bg-[#8FA88A]/10 px-4 py-1.5 text-sm font-medium text-[#8FA88A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8FA88A]" />
            Blockchain-Verified Supply Chain
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Every Auto Part.
            <br />
            <span className="text-[#8FA88A]">Verified On-Chain.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            AutoPartNFT tracks automotive parts from manufacturer to retailer to
            customer using NFTs — giving you tamper-proof proof of authenticity,
            condition, and supply chain history.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/parts"
              className="rounded-md bg-[#8FA88A] px-6 py-3 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776]"
            >
              Verify a Part
            </Link>
            <Link
              href="/manufacturer"
              className="rounded-md border border-[#4A5D48] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4A5D48]/40"
            >
              Get Started
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-[#4A5D48] pt-10">
            <div>
              <p className="text-3xl font-bold text-white">100%</p>
              <p className="mt-1 text-sm text-white/60">On-Chain Verified</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">24/7</p>
              <p className="mt-1 text-sm text-white/60">
                Supply Chain Tracking
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">Zero</p>
              <p className="mt-1 text-sm text-white/60">Counterfeit Risk</p>
            </div>
          </div>
        </div>
      </section>
      {/* features */}
      <section className="bg-[#1C2620] px-8 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-[#8FA88A]">
              How It Works
            </span>
            <h2 className="mt-3 text-4xl font-bold text-white">
              Built for Every Link in the Chain
            </h2>
            <p className="mt-4 text-white/70">
              From factory floor to customer hands, every step is tracked,
              verified, and tamper-proof.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-lg border border-[#4A5D48] bg-[#243329] p-6 transition-colors hover:border-[#8FA88A]/50">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#8FA88A]/10">
                  <Icon className="h-5 w-5 text-[#8FA88A]" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-white/60">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer/>
    </div>
 
  );
}
