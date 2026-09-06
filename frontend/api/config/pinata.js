import axios from "axios";
import { config } from "./config.js";

const pinata = {
  // Used by backend
  uploadJSON: async (metadata) => {
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key:config.pinataApi,
          pinata_secret_api_key:config.pinataSecret,
        },
      }
    );
    return response.data.IpfsHash;
  },


  getUploadHeaders: () => {
    return {
      pinata_api_key:config.pinataApi,
      pinata_secret_api_key: config.pinataSecret,
        };
    },
 

  getGatewayUrl: (cid) => `https://gateway.pinata.cloud/ipfs/${cid}`,
  getIpfsUri: (cid) => `ipfs://${cid}`,
};

export default pinata;

