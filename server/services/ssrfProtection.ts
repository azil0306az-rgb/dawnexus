import dns from 'node:dns/promises';
import { URL } from 'node:url';

/**
 * Validates whether an IP address belongs to private, loopback, link-local,
 * or cloud metadata IP ranges.
 */
export function isPrivateIp(ip: string): boolean {
  // IPv4 checks
  if (ip === '0.0.0.0' || ip === '255.255.255.255') return true;
  if (/^127\./.test(ip)) return true; // 127.0.0.0/8
  if (/^10\./.test(ip)) return true; // 10.0.0.0/8
  if (/^192\.168\./.test(ip)) return true; // 192.168.0.0/16
  if (/^169\.254\./.test(ip)) return true; // 169.254.0.0/16 (Link-local & AWS/GCP/Azure metadata)
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true; // 100.64.0.0/10

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  const m172 = ip.match(/^172\.(\d+)\./);
  if (m172) {
    const octet = parseInt(m172[1], 10);
    if (octet >= 16 && octet <= 31) return true;
  }

  // IPv6 checks
  const lower = ip.toLowerCase();
  if (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fe80:') || // link-local
    lower.startsWith('fc00:') || // unique local
    lower.startsWith('fd00:') || // unique local
    lower.startsWith('::ffff:127.') || // IPv4 mapped
    lower.startsWith('::ffff:10.') ||
    lower.startsWith('::ffff:192.168.') ||
    lower.startsWith('::ffff:169.254.')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates target URL against SSRF vulnerabilities before any server-side fetch or screenshot.
 * Enforces http/https, blocks credentials, checks reserved domains and resolves DNS to private IPs.
 */
export async function validateSsrfSafeUrl(urlStr: string): Promise<{
  safe: boolean;
  normalizedUrl?: string;
  error?: string;
}> {
  if (!urlStr || typeof urlStr !== 'string') {
    return { safe: false, error: 'Destination URL is required.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr.trim());
  } catch {
    return { safe: false, error: 'Malformed URL format. Must be a valid absolute HTTP or HTTPS URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, error: `Protocol "${parsed.protocol}" is forbidden. Only HTTP and HTTPS are permitted.` };
  }

  if (parsed.username || parsed.password) {
    return { safe: false, error: 'URLs with embedded user credentials are prohibited for security.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block obvious dangerous hostnames
  const forbiddenHostnames = [
    'localhost',
    'metadata.google.internal',
    'instance-data',
    'metadata',
    '169.254.169.254'
  ];

  if (
    forbiddenHostnames.includes(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.lan')
  ) {
    return { safe: false, error: `Access to hostname "${hostname}" is blocked (internal/restricted domain).` };
  }

  // Check if hostname itself is directly a private IP literal
  if (isPrivateIp(hostname)) {
    return { safe: false, error: `Access to IP address "${hostname}" is prohibited (private or link-local network).` };
  }

  // Resolve hostname via DNS to verify target IP is not private/reserved
  try {
    const lookupResult = await dns.lookup(hostname, { all: true });
    for (const record of lookupResult) {
      if (isPrivateIp(record.address)) {
        return {
          safe: false,
          error: `Access to "${hostname}" (${record.address}) is blocked. Resolved destination is a private network address.`
        };
      }
    }
  } catch (dnsErr: any) {
    return {
      safe: false,
      error: `Unable to resolve domain "${hostname}": ${dnsErr.message || 'DNS resolution failed.'}`
    };
  }

  return { safe: true, normalizedUrl: parsed.href };
}

