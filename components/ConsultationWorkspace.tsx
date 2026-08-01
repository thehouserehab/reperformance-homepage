import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Brain,
  Dumbbell,
  GraduationCap,
  ScanLine,
  ShieldAlert,
} from "lucide-react";

const consultationItems = [
  {
    title: "입시 상담",
    label: "ADMISSION",
    description: "목표 대학·학과, 성적, 실기 기록과 궁금한 점을 함께 정리합니다.",
    signal: "코치 최종 검토",
    icon: GraduationCap,
  },
  {
    title: "운동 상담",
    label: "TRAINING",
    description: "현재 프로그램, 실기 기록, 통증 여부와 훈련 질문을 전달합니다.",
    signal: "통증 시 사람 확인",
    icon: Dumbbell,
  },
  {
    title: "식단 상담",
    label: "NUTRITION",
    description: "학교·공부·훈련 일정 안에서 유지 가능한 식사 질문을 정리합니다.",
    signal: "질환·극단 감량 제외",
    icon: Apple,
  },
  {
    title: "멘탈 지원",
    label: "WELLBEING",
    description: "지금 느끼는 부담을 정리하고 필요한 도움을 요청하는 문장을 만듭니다.",
    signal: "진단하지 않음",
    icon: Brain,
  },
  {
    title: "자세분석",
    label: "POSTURE",
    description: "정적 사진과 기준 동작을 바탕으로 코치가 확인할 관찰 항목을 준비합니다.",
    signal: "촬영 동의·코치 검토",
    icon: ScanLine,
  },
];

export function ConsultationWorkspace() {
  return (
    <>
      <section className="consultation-intro-band">
        <div>
          <p className="section-kicker">CHOOSE THE PURPOSE</p>
          <h2>지금 필요한 도움 한 가지만 선택합니다.</h2>
        </div>
        <p>직접 질문하거나 AI로 문장을 정리한 뒤 담당 코치에게 보낼 수 있습니다.</p>
      </section>

      <section className="consultation-directory" aria-label="상담 유형">
        {consultationItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <article className="consultation-row" key={item.title}>
              <div className="consultation-index">0{index + 1}</div>
              <div className="consultation-icon"><Icon aria-hidden="true" size={24} /></div>
              <div className="consultation-copy">
                <span>{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <div className="consultation-signal">{item.signal}</div>
              <Link href={`/student/messages?topic=${item.label.toLowerCase()}`} aria-label={`${item.title} 질문 정리`}>
                <ArrowRight aria-hidden="true" size={20} />
              </Link>
            </article>
          );
        })}
      </section>

      <aside className="consultation-safety-band">
        <ShieldAlert aria-hidden="true" size={24} />
        <p>AI는 합격 판단, 운동 처방, 의학·심리 진단을 대신하지 않습니다. 위험 신호는 코치나 전문가 확인으로 연결합니다.</p>
      </aside>
    </>
  );
}
