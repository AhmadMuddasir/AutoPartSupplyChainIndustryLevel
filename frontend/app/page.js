import Image from "next/image";
import "./globals.css";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import { config } from "@/lib/wagmi/config";
import { ContractProvider } from "@/context/contractContext";
import '@rainbow-me/rainbowkit/styles.css';

export default function Home() {
  return (
    <div >
        AutoPartNFT
    </div>
  );
}
