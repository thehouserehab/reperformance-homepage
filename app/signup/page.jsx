import Link from 'next/link';
import { PageShell } from '../_components/SiteChrome';
import styles from './Signup.module.css';

const statusMessages = {
  success: {
    title: '가입 신청이 접수되었습니다.',
    body: '확인 후 승인된 역할에 맞는 계정을 안내해드리겠습니다.',
  },
  invalid: {
    title: '필수 항목을 확인해주세요.',
    body: '이름, 아이디 또는 이메일, 연락처는 반드시 입력해야 합니다.',
  },
  error: {
    title: '가입 신청 저장에 실패했습니다.',
    body: '잠시 후 다시 시도하거나 전화/DM으로 계정 신청을 남겨주세요.',
  },
};

const roleCards = [
  {
    value: 'member',
    title: '회원',
    description: '상담 신청, 운동 기록, 공지 확인용 계정',
  },
  {
    value: 'trainer',
    title: '트레이너',
    description: '고객관리와 상담 화면 접근이 필요한 코치 계정',
  },
  {
    value: 'admin',
    title: '관리자',
    description: '운영관리와 전체 고객 데이터 접근이 필요한 관리자 계정',
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
          <p className="eyebrow">ACCOUNT SIGNUP</p>
          <h1>RePERFORMANCE 계정 신청</h1>
          <p>회원, 트레이너, 관리자 계정을 신청합니다. 관리자와 트레이너 권한은 승인된 계정에만 부여됩니다.</p>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.layout}`}>
          <form className={styles.form} action="/api/rp/signup" method="post">
            {message && (
              <div className={status === 'success' ? styles.success : styles.error}>
                <strong>{message.title}</strong>
                <span>{message.body}</span>
              </div>
            )}

            <div className={styles.formGrid}>
              <label>
                <span>이름</span>
                <input name="name" type="text" autoComplete="name" required />
              </label>
              <label>
                <span>아이디 또는 이메일</span>
                <input name="username" type="text" autoComplete="username" required />
              </label>
              <label>
                <span>연락처</span>
                <input name="phone" type="tel" autoComplete="tel" required />
              </label>
              <label>
                <span>신청 역할</span>
                <select name="requestedRole" defaultValue="member">
                  <option value="member">회원</option>
                  <option value="trainer">트레이너</option>
                  <option value="admin">관리자</option>
                </select>
              </label>
            </div>

            <label>
              <span>신청 내용</span>
              <textarea name="message" placeholder="예: 신규 트레이너 계정이 필요합니다. / 회원 상담 기록을 확인하고 싶습니다." />
            </label>

            <button type="submit">가입 신청하기</button>
          </form>

          <aside className={styles.sidePanel}>
            <p className="eyebrow">ROLE ACCESS</p>
            <h2>권한은 역할별로 나뉩니다.</h2>
            <div className={styles.roleList}>
              {roleCards.map((role) => (
                <div className={styles.roleCard} key={role.value}>
                  <strong>{role.title}</strong>
                  <span>{role.description}</span>
                </div>
              ))}
            </div>
            <div className={styles.notice}>
              <strong>관리자/트레이너 페이지 접근</strong>
              <span>운영관리, 고객관리, 고객상담 페이지는 승인된 관리자 또는 트레이너 계정으로만 접속할 수 있습니다.</span>
            </div>
            <div className={styles.actions}>
              <Link href="/admin/login">운영 로그인</Link>
              <Link href="/contact">상담 문의</Link>
            </div>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}
