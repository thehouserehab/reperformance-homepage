import { buildRetentionPlan, runDataRetention, summarizeRetentionResult } from '../../../../../lib/rpDataRetention.mjs';
import { safeEqual } from '../../../../../lib/rpSecurity.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanValue(value) {
  return String(value || '').trim();
}

function isEnabledFlag(value) {
  const normalized = cleanValue(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function getBearerToken(request) {
  const header = cleanValue(request.headers.get('authorization'));
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return '';
  return header.slice(prefix.length).trim();
}

function isAuthorizedCronRequest(request) {
  const secret = cleanValue(process.env.CRON_SECRET || process.env.RP_MAINTENANCE_CRON_SECRET);
  if (!secret) return { ok: false, status: 503, error: 'Maintenance cron secret is not configured.' };

  const token = getBearerToken(request);
  if (!safeEqual(token, secret)) return { ok: false, status: 401, error: 'Unauthorized maintenance request.' };

  return { ok: true };
}

export async function GET(request) {
  const auth = isAuthorizedCronRequest(request);
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

  const apply = isEnabledFlag(process.env.RP_RETENTION_CRON_APPLY);
  const plan = buildRetentionPlan();

  try {
    const result = await runDataRetention({ apply, plan });
    const summary = summarizeRetentionResult(result, plan);

    if (!result.connected) {
      return Response.json(
        {
          ok: false,
          mode: apply ? 'apply' : 'dry-run',
          error: 'DATABASE_URL, POSTGRES_URL, or RP_DATABASE_URL is not configured.',
          ...summary,
        },
        { status: 503 },
      );
    }

    return Response.json({
      ok: true,
      mode: apply ? 'apply' : 'dry-run',
      ...summary,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        mode: apply ? 'apply' : 'dry-run',
        error: error?.message || 'Retention maintenance failed.',
      },
      { status: 500 },
    );
  }
}
