import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const CONFIRM_TOKEN = "APPLY_RP_DB_MIGRATION";
const MIGRATION_FILE = "database/migrations/20260630_security_scale_baseline.sql";

function cleanValue(value) {
  return String(value || "").trim();
}

function getArgValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!match) return fallback;
  return match.slice(prefix.length);
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function getDatabaseUrl() {
  return cleanValue(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.RP_DATABASE_URL);
}

function getSslConfig(databaseUrl) {
  const sslMode = cleanValue(process.env.RP_DATABASE_SSL).toLowerCase();
  const lowerUrl = String(databaseUrl || "").toLowerCase();

  if (sslMode === "false") return false;
  if (lowerUrl.includes("sslmode=disable")) return false;
  if (lowerUrl.includes("localhost") || lowerUrl.includes("127.0.0.1")) return false;
  return { rejectUnauthorized: false };
}

function getMigration() {
  const filePath = path.join(process.cwd(), MIGRATION_FILE);
  const sql = fs.readFileSync(filePath, "utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex");
  return { filePath, sql, hash };
}

function validateMigration(sql) {
  const requiredFragments = [
    "BEGIN;",
    "CREATE TABLE IF NOT EXISTS rp_auth_accounts",
    "CREATE TABLE IF NOT EXISTS rp_service_applications",
    "CREATE TABLE IF NOT EXISTS rp_rate_limit_buckets",
    "CREATE INDEX IF NOT EXISTS rp_rate_limit_buckets_expires_at_idx",
    "COMMIT;",
  ];

  const missing = requiredFragments.filter((fragment) => !sql.includes(fragment));
  if (missing.length) {
    throw new Error(`Migration file is missing required fragments: ${missing.join(", ")}`);
  }
}

function printPlan(migration) {
  console.log("RePERFORMANCE database migration apply");
  console.log(`migration: ${MIGRATION_FILE}`);
  console.log(`sha256: ${migration.hash}`);
  console.log(`bytes: ${Buffer.byteLength(migration.sql, "utf8")}`);
  console.log("\nThis command applies the baseline security/scale schema migration and then runs db:migration:check.");
}

function assertApplyAllowed() {
  const confirm = getArgValue("confirm", "");
  if (process.env.RP_DATABASE_MIGRATION_ALLOW_APPLY !== "true" || confirm !== CONFIRM_TOKEN) {
    throw new Error(`Refusing to apply migration. Set RP_DATABASE_MIGRATION_ALLOW_APPLY=true and pass --confirm=${CONFIRM_TOKEN}.`);
  }
}

async function applyMigration(migration, databaseUrl) {
  const pg = await import("pg");
  const Pool = pg.Pool || pg.default?.Pool;
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl: getSslConfig(databaseUrl),
  });

  const client = await pool.connect();
  try {
    await client.query(migration.sql);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // The migration file owns BEGIN/COMMIT. If it failed before BEGIN, rollback may also fail.
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function runPostCheck() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const command = [npmCommand, "run", "db:migration:check"];
  console.log(`\n[post-check] ${command.join(" ")}`);
  const result = process.platform === "win32"
    ? spawnSync(command.join(" "), { stdio: "inherit", shell: true })
    : spawnSync(command[0], command.slice(1), { stdio: "inherit", shell: false });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Post-check failed with status ${result.status}`);
  }
}

if (hasArg("help")) {
  console.log(`Usage:
  node scripts/apply-rp-database-migration.mjs --plan
  RP_DATABASE_MIGRATION_ALLOW_APPLY=true node scripts/apply-rp-database-migration.mjs --confirm=${CONFIRM_TOKEN}

Options:
  --plan                    Show migration metadata without connecting to the database.
  --allow-missing-database  Allow local wiring checks to pass without a database URL.
  --skip-post-check         Apply migration without running db:migration:check afterwards.`);
  process.exit(0);
}

try {
  const migration = getMigration();
  validateMigration(migration.sql);
  printPlan(migration);

  if (hasArg("plan")) process.exit(0);

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.log("\nNo DATABASE_URL, POSTGRES_URL, or RP_DATABASE_URL is configured.");
    console.log("Use --allow-missing-database only for local script wiring checks.");
    process.exit(hasArg("allow-missing-database") ? 0 : 1);
  }

  assertApplyAllowed();
  await applyMigration(migration, databaseUrl);
  console.log("\nMigration applied.");

  if (!hasArg("skip-post-check")) runPostCheck();
} catch (error) {
  console.error(`Database migration apply failed: ${error?.message || error}`);
  process.exit(1);
}
