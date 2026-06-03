import Link from 'next/link';
import { PageShell } from '../_components/SiteChrome';
import { site } from '../_components/siteData';
import styles from './FindAccount.module.css';

export default function FindAccountPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">ACCOUNT HELP</p>
          <h1>아이디 / 비밀번호 찾기</h1>
          <p>계정 확인이 필요한 경우 이름과 연락처를 기준으로 확인 후 안내해드립니다.</p>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.layout}`}>
          <div className={styles.card}>
            <p className="eyebrow">FIND ID</p>
            <h2>아이디 찾기</h2>
            <p>이름과 연락처를 알려주시면 등록된 계정 여부를 확인해드립니다.</p>
            <div className={styles.actions}>
              <Link href="/signup">계정 확인 요청</Link>
              <a href={site.phoneHref}>전화 문의</a>
            </div>
          </div>

          <div className={styles.card}>
            <p className="eyebrow">RESET PASSWORD</p>
            <h2>비밀번호 재설정</h2>
            <p>현재는 자동 비밀번호 재설정보다 관리자 확인 후 임시 비밀번호를 발급하는 방식으로 운영합니다.</p>
            <div className={styles.actions}>
              <a href={site.instagramHref} target="_blank" rel="noopener noreferrer">인스타그램 DM</a>
              <Link href="/login">로그인으로 돌아가기</Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
