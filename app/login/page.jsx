import Link from 'next/link';
import { BrandLogo } from '../_components/SiteChrome';
import styles from './Login.module.css';

const errorMessages = {
  invalid: '아이디 또는 비밀번호가 올바르지 않습니다.',
  config: '로그인 환경변수가 설정되지 않았습니다. 관리자에게 문의해주세요.',
  'rate-limited': '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;
  const nextPath = typeof params?.next === 'string' ? params.next : '';

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brandWrap}>
          <BrandLogo />
          <p className={styles.eyebrow}>Login</p>
          <h1>로그인</h1>
          <p>회원, 트레이너, 관리자 계정으로 로그인합니다. 권한에 따라 이동할 수 있는 페이지가 달라집니다.</p>
        </div>

        <form className={styles.form} action="/api/auth/login" method="post">
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
          <button type="submit">로그인</button>
        </form>

        <div className={styles.joinBox}>
          <strong>계정이 없으신가요?</strong>
          <span>회원은 가입 즉시 사용할 수 있고, 트레이너/관리자 권한은 별도 승인 후 활성화됩니다.</span>
          <Link href="/signup">회원가입</Link>
        </div>
      </section>
    </main>
  );
}
