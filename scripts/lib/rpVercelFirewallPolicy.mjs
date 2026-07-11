export const RP_FIREWALL_REQUIRED_PATHS = [
  "/api/auth/login",
  "/api/admin/login",
  "/api/auth/identity-verification",
  "/api/auth/account-recovery",
  "/api/rp/signup",
  "/api/rp/service-application",
  "/api/rp/pe-exam-question",
  "/api/rp/pe-exam-ai-consult",
  "/api/rp/clients",
  "/api/rp/auth-accounts",
  "/api/rp/security-events",
  "/api/rp/system-status",
];

export const RP_FIREWALL_RATE_LIMIT_REQUIRED_PATHS = [
  "/api/auth/login",
  "/api/admin/login",
  "/api/auth/identity-verification",
  "/api/auth/account-recovery",
  "/api/rp/signup",
  "/api/rp/service-application",
  "/api/rp/pe-exam-question",
  "/api/rp/pe-exam-ai-consult",
];

export const RP_FIREWALL_CUSTOM_RULES = [
  {
    key: "dynamic-api-rate-limit",
    name: "RP dynamic API rate limit",
    value: {
      name: "RP dynamic API rate limit",
      description: "Absorb API bursts at the edge before app and PostgreSQL limits run.",
      active: true,
      conditionGroup: [
        {
          conditions: [
            { type: "path", op: "pre", value: "/api/" },
          ],
        },
      ],
      action: {
        mitigate: {
          action: "rate_limit",
          rateLimit: {
            algo: "fixed_window",
            window: 60,
            limit: 120,
            keys: ["ip"],
            action: "deny",
          },
        },
      },
    },
  },
  {
    key: "scanner-deny",
    name: "RP irrelevant scanner deny",
    value: {
      name: "RP irrelevant scanner deny",
      description: "Block common non-Next.js scanner paths before they reach the application.",
      active: true,
      conditionGroup: [
        {
          conditions: [
            {
              type: "path",
              op: "re",
              value: "^/(?:wp-admin|wp-login\\.php|phpmyadmin|xmlrpc\\.php|\\.env)(?:/|$)",
            },
          ],
        },
      ],
      action: {
        mitigate: {
          action: "deny",
        },
      },
    },
  },
];

export const RP_FIREWALL_MANAGED_RULES = [
  {
    id: "bot_protection",
    value: { active: true, action: "challenge" },
  },
];

const PROTECTIVE_ACTIONS = new Set(["rate_limit", "challenge", "deny"]);

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function collectRuleObjects(node, output = [], seen = new Set(), depth = 0) {
  if (!node || depth > 12 || typeof node !== "object" || seen.has(node)) return output;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) collectRuleObjects(item, output, seen, depth + 1);
    return output;
  }

  if (Array.isArray(node.conditionGroup) && node.action) output.push(node);
  for (const value of Object.values(node)) collectRuleObjects(value, output, seen, depth + 1);
  return output;
}

function collectConditions(node, output = [], seen = new Set(), depth = 0) {
  if (!node || depth > 12 || typeof node !== "object" || seen.has(node)) return output;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) collectConditions(item, output, seen, depth + 1);
    return output;
  }

  if (node.type && node.op) output.push(node);
  for (const value of Object.values(node)) collectConditions(value, output, seen, depth + 1);
  return output;
}

