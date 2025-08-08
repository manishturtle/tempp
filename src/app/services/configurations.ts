import axios from "axios";

import { getAuthHeaders } from "../hooks/api/auth";
import {getTenantApiBaseUrl} from "../utils/tenant-admin/tenantUtils";

const ECOM_URL = "http://localhost:8045/api";
// const ECOM_URL = "http://localhost:8045/api";


const getCsrfToken = (): string => {
  if (typeof document === "undefined") return "";
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1];
  return cookieValue || "";
};

// Base API configuration
const api = axios.create({
  baseURL: getTenantApiBaseUrl(),
  headers: getAuthHeaders(),
  withCredentials: true,
});

// Add a request interceptor to include the CSRF token
api.interceptors.request.use((config) => {
  const token = getCsrfToken();
  if (token) {
    config.headers["X-CSRFToken"] = token;
  }
  return config;
});

export const getCustomerSegments = async () => {
  try {
    const response = await axios.get(
      ECOM_URL + "/v1/customer-groups/active-with-channels/",
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching customer segments:", error);
    throw error;
  }
};

export const getVoucherTypes = async (type: string) => {
  try {
    const response = await api.get(
      `/configurations/voucher-types/?type=${type}&paginate=false`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching voucher types:", error);
    throw error;
  }
};

export const getConfigDefinitions = async () => {
  try {
    const response = await api.get(
      `/configurations/config-setting-definitions/`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching config definitions:", error);
    throw error;
  }
};

export const getTemplates = async (voucherTypeId?: number) => {
  try {
    let url = `/configurations/templates/?paginate=false`;
    if (voucherTypeId) {
      url += `&voucher_type_id=${voucherTypeId}`;
    }

    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw error;
  }
};

// Voucher Type Segment Template Assignments API

export const getVoucherTypeSegmentTemplateAssignments = async (params?: {
  voucher_type?: number;
  segment_id?: number | "null";
  paginate?: boolean;
}) => {
  try {
    let url = "/configurations/configurations/";
    const queryParams = new URLSearchParams();

    if (params?.voucher_type) {
      queryParams.append("voucher_type", params.voucher_type.toString());
    }

    if (params?.segment_id) {
      queryParams.append("segment_id", params.segment_id.toString());
    }

    if (params?.paginate !== undefined) {
      queryParams.append("paginate", params.paginate.toString());
    }

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching voucher type segment template assignments:",
      error
    );
    throw error;
  }
};

export const getVoucherTypeSegmentTemplateAssignment = async (id: number) => {
  try {
    const response = await api.get(`/configurations/configurations/${id}/`);
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching voucher type segment template assignment ${id}:`,
      error
    );
    throw error;
  }
};

export const createVoucherTypeSegmentTemplateAssignment = async (data: {
  templateAssignment: {
    voucher_type: number;
    template: number;
    segment_id?: number | null;
  };
  configValues: Array<{
    setting_def: number;
    voucher_type: number;
    configured_value: string | number | boolean | null;
  }>;
}) => {
  try {
    const response = await api.post("/configurations/configurations/", data);
    return response.data;
  } catch (error) {
    console.error(
      "Error creating voucher type segment template assignment:",
      error
    );
    throw error;
  }
};

export const updateVoucherTypeSegmentTemplateAssignment = async (
  id: number,
  data: {
    configValues: Array<{
      setting_def: number;
      voucher_type: number;
      configured_value: string | number | boolean | null;
    }>;
  }
) => {
  try {
    const response = await api.patch(
      `/configurations/configurations/${id}/`,
      data
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error updating voucher type segment template assignment:",
      error
    );
    throw error;
  }
};

export const deleteVoucherTypeSegmentTemplateAssignment = async (
  id: number
) => {
  try {
    await api.delete(`/configurations/configurations/${id}/`);
    return true;
  } catch (error) {
    console.error(
      `Error deleting voucher type segment template assignment ${id}:`,
      error
    );
    throw error;
  }
};
