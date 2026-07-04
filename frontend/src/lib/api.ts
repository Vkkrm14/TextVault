export type TokenPair = {
  access: string;
  refresh: string;
};

export type AuthResponse = {
  access: string;
  refresh: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const API_ROOT = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL.replace(/\/$/, "");

export class APIClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.loadTokens();
  }

  private loadTokens(): void {
    if (typeof window === "undefined") return;
    this.accessToken = localStorage.getItem("access_token");
    this.refreshToken = localStorage.getItem("refresh_token");
  }

  private saveTokens(access: string, refresh: string): void {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
    }
  }

  public clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("username");
    }
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_ROOT}/api/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data: AuthResponse = await response.json();
    this.saveTokens(data.access, data.refresh);
    if (typeof window !== "undefined") {
      localStorage.setItem("username", username);
    }
    return data;
  }

  async register(username: string, password: string): Promise<void> {
    const response = await fetch(`${API_URL}/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.username ? errData.username[0] : "Registration failed";
      throw new Error(errMsg);
    }
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_ROOT}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: this.refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error("Token refresh failed");
    }

    const data = await response.json();
    this.accessToken = data.access;
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", data.access);
    }
    return data.access;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");

    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    let response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.refreshToken) {
      try {
        await this.refreshAccessToken();
        headers.set("Authorization", `Bearer ${this.accessToken}`);
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } catch {
        this.clearTokens();
      }
    }

    return response;
  }

  async get(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint: string, body?: unknown): Promise<Response> {
    return this.request(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put(endpoint: string, body?: unknown): Promise<Response> {
    return this.request(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch(endpoint: string, body?: unknown): Promise<Response> {
    return this.request(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new APIClient();
