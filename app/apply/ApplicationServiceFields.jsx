'use client';

import { useState } from 'react';
import styles from './Apply.module.css';

export default function ApplicationServiceFields({
  initialService,
  serviceItems,
  peExamEvents,
}) {
  const [selectedService, setSelectedService] = useState(initialService);
  const isPeExam = selectedService === 'pe-exam';

  return (
    <section className={styles.formSection} aria-labelledby="application-service-title">
      <div className={styles.sectionTitle}>
        <span>01</span>
        <strong id="application-service-title">서비스 선택</strong>
        <em className={styles.sectionBadge}>필수</em>
      </div>

      <div className={styles.serviceGrid}>
        {serviceItems.map((item) => (
          <label className={styles.serviceOption} key={item.applicationValue}>
            <input
              checked={item.applicationValue === selectedService}
              name="service"
              onChange={(event) => setSelectedService(event.target.value)}
              required
              type="radio"
              value={item.applicationValue}
            />
            <span className={styles.serviceText}>
              <em>{item.number} · {item.label}</em>
              <strong>{item.title}</strong>
              <small>{item.target}</small>
            </span>
          </label>
        ))}
      </div>

      {isPeExam ? (
        <div className={styles.serviceSpecificPanel} aria-live="polite">
          <div className={styles.serviceSpecificHead}>
            <div>
              <span>PE EXAM DETAILS</span>
              <strong>체대입시 상담 준비 정보</strong>
            </div>
            <em>모두 선택 입력</em>
          </div>
          <p>
            알고 있는 내용만 남겨 주세요. 목표 대학이나 현재 기록이 정리되지 않았다면 상담에서 함께 확인합니다.
          </p>

          <div className={styles.formGrid}>
            <label>
              <span>희망 대학</span>
              <input name="peExamTargetUniversities" placeholder="예: 한체대, 용인대, 전북대" type="text" />
            </label>
            <label>
              <span>목표 학과</span>
              <input name="peExamTargetDepartment" placeholder="예: 체육교육과, 스포츠과학과" type="text" />
            </label>
          </div>

          <div>
            <span className={styles.groupLabel}>준비 실기 종목</span>
            <div className={styles.checkGrid}>
              {peExamEvents.map((item) => (
                <label className={styles.checkCard} key={item}>
                  <input name="peExamPracticalEvents" type="checkbox" value={item} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <label>
            <span>현재 실기 기록 / 내신·수능 상태 / 상담하고 싶은 내용</span>
            <textarea
              name="peExamMemo"
              placeholder="예: 제자리멀리뛰기 225cm, 윗몸 52개. 내신 4등급대이며 실기 반영이 높은 대학을 찾고 싶습니다."
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
