import Link from 'next/link';
import { PageShell } from '../../_components/SiteChrome';
import {
  isDatabaseConfigured,
  listDatabaseSecurityEvents,
} from '../../../lib/rpDatabase';
import { requireStaffPageSession } from '../_lib/requireStaffPageSession';
import styles from './SecurityEvents.module.css';

export const dynamic = 'force-dynamic';

const WINDOW_OPTIONS = [
  { label: '24시간', value: 24 },
  { label: '7일', value: 24 * 7 },
  { label: '30일', value: 24 * 30 },
];

function formatDateTime(value) {
  if (!value) return '기록 없음';

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Seoul',
    }).format(new Date(value));
  } catch (_) {
    return String(value);
  }
}

function formatMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || !Object.keys(metadata).length) return '기록 없음';

  return Object.entries(metadata)
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
}

export default async function SecurityEventsPage({ searchParams }) {
  await requireStaffPageSession('/admin/security');

  const requestedWindow = Number((await searchParams)?.windowHours || 24);
  const windowHours = WINDOW_OPTIONS.some((item) => item.value === requestedWindow) ? requestedWindow : 24;
  const databaseConfigured = isDatabaseConfigured();
  const data = databaseConfigured
    ? await listDatabaseSecurityEvents({ windowHours, limit: 80 })
    : { events: [], summary: [], ipPrefixes: [], count: 0, windowHours };

  return (
    <PageShell>
      <section className="page-hero admin-hero">
        <div className="container page-title">
          <p className="eyebrow">SECURITY MONITOR</p>
          <h1>보안 이벤트 점검</h1>
          <p>
            로그인, 계정 복구, 회원가입, AI 승인 변경처럼 민감한 이벤트를 원문 개인정보 없이 확인합니다.
            해시 prefix와 IP 대역은 반복 패턴 파악용이며, 원본 전화번호·이메일·IP는 표시하지 않습니다.
          </p>
          <div className="button-row">
            <Link className="button primary" href="/admin/clients">고객관리</Link>
            <Link className="button secondary" href="/admin">운영 홈</Link>
          </div>
        </div>
      </section>

      <main className={styles.wrap}>
        {!databaseConfigured && (
          <section className={styles.notice}>
            <strong>PostgreSQL 설정이 필요합니다.</strong>
            <span>보안 이벤트 조회는 `DATABASE_URL` 또는 `RP_DATABASE_URL`이 설정된 환경에서만 사용할 수 있습니다.</span>
          </section>
        )}

        <section className={styles.toolbar} aria-label="조회 기간">
          <div>
            <p className={styles.kicker}>WINDOW</p>
            <h2>최근 {WINDOW_OPTIONS.find((item) => item.value === windowHours)?.label || '24시간'} 기준</h2>
          </div>
          <div className={styles.windowLinks}>
            {WINDOW_OPTIONS.map((item) => (
              <Link
                key={item.value}
                className={item.value === windowHours ? styles.activeWindow : styles.windowLink}
                href={`/admin/security?windowHours=${item.value}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.metrics} aria-label="보안 이벤트 요약">
          <div className={styles.metric}>
            <span>전체 이벤트</span>
            <strong>{data.count}</strong>
          </div>
          <div className={styles.metric}>
            <span>이벤트 유형</span>
            <strong>{data.summary.length}</strong>
          </div>
          <div className={styles.metric}>
            <span>IP 대역</span>
            <strong>{data.ipPrefixes.length}</strong>
          </div>
        </section>

        <section className={styles.grid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.kicker}>EVENT SUMMARY</p>
              <h2>유형별 이벤트</h2>
            </div>
            <div className={styles.summaryList}>
              {data.summary.length ? data.summary.map((item) => (
                <div className={styles.summaryItem} key={`${item.eventType}-${item.outcome}`}>
                  <div>
                    <strong>{item.eventType}</strong>
                    <span>{item.outcome}</span>
                  </div>
                  <div>
                    <b>{item.count}</b>
                    <small>{formatDateTime(item.lastSeenAt)}</small>
                  </div>
                </div>
              )) : (
                <p className={styles.empty}>조회 기간 내 보안 이벤트가 없습니다.</p>
              )}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.kicker}>IP PREFIX</p>
              <h2>반복 IP 대역</h2>
            </div>
            <div className={styles.summaryList}>
              {data.ipPrefixes.length ? data.ipPrefixes.map((item) => (
                <div className={styles.summaryItem} key={item.ipPrefix}>
                  <div>
                    <strong>{item.ipPrefix}</strong>
                    <span>부분 마스킹 대역</span>
                  </div>
                  <div>
                    <b>{item.count}</b>
                    <small>{formatDateTime(item.lastSeenAt)}</small>
                  </div>
                </div>
              )) : (
                <p className={styles.empty}>반복 IP 대역이 없습니다.</p>
              )}
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <p className={styles.kicker}>RECENT EVENTS</p>
            <h2>최근 이벤트</h2>
          </div>

          <div className={styles.eventList}>
            {data.events.length ? data.events.map((event) => (
              <article className={styles.eventItem} key={event.id}>
                <div className={styles.eventMain}>
                  <span className={styles.outcome}>{event.outcome}</span>
                  <h3>{event.eventType}</h3>
                  <p>{event.route || 'route 없음'} · {formatDateTime(event.createdAt)}</p>
                </div>
                <dl className={styles.eventMeta}>
                  <div>
                    <dt>actor</dt>
                    <dd>{event.actorHashPrefix || '-'}</dd>
                  </div>
                  <div>
                    <dt>target</dt>
                    <dd>{event.targetHashPrefix || '-'}</dd>
                  </div>
                  <div>
                    <dt>ip</dt>
                    <dd>{event.ipPrefix || event.ipHashPrefix || '-'}</dd>
                  </div>
                  <div>
                    <dt>metadata</dt>
                    <dd>{formatMetadata(event.metadata)}</dd>
                  </div>
                </dl>
              </article>
            )) : (
              <p className={styles.empty}>조회 기간 내 최근 이벤트가 없습니다.</p>
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
