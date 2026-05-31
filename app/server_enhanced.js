
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';
import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnvFile(path.join(__dirname, '.env'));

const config = {
  port: Number(process.env.PORT || 3001),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  abuseIpDbKey: process.env.ABUSEIPDB_API_KEY || '',
  virusTotalKey: process.env.VIRUSTOTAL_API_KEY || '',
  openAiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || '',
  tsharkPath: process.env.TSHARK_PATH || 'tshark',
  captureInterface: process.env.CAPTURE_INTERFACE || '',
  enableFirewallWrite: parseBool(process.env.ENABLE_FIREWALL_WRITE),
  autoBlockEnabled: parseBool(process.env.AUTO_BLOCK_ENABLED),
  autoBlockThreshold: clampNumber(Number(process.env.AUTO_BLOCK_THRESHOLD || 85), 1, 100),
  autoBlockDurationMinutes: Math.max(Number(process.env.AUTO_BLOCK_DURATION_MINUTES || 1440), 1),
};

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  config.clientOrigin,
].filter(Boolean);

const checkCorsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  const isAllowed = allowedOrigins.includes(origin) ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
    /\.vercel\.app$/.test(origin) ||
    /\.loca\.lt$/.test(origin) ||
    /\.ngrok-free\.app$/.test(origin) ||
    /\.ngrok\.io$/.test(origin);
  return callback(null, isAllowed);
};

const app = express();
app.use(cors({ origin: checkCorsOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }));
app.use(express.json({ limit: '1mb' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: checkCorsOrigin, methods: ['GET', 'POST'] },
});


const statePath = path.join(__dirname, 'live_state.json');
let state;
let geoIP;
let reputation;
let firewall;
let metrics;
let ids;
let packetCapture;

app.get('/api/health', async (_req, res) => {
  const tshark = await checkCommand(config.tsharkPath, ['-v']);
  const firewallPrivilege = await firewall.checkPrivileges();

  res.json({
    status: 'ok',
    platform: os.platform(),
    apiKeys: {
      abuseIpDb: Boolean(config.abuseIpDbKey),
      virusTotal: Boolean(config.virusTotalKey),
      openAi: Boolean(config.openAiKey),
      openAiModel: Boolean(config.openAiModel),
    },
    capture: {
      tsharkAvailable: tshark.available,
      tsharkPath: config.tsharkPath,
      interface: config.captureInterface || null,
      activeCaptures: packetCapture.activeCaptures.size,
      error: tshark.error || null,
    },
    firewall: {
      writeEnabled: config.enableFirewallWrite,
      platform: os.platform(),
      privileged: firewallPrivilege.privileged,
      privilegeMessage: firewallPrivilege.message,
    },
    policy: state.firewallPolicy,
  });
});

app.post('/api/analyze', async (req, res) => {
  const ip = normalizeIP(req.body?.ip);
  if (!isValidIPv4(ip)) return res.status(400).json({ error: 'Valid IPv4 address required' });

  try {
    const result = await reputation.analyze(ip, { recordHistory: true });
    res.json(result);
    broadcastState();
  } catch (error) {
    res.status(502).json({ error: getErrorMessage(error) });
  }
});

app.get('/api/scan-history', (_req, res) => {
  res.json({ scans: state.scanHistory.slice(0, 25) });
});

app.get('/api/firewall', async (_req, res) => {
  const privilege = await firewall.checkPrivileges();
  res.json({
    platform: os.platform(),
    writeEnabled: config.enableFirewallWrite,
    privileged: privilege.privileged,
    privilegeMessage: privilege.message,
    status: config.enableFirewallWrite && privilege.privileged ? 'ready' : config.enableFirewallWrite ? 'permission-required' : 'write-disabled',
    policy: state.firewallPolicy,
    blockedIPs: state.blockedIPs,
    recentActions: state.firewallActions.slice(0, 20),
  });
});

app.post('/api/firewall/block', async (req, res) => {
  const ip = normalizeIP(req.body?.ip);
  if (!isValidIPv4(ip)) return res.status(400).json({ error: 'Valid IPv4 address required' });

  const result = await firewall.blockIP(ip, req.body?.reason || 'Manual Block');
  if (result.success) broadcastState();
  res.status(result.success ? 200 : 409).json(result);
});

app.post('/api/firewall/unblock', async (req, res) => {
  const ip = normalizeIP(req.body?.ip);
  if (!isValidIPv4(ip)) return res.status(400).json({ error: 'Valid IPv4 address required' });

  const result = await firewall.unblockIP(ip);
  if (result.success) broadcastState();
  res.status(result.success ? 200 : 409).json(result);
});

