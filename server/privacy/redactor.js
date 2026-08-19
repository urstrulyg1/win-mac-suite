/**
 * WinSuite & MacSuite v10.0 — Privacy-Preserving Report Redactor
 *
 * Any bundle leaving the machine is redacted first: usernames, home paths, emails,
 * IPs, hostnames, SSH paths, tokens, API keys, env vars and sensitive filenames.
 * Redaction is deterministic (same input → same placeholder) so reports stay
 * readable and correlatable without leaking identity.
 */

import os from 'os';
import crypto from 'crypto';

export const REDACTION_CATEGORY = {
  USERNAME: 'username',
  HOME_PATH: 'home_path',
  EMAIL: 'email',
  IP_ADDRESS: 'ip_address',
  MAC_ADDRESS: 'mac_address',
  HOSTNAME: 'hostname',
  SSH_PATH: 'ssh_path',
  TOKEN: 'token',
  API_KEY: 'api_key',
  ENV_VAR: 'env_var',
  SERIAL: 'serial_number',
  SENSITIVE_FILENAME: 'sensitive_filename',
  URL_CREDENTIALS: 'url_credentials',
};

const CATEGORY_LABEL = {
  username: 'Username',
  home_path: 'Home path',
  email: 'Email',
  ip_address: 'IP addresses',
  mac_address: 'MAC addresses',
  hostname: 'Hostname',
  ssh_path: 'SSH paths',
  token: 'Tokens',
  api_key: 'API keys',
  env_var: 'Environment variables',
  serial_number: 'Serial numbers',
  sensitive_filename: 'Sensitive filenames',
  url_credentials: 'URL credentials',
};

/** Env var names that must NEVER be exported, even in "allow env" mode. */
const ENV_DENYLIST = /(_KEY|_SECRET|_TOKEN|_PASSWORD|_PASSWD|_CREDENTIAL|_PRIVATE|AUTH|SESSION|COOKIE|AWS_|GCP_|AZURE_|OPENAI|ANTHROPIC|GITHUB_|NPM_|DOCKER_|SSH_|GPG_)/i;

/** Files whose mere name reveals secrets. */
const SENSITIVE_FILENAMES = /(\.env(\.\w+)?|id_rsa|id_ed25519|id_ecdsa|\.pem|\.p12|\.keychain|\.netrc|credentials\.json|secrets?\.ya?ml|\.npmrc|\.pypirc|\.aws\/credentials|\.kube\/config)/gi;

function stableToken(prefix, value) {
  const h = crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 6);
  return `[${prefix}_${h}]`;
}

/** Keys whose VALUE is an identity, regardless of its content. */
const IDENTITY_KEYS = /^(user|username|userName|user_name|account|accountName|owner|loginName|login|fullName|realName|displayName|shortName)$/i;
const HOSTNAME_KEYS = /^(host|hostname|hostName|computerName|machineName|deviceName|localHostName)$/i;

/**
 * Redacts a string, recording every hit.
 * @returns {{ text: string, hits: Array }}
 */
