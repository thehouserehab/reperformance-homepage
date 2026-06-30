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
          <p>가입할 때 사용한 이름과 전화번호로 본인 확인을 진행합니다.</p>
        </div>
      </section>

      <section className={`section ${styles.recoverySection}`}>
        <FindAccountClient />
      </section>
    </PageShell>
  );
}
