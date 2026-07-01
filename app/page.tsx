import Image from "next/image";
import Link from "next/link";
import { ConsultationCTA, PageShell } from "./_components/SiteChrome";
import { site } from "./_components/siteData";

const proofItems = [
  { value: "1:1 상태 확인", label: "현재 불편한 움직임부터 확인합니다." },
  { value: "3단계 진행", label: "설문 → 평가 → 프로그램으로 이어집니다." },
  { value: "맞춤 운동 설계", label: "목표와 몸 상태에 따라 운동을 조정합니다." },
];

const audienceItems = [
  {
    number: "01",
    label: "Senior Rehab",
    title: "시니어 재활 트레이닝",
    href: "/services/senior-rehab",
    target: "걷기, 계단, 균형, 하체 근력의 불편함이 걱정되는 분",
  },
  {
    number: "02",
    label: "Athlete Reconditioning",
    title: "선수·학생 리컨디셔닝",
    href: "/services/athlete-reconditioning",
    target: "복귀와 경기력 회복을 준비하는 선수와 학생",
  },
  {
    number: "03",
    label: "Pain Care",
    title: "일반 통증 케어",
    href: "/services/pain-care",
    target: "목, 어깨, 허리, 무릎의 불편함과 체력 저하가 있는 분",
  },
  {
    number: "04",
    label: "PE Exam",
    title: "체대입시 운동·상담",
    href: "/services/pe-exam",
    target: "실기 준비와 입시 정보를 함께 정리하고 싶은 학생",
  },
];

const systemItems = [
  {
    number: "01",
    title: "설문",
    summary: "목표와 현재 불편함, 운동 전 확인할 사항을 먼저 정리합니다.",
  },
  {
    number: "02",
    title: "평가",
    summary: "움직임과 균형, 주의사항을 확인해 준비 방향을 잡습니다.",
  },
  {
    number: "03",
    title: "프로그램",
    summary: "목표에 맞는 수업 방향과 운동 구성을 연결합니다.",
  },
];

export default function Home() {
  return (
    <PageShell>
      <section className="hero">
        <div className="hero-portrait" aria-hidden="true">
          <Image
            src="/images/coach-profile.jpg"
            alt=""
            fill
            sizes="(max-width: 900px) 52vw, 42vw"
            priority
          />
        </div>
        <div className="hero-scrim" />
        <div className="container hero-content">
          <p className="eyebrow light-text">Rehab to Performance</p>
          <h1>
            재활에서
            <br className="mobile-break" /> 움직임으로,
            <br />
            움직임에서
            <br className="mobile-break" /> 퍼포먼스로.
          </h1>
          <p className="lead">
            통증과 불편감을 단순히 참게 하지 않습니다. 현재 몸 상태를 확인하고, 다시 움직일 수
            있는 방향으로 회복과 훈련을 연결합니다.
          </p>
          <div className="hero-actions">
            <Link href={site.serviceApplyHref} className="button primary">
              상담 신청하기
            </Link>
            <Link href="/services" className="button hero-secondary">
              프로그램 보기
            </Link>
          </div>
          <div className="proof-strip" aria-label="RePERFORMANCE 진행 기준">
            {proofItems.map((item) => (
              <div key={item.value}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="hero-coach-note">
            <strong>정우현 Head Coach</strong>
            <span>상담, 평가, 수업 방향을 한 흐름으로 확인합니다.</span>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">FOR WHO</p>
            <h2>필요한 사람에게 필요한 운동을 연결합니다.</h2>
            <p>
              일상 회복, 운동 복귀, 불편감 관리, 체대입시 준비까지 몸 상태와 목표에 맞춰 운동
              방향을 정리합니다.
            </p>
          </div>
          <div className="grid-2 home-service-grid">
            {audienceItems.map((item) => (
              <Link href={item.href} className="card interactive-card home-audience-card" key={item.href}>
                <span className="card-number">{item.number}</span>
                <p className="card-label">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.target}</p>
                <span className="more-link">프로그램 보기</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">SYSTEM</p>
            <h2>상담 신청 후 이렇게 진행합니다.</h2>
            <p>설문으로 확인하고, 움직임을 살피고, 목표에 맞는 프로그램으로 이어갑니다.</p>
          </div>
          <div className="grid-3">
            {systemItems.map((item) => (
              <article className="card system-step-card" key={item.number}>
                <span className="card-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </article>
            ))}
          </div>
          <div className="button-row">
            <Link href="/system" className="button dark">
              진행 방식 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container grid-2">
          <div className="contact-box accent-box">
            <p className="eyebrow">MEMBER GUIDE</p>
            <h2>회원관리는 상담 이후 내부 흐름으로 이어집니다.</h2>
            <p>
              상담 후 필요한 경우 회원 계정을 안내해드립니다. 수업 기록, 개인운동, 식단, 메모,
              계약 관리는 상담 이후 안내되는 내부 관리 흐름에서 확인할 수 있습니다.
            </p>
            <div className="button-row">
              <Link href="/member" className="button dark">
                회원관리 안내 보기
              </Link>
              <Link href={site.serviceApplyHref} className="button secondary">
                상담 신청하기
              </Link>
            </div>
          </div>
          <div className="contact-box">
            <p className="eyebrow">LOCATION</p>
            <h2>전주 서신동 773-2, 2층</h2>
            <div className="contact-list">
              <div>
                <strong>운영 시간</strong>
                <span>{site.hours}</span>
              </div>
              <div>
                <strong>주차</strong>
                <span>{site.parking}</span>
              </div>
              <div>
                <strong>연락</strong>
                <span>
                  {site.phone} / {site.instagram}
                </span>
              </div>
            </div>
            <div className="button-row">
              <Link href="/location" className="button dark">
                위치 자세히 보기
              </Link>
              <a href={site.naverMapHref} target="_blank" rel="noopener noreferrer" className="button secondary">
                네이버 지도
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="contact-box">
            <p className="eyebrow">APPLY</p>
            <h2>처음 방문 전 상담 신청서를 남겨주세요.</h2>
            <p>
              신청 내용을 확인한 뒤 담당 코치가 상담 방향을 안내합니다. 현재 불편함, 목표,
              운동 가능 시간을 바탕으로 첫 상담을 정리합니다.
            </p>
            <div className="button-row">
              <Link href={site.serviceApplyHref} className="button primary">
                상담 신청하기
              </Link>
              <a
                href={site.instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="button secondary"
              >
                Instagram DM
              </a>
            </div>
          </div>
        </div>
      </section>

      <ConsultationCTA />
    </PageShell>
  );
}
