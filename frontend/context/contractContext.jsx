'use client'
import { useState,useEffect,createContext,useContext } from "react";
import { ethers } from "ethers";
import { useConnection } from "wagmi";
import { ABI, ContractAddress } from "@/lib/contract/constans";

const ContractContext = createContext(null);

export const ContractProvider = ({children})=>{
     const {address,isConnected} = useConnection();
     const [signer,setSigner] = useState(null);
     const [provider,setProvider] = useState(null);
     const [contract,setContract] = useState(null);

     const getSignerAndContract = async()=>{
          if(typeof window === "undefined" || !window.ethereum){
               throw new Error("metamask or wallet not detected");
          }
          const provider = new ethers.BrowserProvider(window.ethereum);
          const  signer = provider.getSigner();
          const contract = new ethers.Contract(ContractAddress,ABI,signer);
          console.log("provider:",provider);
          console.log("signer:",signer);
          console.log("contract:",contract);

          return { signer, provider, contract };
     }
     //update 
     useEffect(()=>{
          const loadData = async()=>{
               if(isConnected && address){
               try {               
                         const { signer, provider, contract } = await getSignerAndContract();
                         setSigner(signer);
                         setContract(contract);
                         setProvider(provider)
                         } catch (error) {
                    console.log(error);
               }
                    } else {
                         setSigner(null);
                         setContract(null);
                         setProvider(null);
                    }
               
          };
          loadData();
     },[isConnected,address]);

     const getReadOnlyProvider  = ()=>{
          if(typeof window === 'undefined' || !window.ethereum){
               throw new Error("metamask or wallet not detected");
          }
          return new ethers.BrowserProvider(window.ethereum);
     }

     // manufaturer
     const joinAsManufacturer  = async(name,location)=>{
          if(!contract) throw new Error("Contract not initaialize");
          const tnx = await contract.joinAsManufacturer(name,location)
          return await tnx.wait();
     }

     const addRetailer = async(retailerAddress)=>{
          if(!contract) throw new Error("Contract not initaialize");
          const tnx = await contract.addRetailer(retailerAddress);
          return await tnx.wait();
     }
     
     const removeRetailer= async(retailerAddress)=>{
          if(!contract) throw new Error("Contract not initaialize");
          const tnx = await contract.removeRetailer(retailerAddress);
          return await tnx.wait();
     }
     
     const fullfillSupplyRequest = async(requestId,uris,metadataHashed)=>{
          if(!contract) throw new Error("Contract not initaialize");
          const tnx = await contract.fulfillSupplyRequest(requestId,uris,metadataHashed);
          return await tnx.wait();
     }
     const repairPart = async()=>{
          
     }
     const refurbishedPart = async(tokenId)=>{
          if(!contract) throw new Error("Contract not initaialize");
          const tnx = await contract.refurbishPart(tokenId);
          return await tnx.wait();

     }
     const recallPart = async(tokenId)=>{
          if(!contract) throw new Error("Contract not initaialize");
          const tnx = await contract.recallPart(tokenId);
          return await tnx.wait();
     }
     const transferToRetailer = async(to,tokenId)=>{
          if(!contract) throw new Error("Contract not initaialize");
          const tnx = await contract.transferToRetailer(to,tokenId);
          return await tnx.wait();
     }


     


}