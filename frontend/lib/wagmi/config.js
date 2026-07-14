import { createConfig } from "wagmi";
import { sepolia,mainnet } from "viem/chains";
import { metaMask,injected } from "wagmi/connectors";

export const config = createConfig({
     chains:[sepolia,mainnet],
     connectors:[injected(),metaMask()],
     ssr: true,
     transports:{
          [sepolia.id]:http(),
          [mainnet.id]:http(),
     }
})