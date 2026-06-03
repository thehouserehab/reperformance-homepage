import Link from 'next/link';
import { PageShell } from '../_components/SiteChrome';
import styles from './Signup.module.css';

const statusMessages = {
  success: {
    title: '가입 신청이 접수되었습니다.',
    body: '확인 후 승인된 역할에 맞는 계정을 안내해드리겠습니다.',
  },
  pending: {
    title: '승인 대기로 접수되었습니다.',
    body: '트레이너와 관리자 권한은 관리자가 확인한 뒤 활성화됩니다. 승인 전에는 관리자 영역에 접근할 수 없습니다.',
  },
  created: {
    title: '회원가입이 완료되었습니다.',
    body: '회원 계정이 바로 활성화되었습니다. 로그인 후 마이페이지를 이용할 수 있습니다.',
  },
  setup: {
    title: '자동 가입 저장소 연결이 필요합니다.',
    body: '회원 자동가입을 완료하려면 Google Apps Script에 계정 저장/조회 액션을 배포해야 합니다.',
  },
  invalid: {
    title: '필수 항목을 확인해주세요.',
    body: '이름, 아이디 또는 이메일, 연락처, 비밀번호를 입력하고 비밀번호 확인을 맞춰주세요.',
  },
  error: {
    title: '가입 처리에 실패했습니다.',
    body: '잠시 후 다시 시도하거나 전화/DM으로 계정 신청을 남겨주세요.',
  },
};

const roleCards = [
  {
    value: 'member',
    title: '회원',
    description: '가입 즉시 로그인 가능한 계정. 상담 신청, 운동 기록, 공지 확인용으로 사용합니다.',
  },
  {
    value: 'trainer',
    title: '트레이너',
    description: '고객관리와 상담 화면 접근이 필요한 코치 계정. 관리자 승인 후 활성화됩니다.',
  },
  {
    value: 'admin',
    title: '관리자',
    description: '운영관리와 전체 고객 데이터 접근이 필요한 관리자 계정. 대표 관리자 승인 후 활성화됩니다.',
  },
];

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const status = params?.status;
  const message = statusMessages[status];

  return (
    <PageShell>
      <section className="page-hero signup-hero">
        <div className="container page-title">
          <p className="eyebrow">CREATE ACCOUNT</p>
          <h1>RePERFORMANCE 회원가입</h1>
          <p>회원 계정은 바로 가입할 수 있습니다. 트레이너와 관리자 권한은 신청 후 승인 대기 상태로 접수됩니다.</p>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.layout}`}>
          <form className={styles.form} action="/api/rp/signup" method="post">
            {message && (
              <div className={status === 'success' || status === 'created' || status === 'pending' ? styles.success : styles.error}>
                <strong>{message.title}</strong>
                <span>{message.body}</span>
              </div>
            )}

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <span>01</span>
                <strong>기본 정보</strong>
              </div>
              <div className={styles.formGrid}>
                <label>
                  <span>아이디 또는 이메일</span>
                  <input name="username" type="text" autoComplete="username" required />
                </label>
                <label>
                  <span>이름</span>
                  <input name="name" type="text" autoComplete="name" required />
                </label>
                <label>
                  <span>연락처</span>
                  <input name="phone" type="tel" autoComplete="tel" required />
                </label>
                <label>
                  <span>신청 역할</span>
                  <select name="requestedRole" defaultValue="member">
                    <option value="member">회원 - 자동 가입</option>
                    <option value="trainer">트레이너 - 승인 대기</option>
                    <option value="admin">관리자 - 승인 대기</option>
                  </select>
                </label>
                <label>
                  <span>비밀번호</span>
                  <input name="password" type="password" autoComplete="new-password" minLength={6} required />
                </label>
                <label>
                  <span>비밀번호 확인</span>
                  <input name="passwordConfirm" type="password" autoComplete="new-password" minLength={6} required />
                </label>
              </div>
              <p className={styles.helperText}>회원은 가입 즉시 로그인 가능하며, 트레이너와 관리자는 승인 후 같은 비밀번호로 로그인합니다.</p>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <span>02</span>
                <strong>신청 내용</strong>
              </div>
              <label>
                <span>계정 신청 목적</span>
                <textarea name="message" placeholder="예: 신규 트레이너 계정이 필요합니다. / 회원 상담 기록을 확인하고 싶습니다." />
              </label>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <span>03</span>
                <strong>동의</strong>
              </div>
              <label className={styles.checkLabel}>
                <input name="privacyConsent" type="checkbox" value="yes" required />
                <span>계정 생성과 권한 심사를 위해 이름, 연락처, 신청 내용을 저장하는 것에 동의합니다.</span>
              </label>
              <label className={styles.checkLabel}>
                <input name="roleConsent" type="checkbox" value="yes" required />
                <span>회원은 즉시 활성화되며, 트레이너/관리자 권한은 승인 후 부여되고 미승인 계정은 관리자 영역에 접근할 수 없음을 확인했습니다.</span>
              </label>
            </div>

            <button type="submit">회원가입 / 계정 신청하기</button>
          </form>

          <aside className={styles.sidePanel}>
            <p className="eyebrow">ROLE ACCESS</p>
            <h2>회원은 자동 가입, 운영 권한은 승인제로 관리합니다.</h2>
            <div className={styles.roleList}>
              {roleCards.map((role) => (
                <div className={styles.roleCard} key={role.value}>
                  <strong>{role.title}</strong>
                  <span>{role.description}</span>
                </div>
              ))}
            </div>
            <div className={styles.notice}>
              <strong>운영 페이지 접근</strong>
              <span>운영관리, 고객관리, 고객상담 페이지는 승인된 관리자 또는 트레이너 계정으로만 접속할 수 있습니다.</span>
            </div>
            <div className={styles.actions}>
              <Link href="/login">로그인</Link>
              <Link href="/find-account">계정 찾기</Link>
            </div>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}
