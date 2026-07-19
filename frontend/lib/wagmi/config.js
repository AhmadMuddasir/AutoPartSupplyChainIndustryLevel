import {http} from "wagmi";
import { sepolia,mainnet } from "viem/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
export const config = getDefaultConfig({
    
     appName: "AutoPartNFT",
     projectId: "edd6de4c03f672db2b2f54f1367c562f",
     chains:[sepolia,mainnet],
     ssr: true,
     transports:{
          [sepolia.id]:http("https://eth-sepolia.g.alchemy.com/v2/eRgV0M6z4uBDs20u3ut3wXdnbrAHlfQi"),
          [mainnet.id]:http("https://eth-mainnet.g.alchemy.com/v2/pYP_63H4Qd1sC6Sixh5RPFw9r7P3jDn_"),
     }
})


