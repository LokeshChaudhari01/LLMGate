import useSWR from "swr";
import type {
  AnalyticsResponse, ApiKeySummary, ChartsResponse, RequestSummary,
  StatsResponse, TenantSummary,
} from "@/lib/dashboard/types";

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load data (${response.status})`);
  return response.json() as Promise<T>;
};

export function useStats() {
  return useSWR<StatsResponse>("/api/admin/stats", fetcher, { refreshInterval: 5000 });
}

export function useCharts() {
  return useSWR<ChartsResponse>("/api/admin/charts", fetcher, { refreshInterval: 5000 });
}

export function useRecentRequests() {
  return useSWR<RequestSummary[]>("/api/admin/requests", fetcher, { refreshInterval: 5000 });
}

export function useAnalytics() {
  return useSWR<AnalyticsResponse>("/api/admin/analytics", fetcher, { refreshInterval: 10000 });
}

export function useTenants() {
  return useSWR<TenantSummary[]>("/api/admin/tenants", fetcher);
}

export function useKeys() {
  return useSWR<ApiKeySummary[]>("/api/admin/keys", fetcher);
}