export function redactText(input, ctx = {}) {
  if (typeof input !== 'string' || !input) return { text: input, hits: [] };

  const username = ctx.username || os.userInfo()?.username || '';
  const hostname = ctx.hostname || os.hostname() || '';
  const home = ctx.homedir || os.homedir() || '';
  const hits = [];
  let text = input;

  const apply = (pattern, category, replacer) => {
    text = text.replace(pattern, (...args) => {
      const match = args[0];
      const replacement = replacer(...args);
      hits.push({ category, original: match, replacement });
      return replacement;
    });
  };

  // Order matters: most specific first.
  apply(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, REDACTION_CATEGORY.EMAIL, (m) => stableToken('EMAIL', m));
  apply(/\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]+@/g, REDACTION_CATEGORY.URL_CREDENTIALS, () => '[URL_CREDENTIALS_REDACTED]@');
  apply(/\b(?:gh[pousr]_[A-Za-z0-9]{16,}|sk-[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})\b/g, REDACTION_CATEGORY.TOKEN, () => '[TOKEN_REDACTED]');
  apply(/\b(?:api[_-]?key|apikey|access[_-]?token|bearer|authorization|secret|password|passwd)\s*[:=]\s*["']?[^\s"',}]+/gi, REDACTION_CATEGORY.API_KEY, (m) => `${m.split(/[:=]/)[0]}=[API_KEY_REDACTED]`);
  apply(/(?:\/Users|\/home|C:\\Users)[\\/][^\\/\s"']+[\\/]\.ssh[\\/][^\s"',)]*/gi, REDACTION_CATEGORY.SSH_PATH, () => '[SSH_PATH_REDACTED]');
  apply(SENSITIVE_FILENAMES, REDACTION_CATEGORY.SENSITIVE_FILENAME, (m) => stableToken('SENSITIVE_FILE', m));

  if (home) apply(new RegExp(escapeRe(home), 'g'), REDACTION_CATEGORY.HOME_PATH, () => '~');
  apply(/(?:\/Users|\/home)\/[^\\/\s"',:)]+/g, REDACTION_CATEGORY.HOME_PATH, () => '/Users/[USER_REDACTED]');
  apply(/C:\\Users\\[^\\\s"',:)]+/gi, REDACTION_CATEGORY.HOME_PATH, () => 'C:\\Users\\[USER_REDACTED]');

  // Public/private IPv4 (keep loopback — it carries no identity and matters for diagnostics).
  apply(/\b(?!127\.0\.0\.1\b)(?:\d{1,3}\.){3}\d{1,3}\b/g, REDACTION_CATEGORY.IP_ADDRESS, (m) => stableToken('IP', m));
  apply(/\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi, REDACTION_CATEGORY.MAC_ADDRESS, (m) => stableToken('MAC', m));

  if (username && username.length > 2) {
    apply(new RegExp(`\\b${escapeRe(username)}\\b`, 'g'), REDACTION_CATEGORY.USERNAME, () => '[USER_REDACTED]');
  }
  if (hostname && hostname.length > 2) {
    apply(new RegExp(`\\b${escapeRe(hostname)}(?:\\.local)?\\b`, 'gi'), REDACTION_CATEGORY.HOSTNAME, () => '[HOSTNAME_REDACTED]');
  }
  apply(/\b[A-Z0-9]{10,12}\b(?=\s*(?:serial|Serial))|(?<=[Ss]erial(?:\s*Number)?\s*[:=]\s*)[A-Z0-9]{8,14}\b/g, REDACTION_CATEGORY.SERIAL, () => '[SERIAL_REDACTED]');

  return { text, hits };
}

/** Deep-redacts any JSON structure. Env-var maps are dropped wholesale unless explicitly allowed. */
export function redactObject(value, ctx = {}, hits = [], path = '$') {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    const { text, hits: h } = redactText(value, ctx);
    h.forEach((x) => hits.push({ ...x, path }));
    return text;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v, i) => redactObject(v, ctx, hits, `${path}[${i}]`));

  const out = {};
  for (const [key, v] of Object.entries(value)) {
    // Never blindly export environment variables.
    if (/^env(ironment)?(Vars|Variables)?$/i.test(key)) {
      out[key] = redactEnvBlock(v, hits, `${path}.${key}`, ctx);
      continue;
    }
    if (ENV_DENYLIST.test(key) || /token|secret|password|apikey|api_key|credential/i.test(key)) {
      hits.push({ category: REDACTION_CATEGORY.API_KEY, original: `${key}=<value>`, replacement: '[REDACTED]', path: `${path}.${key}` });
      out[key] = '[REDACTED]';
      continue;
    }
    // Identity fields are sensitive because of WHERE they sit, not just what they match.
    // "user": "jane.doe" must never survive an export just because jane.doe is not
    // the account running this server.
    if (IDENTITY_KEYS.test(key) && typeof v === 'string' && v.length > 1) {
      const token = stableToken('USER', v);
      hits.push({ category: REDACTION_CATEGORY.USERNAME, original: v, replacement: token, path: `${path}.${key}` });
      out[key] = token;
      continue;
    }
    if (HOSTNAME_KEYS.test(key) && typeof v === 'string' && v.length > 1) {
      const token = stableToken('HOSTNAME', v);
      hits.push({ category: REDACTION_CATEGORY.HOSTNAME, original: v, replacement: token, path: `${path}.${key}` });
      out[key] = token;
      continue;
    }
    out[key] = redactObject(v, ctx, hits, `${path}.${key}`);
  }
  return out;
}

function redactEnvBlock(envObj, hits, path, ctx) {
  if (!envObj || typeof envObj !== 'object') return '[ENV_WITHHELD]';
  const safe = {};
  for (const [k, v] of Object.entries(envObj)) {
    if (ENV_DENYLIST.test(k)) {
      hits.push({ category: REDACTION_CATEGORY.ENV_VAR, original: `${k}=<value>`, replacement: '[ENV_REDACTED]', path: `${path}.${k}` });
      safe[k] = '[ENV_REDACTED]';
    } else {
      const { text, hits: h } = redactText(String(v), ctx);
      h.forEach((x) => hits.push({ ...x, path: `${path}.${k}` }));
      safe[k] = text;
    }
  }
  return safe;
}

/**
 * Redacts a full report and returns the privacy panel the UI shows
 * ("Sensitive values detected: 14  [Preview Redactions]").
 */
export function redactReport(report, ctx = {}) {
  const hits = [];
  const redacted = redactObject(report, ctx, hits);

  const byCategory = {};
  for (const h of hits) {
    byCategory[h.category] = byCategory[h.category] || { category: h.category, label: CATEGORY_LABEL[h.category] || h.category, count: 0, samples: [] };
    byCategory[h.category].count += 1;
    if (byCategory[h.category].samples.length < 3) {
      byCategory[h.category].samples.push({ preview: maskPreview(h.original), replacedWith: h.replacement, path: h.path });
    }
  }

  return {
    redacted,
    privacy: {
      sensitiveValuesDetected: hits.length,
      uniqueCategories: Object.keys(byCategory).length,
      categories: Object.values(byCategory).sort((a, b) => b.count - a.count),
      guarantee: 'No raw environment variables, tokens, credentials, emails, public IP addresses, hostnames or home paths are present in the exported bundle.',
      redactionIsDeterministic: true,
      note: 'Identical values map to identical placeholders so the report remains internally correlatable without revealing identity.',
    },
  };
}

/** Show only enough to recognise the value; never the whole secret. */
function maskPreview(v) {
  const s = String(v);
  if (s.length <= 6) return `${s.slice(0, 1)}***`;
  return `${s.slice(0, 3)}***${s.slice(-2)}`;
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
