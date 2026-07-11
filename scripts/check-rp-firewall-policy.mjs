import assert from "node:assert/strict";
import {
  RP_FIREWALL_CUSTOM_RULES,
  analyzeRpFirewallConfig,
  buildDesiredRpFirewallConfig,
} from "./lib/rpVercelFirewallPolicy.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const desired = buildDesiredRpFirewallConfig();
const desiredAnalysis = analyzeRpFirewallConfig(desired);
assert.equal(desiredAnalysis.ready, true, "Desired RP firewall policy must pass its own readiness analysis.");

const inactive = clone(desired);
inactive.rules.forEach((rule) => { rule.active = false; });
assert.equal(
  analyzeRpFirewallConfig(inactive).ready,
  false,
  "Inactive custom rules must never satisfy firewall readiness.",
);

const logOnly = clone(desired);
logOnly.rules[0].action.mitigate.action = "log";
assert.equal(
  analyzeRpFirewallConfig(logOnly).ready,
  false,
  "Log-only API rules must never satisfy protective or rate-limit readiness.",
);

const partial = {
  firewallEnabled: true,
  rules: [
    {
      name: "Partial login limit",
      active: true,
      conditionGroup: [
        { conditions: [{ type: "path", op: "eq", value: "/api/auth/login" }] },
      ],
      action: {
        mitigate: {
          action: "rate_limit",
          rateLimit: { algo: "fixed_window", window: 60, limit: 10, keys: ["ip"], action: "deny" },
        },
      },
    },
  ],
  managedRules: { bot_protection: { active: true, action: "challenge" } },
};
assert.equal(
  analyzeRpFirewallConfig(partial).ready,
  false,
  "A single protected route must not satisfy complete RP API coverage.",
);

const botDisabled = clone(desired);
botDisabled.managedRules.bot_protection.active = false;
assert.equal(
  analyzeRpFirewallConfig(botDisabled).ready,
  false,
  "Bot Protection must be active for campaign firewall readiness.",
);

console.log("RePERFORMANCE Vercel Firewall policy check");
console.log(`customRules=${RP_FIREWALL_CUSTOM_RULES.length}`);
console.log(`protectedPaths=${desiredAnalysis.protectedPaths.length}`);
console.log(`rateLimitedPaths=${desiredAnalysis.rateLimitedPaths.length}`);
console.log("Summary: 5/5 policy checks passed");
