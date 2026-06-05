import Link from 'next/link';
import { PageShell } from '../_components/SiteChrome';
import { serviceItems } from '../_components/siteData';
import { PAIN_AREAS, PE_EXAM_EVENTS, VISIT_PURPOSES } from '../../components/rp-consultation/rpConsultationSchema';
import styles from './Apply.module.css';

const statusMessages = {
  success: {
    title: '서비스 신청과 PAR-Q 확인이 완료되었습니다.',
    body: '작성한 내용은 고객관리 데이터로 저장되었습니다. 담당 코치가 확인 후 상담 방향을 안내합니다.',
  },
  setup: {
    title: '데이터베이스 연결이 필요합니다.',
    body: '신청 데이터를 저장하려면 Vercel 환경변수의 DATABASE_URL 또는 RP_DATABASE_URL 설정이 필요합니다.',
  },
  invalid: {
    title: '필수 항목을 확인해주세요.',
    body: '서비스, 이름, 연락처, 개인정보 동의, PAR-Q 확인 동의는 필수입니다.',
  },
  error: {
    title: '신청 저장에 실패했습니다.',
    body: '잠시 후 다시 시도하거나 전화/DM으로 신청 내용을 남겨주세요.',
  },
};

const parqQuestions = [
  '의사 또는 의료진에게 운동 제한이나 운동 전 확인이 필요하다는 말을 들은 적이 있습니다.',
  '운동 중 또는 운동 직후 가슴 통증, 심한 호흡곤란, 어지러움, 실신 경험이 있습니다.',
  '최근 수술, 입원, 치료 중인 질환 또는 운동 전 확인이 필요한 부상 이력이 있습니다.',
  '허리, 어깨, 무릎, 발목 등 통증이 운동 중 악화될 수 있다고 느낍니다.',
  '혈압, 심장, 호흡기, 당뇨, 신경계 질환 또는 복용 약과 관련해 확인이 필요합니다.',
  '임신, 출산, 성장기 통증, 기타 트레이너가 반드시 알아야 할 건강 상태가 있습니다.',
];

const frequencyOptions = ['주 1회', '주 2회', '주 3회', '주 4회 이상', '상담 후 결정'];
const timeOptions = ['오전', '오후', '저녁', '주말', '협의 필요'];
const genderOptions = ['남', '여', '기타'];

function resolveServiceKey(value) {
  const text = String(value || '').trim();
  return serviceItems.some((item) => item.applicationValue === text) ? text : serviceItems[2].applicationValue;
}

