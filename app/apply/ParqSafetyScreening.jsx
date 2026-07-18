'use client';

import { useState } from 'react';
import styles from './Apply.module.css';

export default function ParqSafetyScreening({ questions }) {
  const [screening, setScreening] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [memo, setMemo] = useState('');
  const needsReview = screening === 'review';

  function updateScreening(value) {
    setScreening(value);
    if (value === 'none') {
      setSelectedItems([]);
      setMemo('');
    }
  }

  function updateSelectedItem(question, checked) {
    setSelectedItems((current) => (
      checked ? [...current, question] : current.filter((item) => item !== question)
    ));
  }

  return (
    <section className={styles.formSection} aria-labelledby="parq-screening-title">
      <div className={styles.sectionTitle}>
        <span>06</span>
        <strong id="parq-screening-title">운동 전 안전 확인</strong>
        <em className={styles.sectionBadge}>1개 선택 필수</em>
      </div>
      <p className={styles.helperText}>
        긴 설문을 모두 작성하지 않아도 됩니다. 현재 운동 전에 코치가 확인해야 할 건강·통증 관련 내용이 있는지만 먼저 알려 주세요.
      </p>

      <fieldset className={styles.safetyChoiceFieldset}>
        <legend className={styles.srOnly}>운동 전 확인 필요 여부</legend>
        <div className={styles.safetyChoiceGrid}>
          <label className={styles.safetyChoiceOption}>
            <input
              checked={screening === 'none'}
              name="parqScreening"
              onChange={(event) => updateScreening(event.target.value)}
              required
              type="radio"
              value="none"
            />
            <span>
              <strong>현재 해당 사항 없음</strong>
              <small>운동 제한, 흉통, 실신, 치료 중 부상 등 별도 확인이 필요한 내용이 없습니다.</small>
            </span>
          </label>
          <label className={styles.safetyChoiceOption}>
            <input
              checked={screening === 'review'}
              name="parqScreening"
              onChange={(event) => updateScreening(event.target.value)}
              required
              type="radio"
              value="review"
            />
            <span>
              <strong>코치가 확인할 내용 있음</strong>
              <small>해당되는 항목만 추가로 선택하면 상담 전에 안전하게 준비할 수 있습니다.</small>
            </span>
          </label>
        </div>
      </fieldset>

      {needsReview ? (
        <div className={styles.safetyDetails} aria-live="polite">
          <div className={styles.parqList}>
            {questions.map((question) => (
              <label className={styles.parqCard} key={question}>
                <input
                  checked={selectedItems.includes(question)}
                  name="parqYesItems"
                  onChange={(event) => updateSelectedItem(question, event.target.checked)}
                  type="checkbox"
                  value={question}
                />
                <span>{question}</span>
              </label>
            ))}
          </div>
          <label>
            <span>추가로 알려야 할 건강 상태</span>
            <textarea
              name="parqMemo"
              onChange={(event) => setMemo(event.target.value)}
              placeholder="위 항목에 없거나 의료진에게 운동 제한 안내를 받은 내용이 있다면 적어주세요."
              required={needsReview && selectedItems.length === 0}
              value={memo}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
