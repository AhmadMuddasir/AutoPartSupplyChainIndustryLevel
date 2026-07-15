import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient,QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi/config";
import { ContractProvider } from "@/context/contractContext";
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient();

export const metadata = {
  title: "AutoPart supplychain",
  description: 'NFT-based auto part supply chain management',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <ContractProvider>
                <main className="">
                  {children}
                </main>
              </ContractProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
