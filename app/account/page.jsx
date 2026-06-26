import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, hasStaffAccess, verifyAdminSessionCookie } from '../../lib/rpAdminAuth';
import { PageShell } from '../_components/SiteChrome';
import styles from './Account.module.css';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) redirect('/login?next=/account');

  const isStaff = hasStaffAccess(session);

  return (
    <PageShell>
      <section className="page-hero account-hero">
        <div className="container page-title">
          <p className="eyebrow">MY ACCOUNT</p>
          <h1>{session.name}님 계정</h1>
          <p>현재 로그인된 계정의 역할과 접근 가능한 메뉴를 확인합니다.</p>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.layout}`}>
          <div className={styles.profileCard}>
            <span className={styles.label}>로그인 계정</span>
            <h2>{session.name}</h2>
            <p>{session.sub}</p>
            <div className={styles.roleBadge}>{session.roleLabel}</div>
          </div>

          <div className={styles.actionPanel}>
            <p className="eyebrow">ACCESS</p>
            <h2>이 계정으로 이용 가능한 메뉴</h2>
            <div className={styles.linkGrid}>
              <Link href="/pe-exam/faq">체대입시 질문</Link>
              <Link href="/signup">계정 신청</Link>
              <Link href="/contact">상담 문의</Link>
              {isStaff && <Link href="/admin">운영관리</Link>}
              {isStaff && <Link href="/admin/clients">고객관리</Link>}
              {isStaff && <Link href="/admin/consultation">고객상담</Link>}
            </div>
            {!isStaff && (
              <div className={styles.notice}>
                <strong>회원 계정 안내</strong>
                <span>운영관리, 고객관리, 고객상담 페이지는 관리자 또는 트레이너 권한이 있는 계정만 접근할 수 있습니다.</span>
              </div>
            )}
            <form action="/api/auth/logout" method="post">
              <button type="submit">로그아웃</button>
            </form>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
