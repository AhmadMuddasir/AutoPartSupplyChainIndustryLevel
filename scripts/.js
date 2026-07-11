require("dotenv").config();
const privateKey = process.env.PRIVATE_KEY;
const RPC_URL = process.env.SEPOLIA_RPC_URL
console.log(privateKey);
console.log(RPC_URL)