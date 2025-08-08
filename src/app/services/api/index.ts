// import axios from 'axios';

// const api = axios.create({
//   baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// export const apiEndpoints = {
//   auth: {
//     login: '/api/auth/login/',
//     logout: '/api/auth/logout/',
//     refresh: '/api/auth/refresh/',
//     me: '/api/auth/me/',
//   },
//   ofm: {
//     workflows: '/api/v1/ofm/workflows/',
//     templates: '/api/v1/ofm/templates/',
//   },
// };

// export const setAuthToken = (token: string | null) => {
//   if (token) {
//     api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//   } else {
//     delete api.defaults.headers.common['Authorization'];
//   }
// };

// export default api;
