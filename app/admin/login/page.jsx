import Link from 'next/link';
import { BrandLogo } from '../../_components/SiteChrome';
import styles from './AdminLogin.module.css';

const errorMessages = {
  invalid: '아이디 또는 비밀번호가 올바르지 않습니다.',
  forbidden: '관리자 또는 트레이너 권한이 있는 계정만 접속할 수 있습니다.',
  config: '운영 로그인 환경변수가 설정되지 않았습니다. Vercel 환경변수를 확인해 주세요.',
  'rate-limited': '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
};

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;
  const nextPath = typeof params?.next === 'string' && params.next.startsWith('/admin') ? params.next : '/admin';

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brandWrap}>
          <BrandLogo />
          <p>관리자 또는 트레이너 권한이 있는 계정만 운영관리, 고객관리, 고객상담 페이지에 접속할 수 있습니다.</p>
        </div>

        <form className={styles.form} action="/api/admin/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label>
            <span>아이디 또는 이메일</span>
            <input name="username" type="text" autoComplete="username" required autoFocus />
          </label>
          <label>
            <span>비밀번호</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <div className={styles.utilityRow}>
            <Link href="/find-account">아이디 / 비밀번호 찾기</Link>
          </div>
          {error && <p className={styles.error}>{errorMessages[error] || errorMessages.invalid}</p>}
          <button type="submit">운영 로그인</button>
        </form>

        <div className={styles.note}>
          <strong>계정이 필요한가요?</strong>
          <span>회원, 트레이너, 관리자 계정은 가입 신청 후 승인된 역할에 따라 사용할 수 있습니다.</span>
          <Link href="/signup">회원가입 / 계정 신청</Link>
        </div>
      </section>
    </main>
  );
}
