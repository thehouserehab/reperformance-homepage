import { PageShell } from '../_components/SiteChrome';
import FindAccountClient from './FindAccountClient';
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

      <section className={`section ${styles.recoverySection}`}>
        <FindAccountClient />
      </section>
    </PageShell>
  );
}
