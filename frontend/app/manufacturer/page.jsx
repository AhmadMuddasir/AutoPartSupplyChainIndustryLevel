"use client";

import React, { useState } from "react";
import { useContract } from "@/context/contractContext";

const Page = () => {
  const { joinAsManufacturer } = useContract();
  const [joinBtn, setJoinBtn] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);



  return (
    <div className="min-h-screen bg-[#1C2620] px-8 py-20">

    </div>
  );
};

export default Page;