import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#f6f3ee',
      color: '#151515',
      fontFamily: "Inter, Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: '32px',
    }}>
      <section style={{
        maxWidth: '1120px',
        margin: '0 auto',
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '28px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.04em' }}>
              <span style={{ color: '#16a5a3' }}>Re</span>PERFORMANCE
            </div>
            <p style={{ margin: '8px 0 0', color: '#707070', fontSize: '14px' }}>
              Owner Workspace · 관리자페이지
            </p>
          </div>
          <Link href="/admin/consultation" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '999px',
            background: '#16a5a3',
            color: '#fff',
            padding: '13px 18px',
            textDecoration: 'none',
            fontWeight: 800,
            boxShadow: '0 14px 28px rgba(22,165,163,.22)',
          }}>
            상담화면 열기
          </Link>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          <Link href="/admin/consultation" style={{
            display: 'block',
            minHeight: '180px',
            padding: '24px',
            borderRadius: '24px',
            background: 'linear-gradient(145deg, #111 0%, #262520 58%, #173b39 100%)',
            color: '#fff',
            textDecoration: 'none',
            boxShadow: '0 20px 50px rgba(30,28,24,.10)',
          }}>
            <div style={{ fontSize: '13px', opacity: .72, fontWeight: 700, marginBottom: '12px' }}>
              Consultation Mode
            </div>
            <h1 style={{ margin: 0, fontSize: '30px', lineHeight: 1.1, letterSpacing: '-0.06em' }}>
              상담화면
            </h1>
            <p style={{ margin: '14px 0 0', color: 'rgba(255,255,255,.75)', lineHeight: 1.6 }}>
              고객에게 보여주는 화면과 코치 입력 화면을 동시에 열어 상담을 진행합니다.
            </p>
          </Link>

          <div style={{
            minHeight: '180px',
            padding: '24px',
            borderRadius: '24px',
            background: '#fff',
            border: '1px solid rgba(20,20,20,.08)',
          }}>
            <div style={{ fontSize: '13px', color: '#707070', fontWeight: 700, marginBottom: '12px' }}>
              Client DB
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', letterSpacing: '-0.04em' }}>
              회원관리
            </h2>
            <p style={{ margin: '12px 0 0', color: '#555', lineHeight: 1.6 }}>
              Google Sheets의 Members_회원 데이터를 기준으로 상담모드와 연결됩니다.
            </p>
          </div>

          <div style={{
            minHeight: '180px',
            padding: '24px',
            borderRadius: '24px',
            background: '#fff',
            border: '1px solid rgba(20,20,20,.08)',
          }}>
            <div style={{ fontSize: '13px', color: '#707070', fontWeight: 700, marginBottom: '12px' }}>
              Next Step
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', letterSpacing: '-0.04em' }}>
              평가·프로그램 연결
            </h2>
            <p style={{ margin: '12px 0 0', color: '#555', lineHeight: 1.6 }}>
              이후 평가지, OPT 프로그램, 세션 기록 화면을 순차적으로 추가할 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
