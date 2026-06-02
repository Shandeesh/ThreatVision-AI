import axios from "axios";
import { io } from "socket.io-client";

const fallbackApiUrl = ["http://localhost", "3001"].join(":");
const isLocal = typeof window !== "undefined" && 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export const API_URL = import.meta.env.VITE_API_URL || (isLocal ? fallbackApiUrl : "");

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

export function createSocket() {
  return io(API_URL, { transports: ["websocket", "polling"] });
}

export type ProviderStatus = "ok" | "unconfigured" | "error" | "skipped";
export type Classification = "safe" | "suspicious" | "malicious" | "unknown";
export type PacketStatus = "allowed" | "blocked" | "flagged";
export type Severity = "Critical" | "High" | "Medium" | "Low";

export interface SourceStatus {
  name: string;
  status: ProviderStatus;
  message: string;
  data?: unknown;
}

export interface ThreatFactor {
  name: string;
  weight: number;
  value: number;
}

export interface GeoData {
  country: string;
  countryCode: string;
  regionName?: string;
  city: string;
  lat: number | null;
  lon: number | null;
  timezone?: string;
  isp: string;
  org?: string;
  as?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
}

export interface ScanDetails {
  isPublic: boolean;
  isPrivate: boolean;
  isReserved: boolean;
  isWhitelisted: boolean;
  isTor: boolean;
  isVpn: boolean;
  isProxy: boolean;
  totalReports: number | null;
  distinctUsers: number | null;
  usageType: string;
  domain?: string;
  hostnames: string[];
  lastReported: string | null;
  isp: string;
  org: string;
  as: string;
  mobile: boolean;
  proxy: boolean;
  hosting: boolean;
  virusTotal?: unknown;
  abuseIpDb?: unknown;
}

export interface ScanResult {
  ip: string;
  score: number | null;
  classification: Classification;
  confidence: number;
  riskLevel: string;
  factors: ThreatFactor[];
  sources: SourceStatus[];
  geoData: GeoData | null;
  country: string;
  countryCode: string;
  city: string;
  isp: string;
  reports: number | null;
  lastReported: string | null;
  threatTypes: string[];
  isBlocked: boolean;
  details: ScanDetails;
  analyzedAt: string;
}

export interface FirewallPolicy {
  autoBlockEnabled: boolean;
  threshold: number;
  durationMinutes: number;
}

export interface BlockedIP {
  ip: string;
  blockedAt: string;
  reason: string;
  country: string;
  score: number | null;
  expiresAt?: string | null;
}

export interface FirewallAction {
  id: string;
  timestamp: string;
  action: string;
  ip: string;
  reason: string;
  success: boolean;
}

export interface FirewallState {
  platform: string;
  writeEnabled: boolean;
  privileged: boolean;
  privilegeMessage: string;
  status: "ready" | "permission-required" | "write-disabled";
  policy: FirewallPolicy;
  blockedIPs: BlockedIP[];
  recentActions: FirewallAction[];
}

export interface Packet {
  id: string;
  source: string;
  destination: string;
  protocol: string;
  port: number;
  size: number;
  timestamp: string;
  isThreat: boolean;
  threatType: string | null;
  country: string;
  status: PacketStatus;
  score: number | null;
  classification: Classification;
}

export interface IdsEvent {
  id: string;
  type: string;
  source: string;
  target: string;
  severity: Severity;
  timestamp: string;
  packetsPerMinute: number;
  country: string;
  status: PacketStatus;
  score: number | null;
  reason: string;
  geoData?: GeoData | null;
}

export interface DashboardData {
  totals: {
    totalThreats: number;
    threatsBlocked: number;
    activeMonitors: number;
    packetsTotal: number;
    bytesTotal: number;
    uptimeSeconds: number;
  };
  threatData: Array<{ name: string; threats: number; blocked: number }>;
  threatTypes: Array<{ name: string; value: number; count: number; color: string }>;
  recentAlerts: IdsEvent[];
  recentPackets: Packet[];
  serviceStartedAt: string;
}

export interface ThreatLocation {
  lat: number | null;
  lon: number | null;
  city: string;
  threats: number;
  country: string;
  code: string;
}

export interface ThreatMapData {
  threatLocations: ThreatLocation[];
  topThreatCountries: ThreatLocation[];
  recentThreats: IdsEvent[];
}

export interface HealthState {
  status: string;
  platform: string;
  apiKeys: {
    abuseIpDb: boolean;
    virusTotal: boolean;
    openAi: boolean;
    openAiModel: boolean;
  };
  capture: {
    tsharkAvailable: boolean;
    interface: string | null;
    activeCaptures: number;
    error: string | null;
  };
  firewall: {
    writeEnabled: boolean;
    platform: string;
    privileged: boolean;
    privilegeMessage: string;
  };
  policy: FirewallPolicy;
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