app.put('/api/firewall/policy', (req, res) => {
  const enabled = Boolean(req.body?.autoBlockEnabled);
  const threshold = clampNumber(Number(req.body?.threshold ?? state.firewallPolicy.threshold), 1, 100);
  const durationMinutes = Math.max(Number(req.body?.durationMinutes ?? state.firewallPolicy.durationMinutes), 1);

  state.firewallPolicy = { autoBlockEnabled: enabled, threshold, durationMinutes };
  saveState();
  broadcastState();
  res.json({ policy: state.firewallPolicy });
});

app.get('/api/dashboard', (_req, res) => {
  res.json(metrics.getDashboard());
});

app.get('/api/threat-map', (_req, res) => {
  res.json(metrics.getThreatMap());
});

app.post('/api/assistant', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Message required' });
  if (!config.openAiKey || !config.openAiModel) {
    return res.status(503).json({
      error: 'OpenAI is not configured. Set OPENAI_API_KEY and OPENAI_MODEL in app/.env, then restart the backend.',
    });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.openAiModel,
        messages: [
          {
            role: 'system',
            content: 'You are a concise defensive cybersecurity assistant for a local live security console. Use only the provided console context when referencing local observations. Do not invent scan results, packets, firewall actions, or live events.',
          },
          { role: 'system', content: JSON.stringify(buildAssistantContext()) },
          { role: 'user', content: message },
        ],
        temperature: 0.2,
      },
      {
        headers: { Authorization: `Bearer ${config.openAiKey}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      },
    );

    const content = response.data?.choices?.[0]?.message?.content || 'No response content returned.';
    res.json({ content, model: config.openAiModel });
  } catch (error) {
    res.status(502).json({ error: getAxiosErrorMessage(error) });
  }
});

io.on('connection', (socket) => {
  socket.emit('stats', metrics.getDashboard());

  socket.on('start-capture', () => packetCapture.start(socket));
  socket.on('stop-capture', () => packetCapture.stop(socket.id));

  socket.on('disconnect', () => {
    packetCapture.stop(socket.id);
  });
});

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseBool(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeIP(value) {
  return String(value || '').trim();
}

function isValidIPv4(ip) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  return ip.split('.').every((part) => Number(part) >= 0 && Number(part) <= 255 && String(Number(part)) === String(part).replace(/^0+(?=\d)/, ''));
}

function ipOctets(ip) {
  return ip.split('.').map(Number);
}

function isPrivateIP(ip) {
  const [a, b] = ipOctets(ip);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127 || (a === 169 && b === 254);
}

function isReservedIP(ip) {
  const [a] = ipOctets(ip);
  return a === 0 || a >= 224;
}

function isPublicIP(ip) {
  return isValidIPv4(ip) && !isPrivateIP(ip) && !isReservedIP(ip);
}

function loadState() {
  const defaults = {
    blockedIPs: [],
    firewallActions: [],
    scanHistory: [],
    alerts: [],
    countryStats: {},
    packetStats: {
      packetsTotal: 0,
      bytesTotal: 0,
      threatsDetected: 0,
      threatsBlocked: 0,
      protocolCounts: {},
      categoryCounts: {},
      hourly: {},
      recentPackets: [],
      startedAt: new Date().toISOString(),
    },
    firewallPolicy: {
      autoBlockEnabled: config.autoBlockEnabled,
      threshold: config.autoBlockThreshold,
      durationMinutes: config.autoBlockDurationMinutes,
    },
  };

  try {
    if (!fs.existsSync(statePath)) return defaults;
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return {
      ...defaults,
      ...parsed,
      packetStats: { ...defaults.packetStats, ...(parsed.packetStats || {}) },
      firewallPolicy: { ...defaults.firewallPolicy, ...(parsed.firewallPolicy || {}) },
    };
  } catch {
    return defaults;
  }
}

function saveState() {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function addFirewallAction(action) {
  state.firewallActions.unshift({ id: makeId('fw'), timestamp: new Date().toISOString(), ...action });
  state.firewallActions = state.firewallActions.slice(0, 100);
  saveState();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${process.hrtime.bigint().toString(36)}`;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function getAxiosErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message || error.response?.data?.error || error.response?.data?.message || error.message;
  }
  return getErrorMessage(error);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      resolve({ code: -1, stdout, stderr: stderr || 'Command timed out' });
    }, options.timeout || 10000);

    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ code: -1, stdout, stderr: error.message });
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

async function checkCommand(command, args) {
  const result = await runCommand(command, args, { timeout: 5000 });
  return { available: result.code === 0, error: result.code === 0 ? null : result.stderr || `Command exited with ${result.code}` };
}

function sourceStatus(name, status, message, data = null) {
  return { name, status, message, data };
}

class GeoIPService {
  constructor() {
    this.cache = new Map();
  }