export default async function ApplyPage({ searchParams }) {
  const params = await searchParams;
  const selectedService = resolveServiceKey(params?.service);
  const status = params?.status;
  const message = statusMessages[status];

  return (
    <PageShell>
      <section className="page-hero">
        <div className="container page-title">
          <p className="eyebrow">SERVICE APPLICATION</p>
          <h1>서비스를 고르고 PAR-Q까지 한 번에 작성합니다.</h1>
          <p>
            노션 설문에서 사용하던 핵심 항목을 홈페이지 안으로 옮겼습니다. 신청 후 내용은 고객관리 데이터로 저장되어
            상담 전 확인 자료로 바로 활용됩니다.
          </p>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.layout}`}>
          <form className={styles.form} action="/api/rp/service-application" method="post">
            {message && (
              <div className={status === 'success' ? styles.success : styles.error}>
                <strong>{message.title}</strong>
                <span>{message.body}</span>
              </div>
            )}

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <span>01</span>
                <strong>서비스 선택</strong>
              </div>
              <div className={styles.serviceGrid}>
                {serviceItems.map((item) => (
                  <label className={styles.serviceOption} key={item.applicationValue}>
                    <input
                      type="radio"
                      name="service"
                      value={item.applicationValue}
                      defaultChecked={item.applicationValue === selectedService}
                      required
                    />
                    <span className={styles.serviceText}>
                      <em>{item.number} · {item.label}</em>
                      <strong>{item.title}</strong>
                      <small>{item.target}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <span>02</span>
                <strong>기본 정보</strong>
              </div>
              <div className={styles.formGrid}>
                <label>
                  <span>이름 / 성함 *</span>
                  <input name="name" type="text" autoComplete="name" required />
                </label>
                <label>
                  <span>연락처 *</span>
                  <input name="phone" type="tel" autoComplete="tel" placeholder="010-0000-0000" required />
                </label>
                <label>
                  <span>생년월일</span>
                  <input name="birth" type="text" placeholder="YYYY-MM-DD" />
                </label>
                <label>
                  <span>성별</span>
                  <select name="gender" defaultValue="">
                    <option value="">선택 안 함</option>
                    {genderOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <span>03</span>
                <strong>노션 설문 기반 상담 항목</strong>
              </div>
              <label>
                <span>운동 목표 / 신청 이유</span>
                <textarea name="goal" placeholder="예: 허리 통증 없이 운동을 다시 시작하고 싶습니다." />
              </label>
              <div>
                <span className={styles.groupLabel}>방문 목적</span>
                <div className={styles.checkGrid}>
                  {VISIT_PURPOSES.map((item) => (
                    <label className={styles.checkCard} key={item}>
                      <input type="checkbox" name="purpose" value={item} />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className={styles.groupLabel}>불편 부위 / 통증 부위</span>
                <div className={styles.checkGrid}>
                  {PAIN_AREAS.map((item) => (
                    <label className={styles.checkCard} key={item}>
                      <input type="checkbox" name="painAreas" value={item} />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.formGrid}>
                <label>
                  <span>통증 강도</span>
                  <select name="painScore" defaultValue="0">
                    {Array.from({ length: 11 }, (_, index) => (
                      <option key={index} value={index}>{index} / 10</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>운동 가능 빈도</span>
                  <select name="weeklyFrequency" defaultValue="주 2회">
                    {frequencyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span>선호 시간</span>
                  <select name="preferredTime" defaultValue="협의 필요">
                    {timeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span>운동 경험</span>
                  <input name="exerciseExperience" type="text" placeholder="예: 헬스 6개월, 운동 경험 없음" />
                </label>
              </div>
              <label>
                <span>불편한 동작 / 주의사항 / 문의 내용</span>
                <textarea name="concern" placeholder="예: 계단 내려갈 때 무릎이 불편하고, 오래 앉아 있으면 허리가 뻐근합니다." />
              </label>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <span>04</span>
                <strong>체대입시 선택 시 추가 정보</strong>
              </div>
              <div className={styles.formGrid}>
                <label>
                  <span>희망 대학</span>
                  <input name="peExamTargetUniversities" type="text" placeholder="예: 한국체대, 용인대, 전북대" />
                </label>
                <label>
                  <span>목표 학과</span>
                  <input name="peExamTargetDepartment" type="text" placeholder="예: 체육교육과, 스포츠과학과" />
                </label>
              </div>
              <div>
                <span className={styles.groupLabel}>준비 실기 종목</span>
                <div className={styles.checkGrid}>
                  {PE_EXAM_EVENTS.map((item) => (
                    <label className={styles.checkCard} key={item}>
                      <input type="checkbox" name="peExamPracticalEvents" value={item} />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label>
                <span>현재 실기 기록 / 내신·수능 상태 / 원서 전략 메모</span>
                <textarea name="peExamMemo" placeholder="예: 제자리멀리뛰기 225cm, 윗몸 52개. 내신 4등급대, 실기 반영 높은 대학 우선 상담 희망." />
              </label>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <span>05</span>
                <strong>PAR-Q 확인</strong>
              </div>
              <p className={styles.helperText}>
                아래 항목은 노션 설문에서 수집하던 PAR-Q 예항목을 홈페이지 입력용으로 정리한 것입니다. 해당되는 항목만 체크해주세요.
              </p>
              <div className={styles.parqList}>
                {parqQuestions.map((question) => (
                  <label className={styles.parqCard} key={question}>
                    <input type="checkbox" name="parqYesItems" value={question} />
                    <span>{question}</span>
                  </label>
                ))}
              </div>
              <label>
                <span>추가로 알려야 할 건강 상태</span>
                <textarea name="parqMemo" placeholder="복용 약, 진단명, 치료 중인 내용, 운동 시 불안한 점이 있다면 적어주세요." />
              </label>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <span>06</span>
                <strong>동의</strong>
              </div>
              <label className={styles.agreeLabel}>
                <input name="parqConsent" type="checkbox" value="yes" required />
                <span>운동 전 안전 확인을 위해 위 PAR-Q 항목을 확인했고, 해당되는 항목을 사실대로 체크했습니다.</span>
              </label>
              <label className={styles.agreeLabel}>
                <input name="privacyConsent" type="checkbox" value="yes" required />
                <span>서비스 신청과 상담 준비를 위해 이름, 연락처, 신청 내용, PAR-Q 확인 결과를 저장하는 것에 동의합니다.</span>
              </label>
            </div>

            <button className={styles.submitButton} type="submit">신청 완료하기</button>
          </form>

          <aside className={styles.sidePanel}>
            <p className="eyebrow">AFTER SUBMIT</p>
            <h2>신청 완료 후 데이터는 고객관리로 연결됩니다.</h2>
            <div className={styles.flowList}>
              <div>
                <strong>01 서비스 선택</strong>
                <span>신청 서비스에 따라 회원구분이 자동으로 정리됩니다.</span>
              </div>
              <div>
                <strong>02 PAR-Q 확인</strong>
                <span>예 항목이 있으면 고객관리에서 주의 확인 대상으로 표시됩니다.</span>
              </div>
              <div>
                <strong>03 고객관리 저장</strong>
                <span>담당 코치가 상담 화면에서 바로 이어서 기록할 수 있습니다.</span>
              </div>
            </div>
            <div className={styles.notice}>
              <strong>기존 노션 설문</strong>
              <span>노션에 있던 이름, 연락처, 목표, 방문 목적, 통증 부위, 통증 강도, 주의사항, PAR-Q 예항목 구조를 홈페이지 폼으로 옮겼습니다.</span>
            </div>
            <div className={styles.sideActions}>
              <Link href="/services">서비스 다시 보기</Link>
              <Link href="/contact">직접 문의</Link>
            </div>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}
