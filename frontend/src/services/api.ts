import axios from "axios";
import type { ComparisonResult } from "../types/matching";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

function getStoredToken(): string | null {
  const storedToken =
    localStorage.getItem("token") || localStorage.getItem("accessToken");
  if (!storedToken) return null;
  return storedToken.replace(/^Bearer\s+/i, "").trim() || null;
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      error.message = "Session expired. Please log in again.";
    }
    return Promise.reject(error);
  },
);

export async function uploadAndCompare(
  poFile: File,
  invoiceFile: File,
): Promise<ComparisonResult> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Session expired. Please log in again.");
  }

  const formData = new FormData();
  formData.append("po_file", poFile);
  formData.append("invoice_file", invoiceFile);
  const response = await api.post<ComparisonResult>(
    "/api/matching/process-and-compare",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return response.data;
}

export default api;
