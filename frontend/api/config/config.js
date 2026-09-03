import { config as conf} from "dotenv";

conf();

const _config = {
  port: process.env.PORT || 5513,
  mongouri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  env: process.env.NODE_ENV,
  contractAddress:process.env.CONTRACT_ADDRESS,
  pinataApi:process.env.NEXT_PUBLIC_PINATA_API_KEY,
  pinataSecret:process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
  rpc_url:process.env.SEPOLIA_RPC_URL,
  privatekey:process.env.PRIVATE_KEY


}

export const config = Object.freeze(_config);