  async lookup(ip) {
    if (!isPublicIP(ip)) {
      return {
        data: {
          country: isPrivateIP(ip) ? 'Private Network' : 'Reserved Network',
          countryCode: '',
          regionName: '',
          city: '',
          lat: null,
          lon: null,
          timezone: '',
          isp: isPrivateIP(ip) ? 'Local Network' : 'Reserved Address Space',
          org: '',
          as: '',
          mobile: false,
          proxy: false,
          hosting: false,
        },
        source: sourceStatus('GeoIP', 'ok', 'Local address classification'),
      };
    }

    if (this.cache.has(ip)) return this.cache.get(ip);

    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        params: { fields: 'status,message,country,countryCode,regionName,city,lat,lon,timezone,isp,org,as,mobile,proxy,hosting' },
        timeout: 5000,
      });

      if (response.data?.status !== 'success') {
        const result = { data: null, source: sourceStatus('GeoIP', 'error', response.data?.message || 'GeoIP lookup failed') };
        this.cache.set(ip, result);
        return result;
      }

      const result = { data: response.data, source: sourceStatus('GeoIP', 'ok', 'GeoIP lookup completed') };
      this.cache.set(ip, result);
      return result;
    } catch (error) {
      const result = { data: null, source: sourceStatus('GeoIP', 'error', getAxiosErrorMessage(error)) };
      this.cache.set(ip, result);
      return result;
    }
  }
}

