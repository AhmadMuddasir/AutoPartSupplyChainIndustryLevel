"use client";

import { ethers } from "ethers";
import { useContract } from "@/context/contractContext";
import ManufactureCard from "@/components/ManufactureCard";
import { useEffect, useState } from "react";

const Page = () => {
  
  const {
    joinAsManufacturer,
    addRetailer,
    removeRetailer,
    fullfillSupplyRequest,
    repairPart,
    refurbishedPart,
    recallPart,
    transferToRetailer,
    getAllManufacturers,
  } = useContract();

  const [manufacturers,setManufacturers] = useState([]);
  
useEffect(() => {
  const fetchManufacturers = async () => {
    try {
      console.log("1")
      const manuf= await getAllManufacturers();
      setManufacturers(manuf);
      console.log("3")
      console.log("manufacturers", manufacturers);
    } catch (err) {
      console.error("Error fetching manufacturers:", err);
    }
  };

  fetchManufacturers();
}, []);

  const actions = [
    {
      title: "Join as Manufacturer",
      description: "Register your company on-chain.",
      fields: [
        { name: "name", placeholder: "Company name" },
        { name: "location", placeholder: "Location" },
      ],
      onSubmit: (value) => joinAsManufacturer(value.name, value.location),
    },
    {
      title: "Add Retailer",
      description: "Grant a retailer access to your supply chain.",
      fields: [{ name: "retailer", placeholder: "Retailer Wallet Address" }],
      onSubmit: (v) => addRetailer(v.retailer),
    },
    {
      title: "Remove Retailer",
      description: "Revoke a retailer's access.",
      fields: [{ name: "retailer", placeholder: "Retailer Wallet Address" }],
      onSubmit: (v) => removeRetailer(v.retailer),
    },
    {
      title: "Fulfill Supply Request",
      description: "Mint parts in response to a retailer's request.",
      fields: [
        { name: "requestId", type: "number", placeholder: "Request Id" },
        { name: "uris", placeholder: "Metadata URIs  (comma-separated)" },
        { name: "hashes", placeholder: "Metadata URIs  (comma-separated)" },
      ],
      onSubmit: (v) =>
        fullfillSupplyRequest(
          v.requestId,
          v.uris.split(",").map((s) => s.trim()),
          v.hashes.split(",").map((s) => ethers.id(s.trim()))        ),
    },
    {
      title: "Repair Part",
      description: "Mark a defective part as repaired.",
      fields: [{ name: "tokenID", type: "number", placeholder: "TokenId" }],
      onSubmit: (v) => repairPart(v.tokenId),
    },
    {
      title: "Refurbished Part",
      description: "Mark a defective part as refurbished.",
      fields: [{ name: "tokenID", type: "number", placeholder: "TokenId" }],
      onSubmit: (v) => refurbishedPart(v.tokenId),
    },
    {
      title: "Recall Part",
      description: "Issue a recall on a specific part.",
      fields: [{ name: "tokenID", type: "number", placeholder: "TokenId" }],
      onSubmit: (v) => recallPart(v.tokenId),
    },
    {
      title: "Transfer to Retailer",
      description: "Directly transfer a part to a retailer.",
      fields: [
        { name: "to", placeholder: "Retailer address" },
        { name: "tokenId", type: "number", placeholder: "Token ID" },
      ],
      onSubmit: (v) => transferToRetailer(v.to, v.tokenId),
    },
  ];

  return  (   <div className="min-h-screen bg-[#1C2620] px-8 py-16">
    <nav>
      <button>Supply Requests</button>
      <button>Retailer Requests</button>
    </nav>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-white">Manufacturer Dashboard</h1>
        <p className="mt-1 text-sm text-white/60">
          Manage your parts, retailers, and recalls.
        </p>

        <div className="mt-8 space-y-3">
          {actions.map((action) => (
            <ManufactureCard key={action.title} {...action} />
          ))}
        </div>
      </div>
    </div>)
};

export default Page;
