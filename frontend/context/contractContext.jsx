'use client'
import { useState,useEffect,createContext,useContext } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { ABI, ContractAddress } from "@/lib/contract/constans";

const ContractContext = createContext(null);

export const ContractProvider = ({children})=>{
     const {address,isConnected} = useAccount();
     const [signer,setSigner] = useState(null);
     const [provider,setProvider] = useState(null);
     const [contract,setContract] = useState(null);
     const [requestNotification,setrequestNotification] = useState(0);

     const getSignerAndContract = async()=>{
          if(typeof window === "undefined" || !window.ethereum){
               throw new Error("metamask or wallet not detected");
          }
          const provider = new ethers.BrowserProvider(window.ethereum);
          const  signer =await  provider.getSigner();
          const contract = new ethers.Contract(ContractAddress,ABI.abi,signer);
          console.log("provider:",provider);
          console.log("signer:",signer);
          console.log("contract:",contract);

          return { signer, provider, contract };
     }
     //update 
     useEffect(()=>{
          const loadData = async()=>{
               if(isConnected && address){
               try {   console.log("load entered")            
                         const { signer, provider, contract } = await getSignerAndContract();
                         setSigner(signer);
                         setContract(contract);
                         setProvider(provider)
                         console.log("contract details",contract);
                         console.log("contract SIGNER",signer);
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
     const repairPart = async(tokenId)=>{
          if(!contract) throw new Error("Contract not initaialize");
          const tnx = await contract.repairPart(tokenId);
          return await tnx.wait();


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

     //retailer part

     const requestForRetailer = async(name,location)=>{
          if(!contract) throw new Error("Contract not initaialize");
          const tnx = await contract.requestForRetailer(name,location);
          setrequestNotification((prev)=>prev+1);
          return await tnx.wait();

     }
     const createSupplyRequest = async(productHash,quantity)=>{
          if(!contract) throw new Error("Contract not initailize");
          const tnx = await contract.createSupplyRequest(productHash,quantity);
          return await tnx.wait();
     }
     const shipPart = async(tokenId,PhoneNumber,trackingId)=>{
          if(!contract) throw new Error("Contract not initailaze");
          const tnx = await contract.shipPart(tokenId,PhoneNumber,trackingId);
          return await tnx.wait();
     }
     const confirmDelivery = async(tokenId)=>{
          if(!contract) throw new Error("Contract not initailaze");
          const tnx = await contract.confirmDelivery(tokenId);
          return await tnx.wait();

     }
     const reportDefectiveReturn = async(tokenId)=>{
          if(!contract) throw new Error("Contract not initailaze");
          const tnx = await contract.reportDefectiveReturn(tokenId);
          return await tnx.wait();
     }

     // read functions

     const getAllManufacturers = async()=>{
          console.log("2");
         return await contract.getAllManufacturers();
         
     }

     const getAllRetailers = async()=>{
          return await contract.getAllRetailers();
     }

     const getCustomerPhoneNumber = async(tokenId)=>{
          return await contract.getCustomerPhoneNumber(tokenId);
     }


     const getNFTCustodian = async(tokenId) =>{
          return await contract.getNFTCustodian(tokenId);
     }
     const getSaleStatus = async(tokenId) =>{
          return await contract.getSaleStatus(tokenId);
     }
     const verifyPartAuthenticity  = async(tokenId) =>{
          return await contract.verifyPartAuthenticity(tokenId);
     }

     const value = {
          address,
          isConnected,
          signer,
          provider,
          contract,
          joinAsManufacturer,
          addRetailer,
          removeRetailer,
          fullfillSupplyRequest,
          repairPart,
          refurbishedPart,
          recallPart,
          transferToRetailer,
          requestForRetailer,
          createSupplyRequest,
          shipPart,
          confirmDelivery,
          reportDefectiveReturn,
          getAllManufacturers,
          getAllRetailers,
          getCustomerPhoneNumber,
          getNFTCustodian,
          getSaleStatus,
          verifyPartAuthenticity,
          requestNotification
     }

     return(
          <ContractContext.Provider value={value}>
               {children}
          </ContractContext.Provider>
     )

     
     
}

export const useContract = ()=>{
     const context = useContext(ContractContext);
     return context;
}