class ReputationService {
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = 10 * 60 * 1000;
  }

  async analyze(ip, options = {}) {
    const cached = this.cache.get(ip);
    if (cached && Date.now() - cached.createdAt < this.cacheTtlMs) {
      if (options.recordHistory) this.recordScan(cached.result);
      return cached.result;
    }

    const sources = [];
    const local = this.getLocalEvidence(ip);
    sources.push(local.source);

    const geo = await geoIP.lookup(ip);
    sources.push(geo.source);

    const [abuse, vt] = await Promise.all([this.lookupAbuseIPDB(ip), this.lookupVirusTotal(ip)]);
    sources.push(abuse.source, vt.source);

    const factors = [];
    if (local.score !== null) factors.push({ name: local.label, weight: 20, value: local.score });
    if (abuse.data) factors.push({ name: 'AbuseIPDB Confidence', weight: 40, value: clampNumber(abuse.data.abuseConfidenceScore, 0, 100) });
    if (vt.data) factors.push({ name: 'VirusTotal Detections', weight: 30, value: vt.data.score });

    const reportCount = abuse.data?.totalReports ?? 0;
    if (abuse.data) factors.push({ name: 'Abuse Report Volume', weight: 10, value: Math.min(reportCount * 2, 100) });

    const anonymityScore = (geo.data?.proxy ? 50 : 0) + (geo.data?.hosting ? 25 : 0);
    if (geo.data && isPublicIP(ip)) factors.push({ name: 'Proxy/Hosting Signals', weight: 10, value: Math.min(anonymityScore, 100) });

    const hasProviderEvidence = Boolean(abuse.data || vt.data);
    let score = null;
    let classification = 'unknown';
    let riskLevel = 'Unknown';
    let confidence = 0;

    if (!isPublicIP(ip)) {
      score = 0;
      classification = 'safe';
      riskLevel = 'Minimal';
      confidence = 100;
    } else if (factors.length > 0 && (hasProviderEvidence || local.score === 100)) {
      const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
      score = Math.round(factors.reduce((sum, factor) => sum + factor.value * factor.weight, 0) / totalWeight);
      classification = score >= 71 ? 'malicious' : score >= 31 ? 'suspicious' : 'safe';
      riskLevel = score >= 85 ? 'Critical' : score >= 71 ? 'High' : score >= 51 ? 'Medium' : score >= 31 ? 'Low' : 'Minimal';
      confidence = Math.round(Math.min(100, 30 + totalWeight + (hasProviderEvidence ? 20 : 0)));
    }

    const details = {
      isPublic: isPublicIP(ip),
      isPrivate: isPrivateIP(ip),
      isReserved: isReservedIP(ip),
      isWhitelisted: Boolean(abuse.data?.isWhitelisted),
      isTor: false,
      isVpn: false,
      isProxy: Boolean(geo.data?.proxy),
      totalReports: abuse.data?.totalReports ?? null,
      distinctUsers: abuse.data?.numDistinctUsers ?? null,
      usageType: abuse.data?.usageType || (geo.data?.hosting ? 'Hosting' : geo.data ? 'ISP' : ''),
      domain: abuse.data?.domain || '',
      hostnames: abuse.data?.hostnames || [],
      lastReported: abuse.data?.lastReportedAt || null,
      isp: abuse.data?.isp || geo.data?.isp || '',
      org: geo.data?.org || vt.data?.asOwner || '',
      as: geo.data?.as || '',
      mobile: Boolean(geo.data?.mobile),
      proxy: Boolean(geo.data?.proxy),
      hosting: Boolean(geo.data?.hosting),
      virusTotal: vt.data,
      abuseIpDb: abuse.data,
    };

    const result = {
      ip,
      score,
      classification,
      confidence,
      riskLevel,
      factors,
      sources,
      geoData: geo.data,
      country: geo.data?.country || '',
      countryCode: geo.data?.countryCode || '',
      city: geo.data?.city || '',
      isp: details.isp,
      reports: details.totalReports,
      lastReported: details.lastReported,
      threatTypes: buildThreatTypes(abuse.data, vt.data),
      isBlocked: firewall.isBlocked(ip),
      details,
      analyzedAt: new Date().toISOString(),
    };

    this.cache.set(ip, { createdAt: Date.now(), result });
    if (options.recordHistory) this.recordScan(result);
    return result;
  }

  getLocalEvidence(ip) {
    if (firewall.isBlocked(ip)) return { score: 100, label: 'Local Firewall Blocklist', source: sourceStatus('Local Evidence', 'ok', 'IP is currently blocked locally') };
    if (isPrivateIP(ip)) return { score: 0, label: 'Private Address Range', source: sourceStatus('Local Evidence', 'ok', 'Private/local IPv4 range') };
    if (isReservedIP(ip)) return { score: 0, label: 'Reserved Address Range', source: sourceStatus('Local Evidence', 'ok', 'Reserved/non-routable IPv4 range') };
    return { score: null, label: 'Local Evidence', source: sourceStatus('Local Evidence', 'ok', 'No local blocklist or private-range match') };
  }

  async lookupAbuseIPDB(ip) {
    if (!config.abuseIpDbKey) return { data: null, source: sourceStatus('AbuseIPDB', 'unconfigured', 'ABUSEIPDB_API_KEY is not configured') };
    if (!isPublicIP(ip)) return { data: null, source: sourceStatus('AbuseIPDB', 'skipped', 'Private/reserved IPs are not submitted') };

    try {
      const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
        params: { ipAddress: ip, maxAgeInDays: 90, verbose: true },
        headers: { Key: config.abuseIpDbKey, Accept: 'application/json' },
        timeout: 10000,
      });
      return { data: response.data?.data || null, source: sourceStatus('AbuseIPDB', 'ok', 'Reputation lookup completed') };
    } catch (error) {
      return { data: null, source: sourceStatus('AbuseIPDB', 'error', getAxiosErrorMessage(error)) };
    }
  }

  async lookupVirusTotal(ip) {
    if (!config.virusTotalKey) return { data: null, source: sourceStatus('VirusTotal', 'unconfigured', 'VIRUSTOTAL_API_KEY is not configured') };
    if (!isPublicIP(ip)) return { data: null, source: sourceStatus('VirusTotal', 'skipped', 'Private/reserved IPs are not submitted') };

    try {
      const response = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
        headers: { 'x-apikey': config.virusTotalKey },
        timeout: 10000,
      });
      const attrs = response.data?.data?.attributes || {};
      const stats = attrs.last_analysis_stats || {};
      const score = Math.min((Number(stats.malicious || 0) * 20) + (Number(stats.suspicious || 0) * 10), 100);
      return {
        data: {
          score,
          malicious: Number(stats.malicious || 0),
          suspicious: Number(stats.suspicious || 0),
          harmless: Number(stats.harmless || 0),
          undetected: Number(stats.undetected || 0),
          reputation: attrs.reputation ?? null,
          tags: attrs.tags || [],
          asOwner: attrs.as_owner || '',
          country: attrs.country || '',
          network: attrs.network || '',
          lastModificationDate: attrs.last_modification_date ? new Date(attrs.last_modification_date * 1000).toISOString() : null,
        },
        source: sourceStatus('VirusTotal', 'ok', 'Reputation lookup completed'),
      };
    } catch (error) {
      return { data: null, source: sourceStatus('VirusTotal', 'error', getAxiosErrorMessage(error)) };
    }
  }

  recordScan(result) {
    state.scanHistory = [result, ...state.scanHistory.filter((scan) => scan.ip !== result.ip)].slice(0, 50);
    saveState();
  }
}

function buildThreatTypes(abuse, vt) {
  const types = new Set();
  for (const report of abuse?.reports || []) {
    for (const category of report.categories || []) types.add(`Abuse category ${category}`);
  }
  for (const tag of vt?.tags || []) types.add(tag);
  if (vt?.malicious > 0) types.add('VirusTotal malicious detections');
  if (vt?.suspicious > 0) types.add('VirusTotal suspicious detections');
  return [...types].slice(0, 8);
}

class FirewallService {
  isBlocked(ip) {
    return state.blockedIPs.some((item) => item.ip === ip);
  }

  async checkPrivileges() {
    if (!config.enableFirewallWrite) return { privileged: false, message: 'Firewall writes are disabled by ENABLE_FIREWALL_WRITE=false' };
    if (os.platform() === 'win32') {
      const result = await runCommand('net', ['session'], { timeout: 5000 });
      return { privileged: result.code === 0, message: result.code === 0 ? 'Administrator privileges available' : 'Run backend as Administrator for firewall writes' };
    }
    if (os.platform() === 'linux') return { privileged: typeof process.getuid === 'function' && process.getuid() === 0, message: 'Linux firewall writes require root' };
    return { privileged: false, message: 'Firewall writes are only implemented for Windows and Linux' };
  }

