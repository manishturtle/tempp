import { NextResponse } from "next/server";

import {AI_PLATFORM_API_BASE_URL} from "../../utils/constants";
import { getAuthHeaders } from "../hooks/api/auth";


// Helper function to handle API requests
async function fetchData(endpoint: string, options: RequestInit = {}, tenantSlug?: string) {
  const API_BASE_URL = `${AI_PLATFORM_API_BASE_URL}/${tenantSlug || ''}/webhook-management`;
  try {
    console.log("API_BASE_URL", API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Something went wrong");
    }

    // Handle 204 No Content response
    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Webhook Configurations
export async function getWebhookConfigs(tenantSlug?: string) {
  const data = await fetchData("/webhooks/", {}, tenantSlug);
  
  // If the response is paginated (has 'results' field), return the results array
  // Otherwise, return the data as is (for backward compatibility)
  return data.results || data;
}

export async function getWebhookConfig(id: string, tenantSlug?: string) {
  return fetchData(`/webhooks/${id}/`, {}, tenantSlug);
}

export async function createWebhookConfig(data: any, tenantSlug?: string) {
  return fetchData("/webhooks/", {
    method: "POST",
    body: JSON.stringify(data),
  }, tenantSlug);
}

export async function updateWebhookConfig(id: string, data: any, tenantSlug?: string) {
  console.log("Sending update request with data:", { id, data });
  try {
    const response = await fetchData(`/webhooks/${id}/`, {
      method: "PATCH",
      headers: {
          ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    console.log("Update response:", response);
    return response;
  } catch (error) {
    console.error("Error in updateWebhookConfig:", error);
    throw error;
  }
}

export async function deleteWebhookConfig(id: string, tenantSlug?: string) {
  return fetchData(`/webhooks/${id}/`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  }, tenantSlug);
}

// Webhook Logs
export async function getWebhookLogs(webhookConfigId?: string) {
  const endpoint = webhookConfigId
    ? `/webhook-logs/?webhook_config=${webhookConfigId}`
    : "/webhook-logs/";
  const data = await fetchData(endpoint, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  // If the response is paginated (has 'results' field), return the results array
  // Otherwise, return the data as is (for backward compatibility)
  return data.results || data;
}

export async function getWebhookLog(id: string) {
  return fetchData(`/webhook-logs/${id}/`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
}

// Customers
export async function getCustomers() {
  try {
    const response = await fetchData("/customers/?is_active=true", {
      headers: {
        ...getAuthHeaders(),
      },
    });
    // If the API returns an array, use it directly
    // If it's an object with a 'results' property, use that
    // Otherwise, return an empty array
    return Array.isArray(response) ? response : response.results || [];
  } catch (error) {
    console.error("Error in getCustomers:", error);
    // Return empty array if there's an error
    return [];
  }
}

// Use Cases
export async function getUseCases() {
  try {
    const response = await fetchData("/use-cases/", {
      headers: {
        ...getAuthHeaders(),
      },
    });
    // If the API returns an array, use it directly
    // If it's an object with a 'results' property, use that
    // Otherwise, return an empty array
    return Array.isArray(response) ? response : response.results || [];
  } catch (error) {
    console.error("Error in getUseCases:", error);
    // Return a default use case if the API call fails
    return [
      { id: "image_generation", name: "Image Generation" },
      { id: "text_generation", name: "Text Generation" },
      { id: "speech_to_text", name: "Speech to Text" },
      { id: "text_to_speech", name: "Text to Speech" },
    ];
  }
}

// API Route Handlers
export async function GET() {
  try {
    const data = await getWebhookConfigs();
    console.log("Webhook data:", data);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch webhook configurations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const webhook = await createWebhookConfig(data);
    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create webhook configuration" },
      { status: 500 }
    );
  }
}
