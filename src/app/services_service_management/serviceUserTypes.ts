import { axiosInstance } from "./axiosInstance";

export interface ServiceUserType {
  id: number;
  name: string;
  description: string;
  status: string;
  service_user_group: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceUserTypesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceUserType[];
}

const getServiceUserTypes = async (
  page = 1,
  pageSize = 10,
  search?: string
): Promise<ServiceUserTypesResponse> => {
  const response = await axiosInstance.get(`/service-users/types/`, {
    params: {
      page,
      page_size: pageSize,
      search,
    },
  });
  return response.data;
};

const getAllServiceUserTypes = async (): Promise<ServiceUserType[]> => {
  const response = await axiosInstance.get(
    `/service-users/types/?all_records=true`
  );
  return response.data;
};

const getServiceUserTypeById = async (id: number): Promise<ServiceUserType> => {
  const response = await axiosInstance.get(`/service-users/types/${id}/`);
  return response.data;
};

const createServiceUserType = async (
  data: Partial<ServiceUserType>
): Promise<ServiceUserType> => {
  const response = await axiosInstance.post(`/service-users/types/`, data);
  return response.data;
};

const updateServiceUserType = async (
  id: number,
  data: Partial<ServiceUserType>
): Promise<ServiceUserType> => {
  const response = await axiosInstance.patch(
    `/service-users/types/${id}/`,
    data
  );
  return response.data;
};

const deleteServiceUserType = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/service-users/types/${id}/`);
};

export const serviceUserTypesApi = {
  getServiceUserTypes,
  getAllServiceUserTypes,
  getServiceUserTypeById,
  createServiceUserType,
  updateServiceUserType,
  deleteServiceUserType,
};