  async blockIP(ip, reason) {
    if (!config.enableFirewallWrite) {
      return { success: false, code: 'firewall_write_disabled', message: 'Set ENABLE_FIREWALL_WRITE=true and restart the backend to allow OS firewall changes.' };
    }

    const privilege = await this.checkPrivileges();
    if (!privilege.privileged) return { success: false, code: 'permission_required', message: privilege.message };

    if (this.isBlocked(ip)) return { success: true, message: `${ip} is already blocked`, blockedIPs: state.blockedIPs };

    const platform = os.platform();
    const commands = this.blockCommands(platform, ip);
    if (!commands.length) return { success: false, code: 'unsupported_platform', message: `Firewall writes are not implemented for ${platform}` };

    for (const command of commands) {
      const result = await runCommand(command.command, command.args, { timeout: 15000 });
      if (result.code !== 0) return { success: false, code: 'firewall_command_failed', message: result.stderr || result.stdout || `Command exited with ${result.code}` };
    }

    const analysis = await reputation.analyze(ip, { recordHistory: false });
    const entry = {
      ip,
      blockedAt: new Date().toISOString(),
      reason,
      country: analysis.countryCode || analysis.country || '',
      score: analysis.score,
      expiresAt: state.firewallPolicy.durationMinutes > 0 ? new Date(Date.now() + state.firewallPolicy.durationMinutes * 60000).toISOString() : null,
    };
    state.blockedIPs.unshift(entry);
    addFirewallAction({ action: 'Blocked', ip, reason, success: true });
    saveState();
    return { success: true, message: `${ip} blocked in system firewall`, blockedIP: entry, blockedIPs: state.blockedIPs };
  }

  async unblockIP(ip) {
    if (!config.enableFirewallWrite) {
      return { success: false, code: 'firewall_write_disabled', message: 'Set ENABLE_FIREWALL_WRITE=true and restart the backend to allow OS firewall changes.' };
    }

    const privilege = await this.checkPrivileges();
    if (!privilege.privileged) return { success: false, code: 'permission_required', message: privilege.message };

    const platform = os.platform();
    const commands = this.unblockCommands(platform, ip);
    if (!commands.length) return { success: false, code: 'unsupported_platform', message: `Firewall writes are not implemented for ${platform}` };

    for (const command of commands) {
      await runCommand(command.command, command.args, { timeout: 15000 });
    }

    state.blockedIPs = state.blockedIPs.filter((item) => item.ip !== ip);
    addFirewallAction({ action: 'Unblocked', ip, reason: 'Manual Unblock', success: true });
    saveState();
    return { success: true, message: `${ip} unblocked`, blockedIPs: state.blockedIPs };
  }

  blockCommands(platform, ip) {
    if (platform === 'win32') {
      return [
        { command: 'netsh', args: ['advfirewall', 'firewall', 'add', 'rule', `name=ThreatVision_Block_${ip}_In`, 'dir=in', 'action=block', `remoteip=${ip}`] },
        { command: 'netsh', args: ['advfirewall', 'firewall', 'add', 'rule', `name=ThreatVision_Block_${ip}_Out`, 'dir=out', 'action=block', `remoteip=${ip}`] },
      ];
    }
    if (platform === 'linux') {
      return [
        { command: 'iptables', args: ['-A', 'INPUT', '-s', ip, '-j', 'DROP'] },
        { command: 'iptables', args: ['-A', 'OUTPUT', '-d', ip, '-j', 'DROP'] },
      ];
    }
    return [];
  }

  unblockCommands(platform, ip) {
    if (platform === 'win32') {
      return [
        { command: 'netsh', args: ['advfirewall', 'firewall', 'delete', 'rule', `name=ThreatVision_Block_${ip}_In`] },
        { command: 'netsh', args: ['advfirewall', 'firewall', 'delete', 'rule', `name=ThreatVision_Block_${ip}_Out`] },
      ];
    }
    if (platform === 'linux') {
      return [
        { command: 'iptables', args: ['-D', 'INPUT', '-s', ip, '-j', 'DROP'] },
        { command: 'iptables', args: ['-D', 'OUTPUT', '-d', ip, '-j', 'DROP'] },
      ];
    }
    return [];
  }
}

class PacketCaptureService {
  constructor() {
    this.activeCaptures = new Map();
  }

