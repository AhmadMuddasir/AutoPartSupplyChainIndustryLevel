import apiClient from "./client";

export const autopartApi = {
     create:async (data) =>{
          const response = await apiClient.post(`/api/supplyChain/createautoParts`,data);
          return response.data;
     },
     getAll:async(params = {}) =>{
          const {page = 1,limit = 20,category,brandName,search} = params;
          const query = new URLSearchParams();
          if(page) query.append("page",page);
          if(limit) query.append("limit",limit);
          if(category) query.append("category",category)
          if(brandName) query.append("brandName",brandName)
          if(search) query.append("search",search)

          const response = await apiClient.get(`/api/supplyChain/${query.toString()}`)
          return response.data
     },
     getById:async(id) => {
          const response = await apiClient.get(`api/supplyChain/${id}`)
          return response.data;
     },
     getByTokenId:async(tokenId)=>{
          const response = await apiClient.get(`api/supplyChain/token/${tokenId}`);
          return response.data;
     },
     update:async(id,data)=>{
          const response = await apiClient.patch(`api/supplyChain/${id}`,data);
          return response.data;
     },
     delete: async (id) => {
          const response = await apiClient.delete(`/api/supplyChain/${id}`);
          return response.data;
  },
     mint: async (partId, retailerAddress) => {
          const response = await apiClient.post("/api/supplyChain/mint", {
            partId,
            retailerAddress, 
          });
          return response.data;
     },         
     sync: async (tokenId) => {
          const response = await apiClient.post(`/api/supplyChain/sync/${tokenId}`);
          return response.data;
  },

}

