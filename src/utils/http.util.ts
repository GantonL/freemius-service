import { Injectable } from "@danet/core";

export interface HttpRequestOptions extends RequestInit {
  query?: Record<string, any>;
  responseType?: "json" | "arrayBuffer" | "text";
}

@Injectable()
export class HttpClient {
  /**
   * Generic request utility wrapping fetch API.
   */
  async request<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const { query, responseType = "json", ...fetchOptions } = options;

    const targetUrl = new URL(url);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          targetUrl.searchParams.append(key, String(value));
        }
      }
    }

    const response = await fetch(targetUrl.toString(), fetchOptions);

    if (!response.ok) {
      let message = response.statusText;
      try {
        const errorBody = await response.json();
        message = errorBody.error?.message || message;
      } catch {
        // Fallback if not JSON
      }
      throw { status: response.status, message };
    }

    if (responseType === "arrayBuffer") {
      return (await response.arrayBuffer()) as unknown as T;
    }
    if (responseType === "text") {
      return (await response.text()) as unknown as T;
    }
    return (await response.json()) as unknown as T;
  }

  async get<T>(url: string, options?: Omit<HttpRequestOptions, "method">): Promise<T> {
    return await this.request<T>(url, { ...options, method: "GET" });
  }

  async post<T>(url: string, options?: Omit<HttpRequestOptions, "method">): Promise<T> {
    return await this.request<T>(url, { ...options, method: "POST" });
  }

  async put<T>(url: string, options?: Omit<HttpRequestOptions, "method">): Promise<T> {
    return await this.request<T>(url, { ...options, method: "PUT" });
  }

  async delete<T>(url: string, options?: Omit<HttpRequestOptions, "method">): Promise<T> {
    return await this.request<T>(url, { ...options, method: "DELETE" });
  }
}