  async start(socket) {
    if (this.activeCaptures.has(socket.id)) return;

    const tsharkAvailable = await checkCommand(config.tsharkPath, ['-v']);
    if (!tsharkAvailable.available) {
      if (os.platform() === 'win32') {
        this.startWindowsConnectionMonitor(socket, tsharkAvailable.error);
        return;
      }
      socket.emit('capture-error', { message: `Unable to start packet capture: ${tsharkAvailable.error}` });
      socket.emit('capture-status', { running: false });
      return;
    }

    const args = ['-l'];
    if (config.captureInterface) args.push('-i', config.captureInterface);
    args.push(
      '-T', 'fields',
      '-E', 'separator=\t',
      '-e', 'frame.time_epoch',
      '-e', 'ip.src',
      '-e', 'ip.dst',
      '-e', '_ws.col.Protocol',
      '-e', 'tcp.srcport',
      '-e', 'tcp.dstport',
      '-e', 'udp.srcport',
      '-e', 'udp.dstport',
      '-e', 'frame.len',
    );

    const tshark = spawn(config.tsharkPath, args, { shell: false, windowsHide: true });
    this.activeCaptures.set(socket.id, tshark);
    metrics.setActiveCaptures(this.activeCaptures.size);
    socket.emit('capture-status', { running: true, interface: config.captureInterface || null });
    broadcastStats();

    let buffer = '';
    tshark.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) void this.handleLine(socket, line);
      }
    });

    tshark.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) socket.emit('capture-error', { message });
    });

    tshark.on('error', (error) => {
      socket.emit('capture-error', { message: `Unable to start tshark: ${error.message}` });
      this.stop(socket.id);
    });

    tshark.on('close', (code) => {
      socket.emit('capture-status', { running: false, code });
      this.activeCaptures.delete(socket.id);
      metrics.setActiveCaptures(this.activeCaptures.size);
      broadcastStats();
    });
  }

  startWindowsConnectionMonitor(socket, tsharkError) {
    const seen = new Map();
    const monitor = {
      kill: () => {
        clearInterval(monitor.interval);
        monitor.killed = true;
      },
      killed: false,
      interval: null,
    };

    this.activeCaptures.set(socket.id, monitor);
    metrics.setActiveCaptures(this.activeCaptures.size);
    socket.emit('capture-status', { running: true, interface: 'Windows connections fallback' });
    socket.emit('capture-error', {
      severity: 'warning',
      message: `tshark is unavailable (${tsharkError}). Showing active Windows TCP connections instead of raw packets.`,
    });
    broadcastStats();

    const poll = async () => {
      if (monitor.killed) return;
      try {
        const command = [
          "Get-NetTCPConnection -State Established",
          "Where-Object { $_.RemoteAddress -match '^\\d{1,3}(\\.\\d{1,3}){3}$' -and $_.RemoteAddress -notin @('0.0.0.0','127.0.0.1') }",
          "Select-Object LocalAddress,RemoteAddress,RemotePort,State",
          "ConvertTo-Json -Depth 3",
        ].join(' | ');
        const result = await runCommand('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], { timeout: 6000 });
        if (result.code !== 0) {
          socket.emit('capture-error', { message: result.stderr || 'Unable to read Windows TCP connections' });
          return;
        }

        const parsed = result.stdout.trim() ? JSON.parse(result.stdout) : [];
        const connections = Array.isArray(parsed) ? parsed : [parsed];
        const now = Date.now();

        for (const connection of connections) {
          const source = String(connection.RemoteAddress || '').trim();
          const destination = String(connection.LocalAddress || '').trim();
          const port = Number(connection.RemotePort || 0);
          if (!isValidIPv4(source) || !isValidIPv4(destination)) continue;

          const key = `${source}-${destination}-${port}`;
          const lastSeen = seen.get(key) || 0;
          if (now - lastSeen < 8000) continue;
          seen.set(key, now);

          const line = `${now / 1000}\t${source}\t${destination}\tTCP\t${port}\t${port}\t\t\t64`;
          void this.handleLine(socket, line);
        }

        for (const [key, timestamp] of seen) {
          if (now - timestamp > 30000) seen.delete(key);
        }
      } catch (error) {
        socket.emit('capture-error', { message: `Windows connection monitor error: ${getErrorMessage(error)}` });
      }
    };

    monitor.interval = setInterval(poll, 2500);
    void poll();
  }

  async handleLine(socket, line) {
    const fields = line.split('\t');
    const [timeEpoch, src, dst, protocol, tcpSrc, tcpDst, udpSrc, udpDst, length] = fields;
    const source = firstValue(src);
    const destination = firstValue(dst);
    if (!isValidIPv4(source) && !isValidIPv4(destination)) return;

    const sourceIP = isValidIPv4(source) ? source : 'Unknown';
    const destinationIP = isValidIPv4(destination) ? destination : 'Unknown';
    const port = Number(firstValue(tcpDst) || firstValue(udpDst) || firstValue(tcpSrc) || firstValue(udpSrc) || 0);
    const size = Number(firstValue(length) || 0);
    const analysis = isValidIPv4(sourceIP) ? await reputation.analyze(sourceIP, { recordHistory: false }) : null;
    const score = analysis?.score;
    const classification = analysis?.classification || 'unknown';
    const isThreat = classification === 'malicious' || classification === 'suspicious' || firewall.isBlocked(sourceIP);
    const status = firewall.isBlocked(sourceIP) || firewall.isBlocked(destinationIP) ? 'blocked' : isThreat ? 'flagged' : 'allowed';
    const threatType = deriveThreatType(port, classification, analysis?.threatTypes || []);

    const packet = {
      id: makeId('pkt'),
      source: sourceIP,
      destination: destinationIP,
      protocol: firstValue(protocol) || 'Unknown',
      port: Number.isFinite(port) ? port : 0,
      size: Number.isFinite(size) ? size : 0,
      timestamp: timeEpoch ? new Date(Number(timeEpoch) * 1000).toISOString() : new Date().toISOString(),
      isThreat,
      threatType: isThreat ? threatType : null,
      country: analysis?.countryCode || analysis?.country || '',
      status,
      score,
      classification,
    };

    metrics.recordPacket(packet, analysis);
    socket.emit('packet', packet);
    io.emit('stats', metrics.getDashboard());

    const event = ids.inspect(packet, analysis);
    if (event) {
      metrics.recordAlert(event);
      io.emit('ids-event', event);
      broadcastStats();

      if (state.firewallPolicy.autoBlockEnabled && typeof packet.score === 'number' && packet.score >= state.firewallPolicy.threshold && status !== 'blocked') {
        const result = await firewall.blockIP(packet.source, `Auto block: ${event.type}`);
        io.emit('firewall-action', result);
      }
    }
  }

  stop(socketId) {
    const capture = this.activeCaptures.get(socketId);
    if (!capture) return;
    capture.kill();
    this.activeCaptures.delete(socketId);
    metrics.setActiveCaptures(this.activeCaptures.size);
    io.to(socketId).emit('capture-status', { running: false });
    broadcastStats();
  }
}

