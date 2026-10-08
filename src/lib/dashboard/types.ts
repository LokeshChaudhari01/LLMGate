export interface TenantSummary {
  id: string;
  name: string;
  budgetUsd: string;
  isActive: boolean;
  createdAt: string;
  keyCount: number;
}

export interface ApiKeySummary {
  id: string;
  tenantId: string;
  tenantName: string | null;
  description: string | null;
  keyHash: string;
  isActive: boolean;
  createdAt: string;
}

export interface StatsResponse {
  totalRequests: number;
  totalCost: number;
  cacheHitRate: number;
  failoverRate: number;
}

export interface ChartPoint {
  hour: string;
  count: number;
  avgMs: number;
}

export interface ChartsResponse {
  requestVolume: Pick<ChartPoint, "hour" | "count">[];
  latency: Pick<ChartPoint, "hour" | "avgMs">[];
}

export interface RequestSummary {
  id: string;
  time: string;
  tenantName: string | null;
  provider: string;
  model: string;
  queryType: string | null;
  promptTokens: number;
  completionTokens: number;
  costUsd: string;
  status: string;
  latencyMs: number;
}

export interface ProviderSummary {
  provider: string;
  requests: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
}

export interface ModelSummary {
  model: string;
  requests: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
}

export interface QueryTypeSummary {
  queryType: string;
  requests: number;
  totalCost: number;
  successRate: number;
}

export interface AnalyticsResponse {
  byProvider: ProviderSummary[];
  byModel: ModelSummary[];
  byQueryType: QueryTypeSummary[];
  complexityBuckets: { bucket: string; count: number }[];
  routingReasons: { reason: string; count: number }[];
}
