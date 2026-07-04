import { useCallback, useState, useEffect } from "react";

import { apiClient } from "../lib/api";


export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  username: string | null;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    username: null,
  });

  useEffect(() => {
    setState({
      isAuthenticated: apiClient.isAuthenticated(),
      isLoading: false,
      error: null,
      username: localStorage.getItem("username"),
    });
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setState({ isAuthenticated: false, isLoading: true, error: null, username: null });
    try {
      await apiClient.login(username, password);
      setState({ isAuthenticated: true, isLoading: false, error: null, username });
      return { success: true };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Login failed";
      setState({
        isAuthenticated: false,
        isLoading: false,
        error: errMsg,
        username: null,
      });
      return { success: false, error: errMsg };
    }
  }, []);

  const register = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setState({ isAuthenticated: false, isLoading: true, error: null, username: null });
    try {
      await apiClient.register(username, password);
      // Auto login after registration
      await apiClient.login(username, password);
      setState({ isAuthenticated: true, isLoading: false, error: null, username });
      return { success: true };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Registration failed";
      setState({
        isAuthenticated: false,
        isLoading: false,
        error: errMsg,
        username: null,
      });
      return { success: false, error: errMsg };
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.clearTokens();
    setState({ isAuthenticated: false, isLoading: false, error: null, username: null });
  }, []);

  return { ...state, login, register, logout };
}