function firstValue(value) {
  return String(value || '').split(',')[0].trim();
}

function deriveThreatType(port, classification, providerTypes) {
  if (providerTypes.length) return providerTypes[0];
  const portMap = { 22: 'SSH activity', 3389: 'RDP activity', 445: 'SMB activity', 3306: 'Database activity', 53: 'DNS activity' };
  if (portMap[port]) return portMap[port];
  return classification === 'malicious' ? 'Known malicious source' : 'Suspicious source';
}

class IDSService {
  constructor() {
    this.windowMs = 60000;
    this.sourceWindows = new Map();
  }

  inspect(packet, analysis) {
    if (!isValidIPv4(packet.source)) return null;
    const now = Date.now();
    const entry = this.sourceWindows.get(packet.source) || { hits: [], ports: new Set() };
    entry.hits = entry.hits.filter((hit) => now - hit.timestamp < this.windowMs);
    entry.hits.push({ timestamp: now, port: packet.port });
    if (packet.port) entry.ports.add(packet.port);
    this.sourceWindows.set(packet.source, entry);

    let type = null;
    let severity = 'Low';
    let reason = '';

    if (packet.status === 'blocked') {
      type = 'Blocked packet';
      severity = 'High';
      reason = 'Packet matched the local firewall blocklist';
    } else if (packet.classification === 'malicious') {
      type = packet.threatType || 'Known malicious source';
      severity = packet.score >= 85 ? 'Critical' : 'High';
      reason = 'Reputation providers classified the source as malicious';
    } else if (packet.classification === 'suspicious') {
      type = packet.threatType || 'Suspicious source';
      severity = 'Medium';
      reason = 'Reputation providers classified the source as suspicious';
    } else if (entry.ports.size >= 10) {
      type = 'Port scan behavior';
      severity = 'Medium';
      reason = `${entry.ports.size} destination ports observed in the last minute`;
    } else if (entry.hits.length >= 100) {
      type = 'High packet rate';
      severity = 'Medium';
      reason = `${entry.hits.length} packets observed from this source in the last minute`;
    }

    if (!type) return null;

    return {
      id: makeId('ids'),
      type,
      source: packet.source,
      target: `${packet.destination}${packet.port ? `:${packet.port}` : ''}`,
      severity,
      timestamp: new Date().toISOString(),
      packetsPerMinute: entry.hits.length,
      country: packet.country || '',
      status: packet.status,
      score: packet.score,
      reason,
      geoData: analysis?.geoData || null,
    };
  }
}

class MetricsService {
  constructor() {
    this.activeCaptures = 0;
  }

  setActiveCaptures(count) {
    this.activeCaptures = count;
  }