function findBooleanByKey(node, key, seen = new Set(), depth = 0) {
  if (!node || depth > 12 || typeof node !== "object" || seen.has(node)) return null;
  seen.add(node);

  if (!Array.isArray(node) && typeof node[key] === "boolean") return node[key];
  for (const value of Object.values(node)) {
    const found = findBooleanByKey(value, key, seen, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

function normalizeAction(value) {
  return String(value || "").trim().toLowerCase();
}

function getMitigationAction(rule) {
  const action = rule?.action;
  if (typeof action === "string") return normalizeAction(action);
  return normalizeAction(action?.mitigate?.action || action?.action || rule?.mitigate?.action);
}

function valuesOf(condition) {
  return Array.isArray(condition?.value) ? condition.value : [condition?.value];
}

function conditionCoversPath(condition, pathname) {
  const type = String(condition?.type || "").toLowerCase();
  if (!["path", "target_path", "raw_path", "route"].includes(type)) return false;

  const op = String(condition?.op || "").toLowerCase();
  return valuesOf(condition).some((rawValue) => {
    const value = String(rawValue || "");
    if (!value) return false;

    if (["eq", "inc"].includes(op)) return pathname === value;
    if (op === "pre") return pathname.startsWith(value);
    if (op === "suf") return pathname.endsWith(value);
    if (op === "sub") return pathname.includes(value);
    if (op === "ex") return true;
    if (op === "re") {
      try {
        return new RegExp(value).test(pathname);
      } catch (_) {
        return false;
      }
    }
    return false;
  });
}

function ruleCoversPath(rule, pathname) {
  const conditions = collectConditions(rule?.conditionGroup || []);
  const pathConditions = conditions.filter((condition) => (
    ["path", "target_path", "raw_path", "route"].includes(String(condition?.type || "").toLowerCase())
  ));

  if (!pathConditions.length) return true;
  return pathConditions.some((condition) => conditionCoversPath(condition, pathname));
}

function findManagedRule(config, id, seen = new Set(), depth = 0) {
  if (!config || depth > 12 || typeof config !== "object" || seen.has(config)) return null;
  seen.add(config);

  if (Array.isArray(config)) {
    for (const item of config) {
      const found = findManagedRule(item, id, seen, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (asObject(config[id])) return config[id];
  if (String(config.id || "").toLowerCase() === id.toLowerCase()) return config;

  for (const value of Object.values(config)) {
    const found = findManagedRule(value, id, seen, depth + 1);
    if (found) return found;
  }
  return null;
}

export function analyzeRpFirewallConfig(config) {
  const customRules = collectRuleObjects(config);
  const activeRules = customRules.filter((rule) => rule?.active !== false);
  const protectiveRules = activeRules.filter((rule) => PROTECTIVE_ACTIONS.has(getMitigationAction(rule)));
  const rateLimitRules = activeRules.filter((rule) => getMitigationAction(rule) === "rate_limit");
  const protectedPaths = RP_FIREWALL_REQUIRED_PATHS.filter((pathname) => (
    protectiveRules.some((rule) => ruleCoversPath(rule, pathname))
  ));
  const rateLimitedPaths = RP_FIREWALL_RATE_LIMIT_REQUIRED_PATHS.filter((pathname) => (
    rateLimitRules.some((rule) => ruleCoversPath(rule, pathname))
  ));
  const explicitFirewallEnabled = findBooleanByKey(config, "firewallEnabled");
  const firewallEnabled = explicitFirewallEnabled === false
    ? false
    : explicitFirewallEnabled === true || protectiveRules.length > 0;
  const botProtection = findManagedRule(config, "bot_protection");
  const botProtectionActive = Boolean(
    botProtection?.active === true
    && PROTECTIVE_ACTIONS.has(normalizeAction(botProtection?.action?.mitigate?.action || botProtection?.action)),
  );
  const missingProtectedPaths = RP_FIREWALL_REQUIRED_PATHS.filter((path) => !protectedPaths.includes(path));
  const missingRateLimitedPaths = RP_FIREWALL_RATE_LIMIT_REQUIRED_PATHS.filter((path) => !rateLimitedPaths.includes(path));

  return {
    ready: firewallEnabled
      && botProtectionActive
      && missingProtectedPaths.length === 0
      && missingRateLimitedPaths.length === 0,
    firewallEnabled,
    botProtectionActive,
    customRuleCount: customRules.length,
    activeRuleCount: activeRules.length,
    protectiveRuleCount: protectiveRules.length,
    rateLimitRuleCount: rateLimitRules.length,
    protectedPaths,
    rateLimitedPaths,
    missingProtectedPaths,
    missingRateLimitedPaths,
    actions: [...new Set(activeRules.map(getMitigationAction).filter(Boolean))].sort(),
  };
}

export function buildDesiredRpFirewallConfig() {
  return {
    firewallEnabled: true,
    rules: RP_FIREWALL_CUSTOM_RULES.map((policy) => policy.value),
    managedRules: Object.fromEntries(
      RP_FIREWALL_MANAGED_RULES.map((policy) => [policy.id, policy.value]),
    ),
  };
}
