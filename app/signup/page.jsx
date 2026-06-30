import { PageShell } from '../_components/SiteChrome';
import SignupClient from './SignupClient';

const statusMessages = {
  success: {
    title: '회원가입 요청이 접수되었습니다.',
    body: '계정 정보를 확인한 뒤 안내해드리겠습니다.',
  },
  pending: {
    title: '승인 대기로 접수되었습니다.',
    body: '운영 권한은 관리자 확인 후 부여됩니다.',
  },
  created: {
    title: '회원가입이 완료되었습니다.',
    body: '회원 계정이 바로 활성화되었습니다. 로그인 후 마이페이지를 이용할 수 있습니다.',
  },
  setup: {
    title: '계정 저장소 연결이 필요합니다.',
    body: '회원가입을 완료하려면 Postgres 또는 Google Drive 백업 연결 설정이 필요합니다.',
  },
  invalid: {
    title: '입력 정보를 확인해주세요.',
    body: '본인 인증, 이름, 아이디, 비밀번호를 모두 입력하고 비밀번호 확인을 맞춰주세요.',
  },
  'rate-limited': {
    title: '회원가입 요청이 너무 많습니다.',
    body: '보안을 위해 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.',
  },
  error: {
    title: '회원가입 처리에 실패했습니다.',
    body: '잠시 후 다시 시도하거나 관리자에게 계정 생성을 요청해주세요.',
  },
};

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
          <p>전화번호, 이메일, 카카오톡 중 하나로 본인 인증을 마치면 회원 계정으로 등록됩니다.</p>
        </div>
      </section>

      <section className="section">
        <SignupClient message={message} status={status} />
      </section>
    </PageShell>
  );
}