  recordPacket(packet, analysis) {
    state.packetStats.packetsTotal += 1;
    state.packetStats.bytesTotal += packet.size || 0;
    state.packetStats.protocolCounts[packet.protocol] = (state.packetStats.protocolCounts[packet.protocol] || 0) + 1;
    state.packetStats.recentPackets.unshift(packet);
    state.packetStats.recentPackets = state.packetStats.recentPackets.slice(0, 100);

    const bucket = hourBucket(packet.timestamp);
    state.packetStats.hourly[bucket] = state.packetStats.hourly[bucket] || { name: bucket.slice(11, 16), threats: 0, blocked: 0 };
    if (packet.isThreat) {
      state.packetStats.threatsDetected += 1;
      state.packetStats.hourly[bucket].threats += 1;
    }
    if (packet.status === 'blocked') {
      state.packetStats.threatsBlocked += 1;
      state.packetStats.hourly[bucket].blocked += 1;
    }

    if (packet.isThreat) {
      const category = packet.threatType || 'Suspicious Activity';
      state.packetStats.categoryCounts[category] = (state.packetStats.categoryCounts[category] || 0) + 1;
      const geo = analysis?.geoData;
      const key = geo?.countryCode || packet.country || 'Unknown';
      state.countryStats[key] = state.countryStats[key] || {
        country: geo?.country || packet.country || 'Unknown',
        code: geo?.countryCode || packet.country || '',
        city: geo?.city || '',
        lat: geo?.lat ?? null,
        lon: geo?.lon ?? null,
        threats: 0,
      };
      state.countryStats[key].threats += 1;
    }

    saveState();
  }

  recordAlert(event) {
    state.alerts.unshift(event);
    state.alerts = state.alerts.slice(0, 100);
    saveState();
  }

  getDashboard() {
    return {
      totals: {
        totalThreats: state.packetStats.threatsDetected,
        threatsBlocked: state.packetStats.threatsBlocked,
        activeMonitors: this.activeCaptures,
        packetsTotal: state.packetStats.packetsTotal,
        bytesTotal: state.packetStats.bytesTotal,
        uptimeSeconds: Math.floor(process.uptime()),
      },
      threatData: last24HourBuckets(),
      threatTypes: categoryDistribution(),
      recentAlerts: state.alerts.slice(0, 10),
      recentPackets: state.packetStats.recentPackets.slice(0, 20),
      serviceStartedAt: state.packetStats.startedAt,
    };
  }

  getThreatMap() {
    const locations = Object.values(state.countryStats)
      .filter((item) => typeof item.lat === 'number' && typeof item.lon === 'number')
      .sort((a, b) => b.threats - a.threats);

    return {
      threatLocations: locations,
      topThreatCountries: Object.values(state.countryStats).sort((a, b) => b.threats - a.threats).slice(0, 10),
      recentThreats: state.alerts.slice(0, 10),
    };
  }
}

function hourBucket(timestamp) {
  const date = new Date(timestamp);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

function last24HourBuckets() {
  const buckets = [];
  for (let i = 23; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(date.getHours() - i, 0, 0, 0);
    const key = date.toISOString();
    const existing = state.packetStats.hourly[key];
    buckets.push(existing || { name: key.slice(11, 16), threats: 0, blocked: 0 });
  }
  return buckets;
}

function categoryDistribution() {
  const entries = Object.entries(state.packetStats.categoryCounts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const colors = ['#ef4444', '#f59e0b', '#06b6d4', '#22c55e', '#64748b'];
  if (!total) return [];
  return entries.slice(0, 5).map(([name, count], index) => ({ name, value: Math.round((count / total) * 100), count, color: colors[index] || '#64748b' }));
}

function broadcastStats() {
  io.emit('stats', metrics.getDashboard());
}

function broadcastState() {
  io.emit('stats', metrics.getDashboard());
  io.emit('firewall-state', {
    policy: state.firewallPolicy,
    blockedIPs: state.blockedIPs,
    recentActions: state.firewallActions.slice(0, 20),
  });
}

function buildAssistantContext() {
  return {
    health: {
      apiKeys: {
        abuseIpDb: Boolean(config.abuseIpDbKey),
        virusTotal: Boolean(config.virusTotalKey),
        openAi: Boolean(config.openAiKey),
        openAiModel: Boolean(config.openAiModel),
      },
      firewallWriteEnabled: config.enableFirewallWrite,
      captureInterface: config.captureInterface || null,
    },
    dashboard: metrics.getDashboard(),
    firewall: {
      policy: state.firewallPolicy,
      blockedIPs: state.blockedIPs.slice(0, 20),
      recentActions: state.firewallActions.slice(0, 10),
    },
    recentScans: state.scanHistory.slice(0, 10),
  };
}

state = loadState();
geoIP = new GeoIPService();
reputation = new ReputationService();
firewall = new FirewallService();
metrics = new MetricsService();
ids = new IDSService();
packetCapture = new PacketCaptureService();

httpServer.listen(config.port, () => {
  console.log(`ThreatVision live backend listening on port ${config.port}`);
  console.log(`Allowed client origin: ${config.clientOrigin}`);
});
