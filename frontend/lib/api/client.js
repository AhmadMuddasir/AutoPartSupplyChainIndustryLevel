import axios  from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_URL ;

export const apiClient = axios.create({
     baseURL:API_BASE_URL,
     headers:{
          'Content-type':'application/json',
     },
     timeout:30000,
})

apiClient.interceptors.request.use(
     (config) =>{
          console.log(`${config.method?.toUpperCase} ${config.url}`)
     },
     (error) => 

          {
             console.error(error);
             return Promise.reject(error)  
          }

);

apiClient.interceptors.response.use(
     (response) => {
          console.log(`${response.status} ${response.config.url}`);
          return response
     },
     (error) => {
          console.log(error)
           return Promise.reject(error)  
     }
)

export default apiClient;
