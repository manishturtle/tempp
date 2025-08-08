// import axios from "axios";
// import { SERVICE_MANAGEMENT_API_BASE_URL } from "../../utils/constants";
// import { getAuthHeaders } from '@/app/hooks/api/auth';
// import { useParams } from "next/navigation";


// // Create a flexible axios instance that will have its baseURL updated dynamically
// export const axiosInstance = axios.create({
//   baseURL: SERVICE_MANAGEMENT_API_BASE_URL,
// });


// // Add a request interceptor to include the auth token and handle tenant-specific URLs
// axiosInstance.interceptors.request.use(
//   (config: any) => {
//     // Get tenant slug from localStorage
//     // const tenantSlug = localStorage.getItem("tenant_slug")
//     const tenantSlug = useParams<{ tenant: string }>().tenant || "";

//     // Get auth token from localStorage
//     // const authToken = localStorage.getItem(`${tenantSlug}_admin_token`);

//     // If tenant slug exists, update the baseURL to include it
//     if (tenantSlug) {
//       config.baseURL = `${SERVICE_MANAGEMENT_API_BASE_URL}/${tenantSlug}`;
//     }

//     const authHeaders = getAuthHeaders();
//     // If token exists, add it to the request headers
//     if (authHeaders) {
//       config.headers = {
//         // ...config.headers,
//         ...authHeaders,
//       };
//     } else {
//       console.log("No auth headers found for API request");
//     }

//     return config;
//   },
//   (error: any) => {
//     return Promise.reject(error);
//   }
// );

// export default axiosInstance;



import axios from "axios";
import { SERVICE_MANAGEMENT_API_BASE_URL } from "../../utils/constants";
import { getAuthHeaders } from '@/app/hooks/api/auth';


// Create a flexible axios instance that will have its baseURL updated dynamically
export const axiosInstance = axios.create({
  baseURL: SERVICE_MANAGEMENT_API_BASE_URL,
});

// Add a request interceptor to include the auth token and handle tenant-specific URLs
axiosInstance.interceptors.request.use(
  (config: any) => {
    
    // Get tenant slug from localStorage
    const tenantSlug = localStorage.getItem(`admin_current_tenant_slug`);

    // Get auth token from localStorage
    const authToken = localStorage.getItem(`${tenantSlug}_admin_token`);

    // If tenant slug exists, update the baseURL to include it
    if (tenantSlug) {
      config.baseURL = `${SERVICE_MANAGEMENT_API_BASE_URL}/${tenantSlug}`;
    }

    // If token exists, add it to the request headers
    if (authToken) {
      config.headers["Authorization"] = `Bearer ${authToken}`;
    } else {
      console.log("No token found for API request");
    }

    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
