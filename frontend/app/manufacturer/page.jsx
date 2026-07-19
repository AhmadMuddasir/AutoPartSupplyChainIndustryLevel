"use client";

import React, { useState } from "react";
import { useContract } from "@/context/contractContext";

const Page = () => {
  const { joinAsManufacturer } = useContract();
  const [joinBtn, setJoinBtn] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmission = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await joinAsManufacturer(name, location);
      setName("");
      setLocation("");
      setJoinBtn(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C2620] px-8 py-20">
      <div className="mx-auto max-w-lg text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#4A5D48] bg-[#8FA88A]/10 px-4 py-1.5 text-sm font-medium text-[#8FA88A]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8FA88A]" />
          Manufacturer Access
        </span>
        <p></p>

        <h1 className="mt-6 text-3xl font-bold text-white">
          Get Access to Join as Manufacturer
        </h1>
        <p className="mt-3 text-white/60">
          Register your company on-chain to start minting and managing parts.
        </p>

        {!joinBtn && (
          <button
            onClick={() => setJoinBtn(true)}
            className="mt-8 rounded-md bg-[#8FA88A] px-6 py-3 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776]"
          >
            Join as Manufacturer
          </button>
        )}

        {joinBtn && (
          <div className="mt-8 rounded-xl border border-[#4A5D48] bg-[#243329] p-8 text-left">
            <p className="rounded-md border border-[#4A5D48] bg-[#1C2620] px-4 py-3 text-sm font-mono text-white/70">
              Note: The admin is giving access only for interaction — in
              production, proper permission/approval is required.
            </p>

            <form onSubmit={handleSubmission} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-white/70">
                  Company Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Motor Parts Inc."
                  required
                  className="w-full rounded-md border border-[#4A5D48] bg-[#1C2620] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#8FA88A]"
                  type="text"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white/70">
                  Location
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Detroit, Michigan"
                  required
                  className="w-full rounded-md border border-[#4A5D48] bg-[#1C2620] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#8FA88A]"
                  type="text"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-md bg-[#8FA88A] px-4 py-2.5 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Joining..." : "Join Now"}
                </button>
                <button
                  type="button"
                  onClick={() => setJoinBtn(false)}
                  className="rounded-md border border-[#4A5D48] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-[#4A5D48]/40 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;