import { BrandLogo } from '../../_components/SiteChrome';
import styles from './AdminLogin.module.css';

const errorMessages = {
  invalid: '아이디 또는 비밀번호가 올바르지 않습니다.',
  config: '관리자 로그인 환경변수가 설정되지 않았습니다. Vercel 환경변수를 확인해 주세요.',
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
          <p>관리자로 등록된 계정만 운영관리 페이지에 접속할 수 있습니다.</p>
        </div>

        <form className={styles.form} action="/api/admin/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label>
            <span>관리자 아이디</span>
            <input name="username" type="text" autoComplete="username" required autoFocus />
          </label>
          <label>
            <span>비밀번호</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && <p className={styles.error}>{errorMessages[error] || errorMessages.invalid}</p>}
          <button type="submit">로그인</button>
        </form>

        <div className={styles.note}>
          <strong>관리자 계정 설정</strong>
          <span>Vercel 환경변수 RP_ADMIN_USERS 또는 RP_ADMIN_USERNAME / RP_ADMIN_PASSWORD를 사용합니다.</span>
        </div>
      </section>
    </main>
  );
}
