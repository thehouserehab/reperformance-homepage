'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './Signup.module.css';

const verificationOptions = [
  { value: 'phone', label: '전화번호', placeholder: '01012345678', type: 'tel', autoComplete: 'tel' },
  { value: 'email', label: '이메일', placeholder: 'member@example.com', type: 'email', autoComplete: 'email' },
  { value: 'kakao', label: '카카오톡', placeholder: '카카오톡 ID 또는 연결 연락처', type: 'text', autoComplete: 'off' },
];

function getCurrentOption(method) {
  return verificationOptions.find((option) => option.value === method) || verificationOptions[0];
}

export default function SignupClient({ status, message }) {
  const [form, setForm] = useState({
    verificationMethod: 'phone',
    verificationContact: '',
    verificationCode: '',
    identityToken: '',
    verificationToken: '',
  });
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [pending, setPending] = useState(false);
  const currentOption = getCurrentOption(form.verificationMethod);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'verificationMethod' || name === 'verificationContact'
        ? { verificationCode: '', identityToken: '', verificationToken: '' }
        : {}),
    }));
    if (name === 'verificationMethod' || name === 'verificationContact') setVerificationStatus(null);
  }

  async function requestCode() {
    setPending(true);
    setVerificationStatus(null);

    try {
      const response = await fetch('/api/auth/identity-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request-code',
          purpose: 'signup',
          verificationMethod: form.verificationMethod,
          verificationContact: form.verificationContact,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) throw new Error(data.error || '인증번호 요청에 실패했습니다.');

      setForm((current) => ({ ...current, verificationToken: data.verificationToken, identityToken: '' }));
      setVerificationStatus({
        tone: data.delivery?.setupRequired ? 'warn' : 'good',
        text: data.delivery?.message || '인증번호를 보냈습니다.',
        debugCode: data.debugCode,
      });
    } catch (error) {
      setVerificationStatus({ tone: 'error', text: error.message || '인증번호 요청에 실패했습니다.' });
    } finally {
      setPending(false);
    }
  }

  async function verifyCode() {
    setPending(true);
    setVerificationStatus(null);

    try {
      const response = await fetch('/api/auth/identity-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-code',
          purpose: 'signup',
          verificationToken: form.verificationToken,
          code: form.verificationCode,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) throw new Error(data.error || '인증번호 확인에 실패했습니다.');

      setForm((current) => ({ ...current, identityToken: data.identityToken }));
      setVerificationStatus({ tone: 'good', text: '본인 인증이 완료되었습니다.' });
    } catch (error) {
      setVerificationStatus({ tone: 'error', text: error.message || '인증번호 확인에 실패했습니다.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`container ${styles.layout}`}>
      <form className={styles.form} action="/api/rp/signup" method="post">
        <input name="requestedRole" type="hidden" value="member" />
        <input name="identityToken" type="hidden" value={form.identityToken} />

        {message && (
          <div className={status === 'success' || status === 'created' || status === 'pending' ? styles.success : styles.error}>
            <strong>{message.title}</strong>
            <span>{message.body}</span>
          </div>
        )}

        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <span>01</span>
            <strong>본인 인증</strong>
          </div>
          <div className={styles.formGrid}>
            <label>
              <span>인증 수단</span>
              <select name="verificationMethod" onChange={updateField} value={form.verificationMethod}>
                {verificationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{currentOption.label}</span>
              <input
                autoComplete={currentOption.autoComplete}
                name="verificationContact"
                onChange={updateField}
                placeholder={currentOption.placeholder}
                required
                type={currentOption.type}
                value={form.verificationContact}
              />
            </label>
          </div>
          <div className={styles.verificationBox}>
            <button disabled={pending || !form.verificationContact} onClick={requestCode} type="button">
              인증번호 받기
            </button>
            <label>
              <span>인증번호</span>
              <input
                inputMode="numeric"
                maxLength={6}
                name="verificationCode"
                onChange={updateField}
                pattern="[0-9]*"
                placeholder="6자리"
                type="text"
                value={form.verificationCode}
              />
            </label>
            <button disabled={pending || !form.verificationToken || !form.verificationCode} onClick={verifyCode} type="button">
              인증 확인
            </button>
          </div>
          {verificationStatus ? (
            <div className={styles.verificationStatus} data-tone={verificationStatus.tone}>
              <strong>{verificationStatus.text}</strong>
              {verificationStatus.debugCode ? <span>개발 확인용 인증번호: {verificationStatus.debugCode}</span> : null}
            </div>
          ) : null}
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <span>02</span>
            <strong>계정 정보</strong>
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
              <span>비밀번호</span>
              <input name="password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label>
              <span>비밀번호 확인</span>
              <input name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} required />
            </label>
          </div>
          <p className={styles.helperText}>
            회원 계정은 본인 인증 후 바로 생성됩니다. 트레이너와 관리자 권한은 운영자가 별도로 승인합니다.
          </p>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <span>03</span>
            <strong>선택 메모</strong>
          </div>
          <label>
            <span>계정 신청 메모</span>
            <textarea name="message" placeholder="운동 목적, 체대입시 상담 필요 여부, 계정 사용 목적 등을 적어주세요." />
          </label>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <span>04</span>
            <strong>동의</strong>
          </div>
          <label className={styles.checkLabel}>
            <input name="privacyConsent" type="checkbox" value="yes" required />
            <span>계정 생성과 본인 확인을 위해 이름, 인증 연락처, 신청 내용을 저장하는 것에 동의합니다.</span>
          </label>
        </div>

        <button disabled={!form.identityToken} type="submit">
          회원가입 완료
        </button>
      </form>

      <aside className={styles.sidePanel}>
        <p className="eyebrow">ROLE ACCESS</p>
        <h2>가입 절차는 짧게, 운영 권한은 승인제로 관리합니다.</h2>
        <div className={styles.roleList}>
          <div className={styles.roleCard}>
            <strong>회원</strong>
            <span>본인 인증 후 바로 생성되는 기본 계정입니다. 상담 신청, 체대입시 질문, AI 상담 준비에 사용합니다.</span>
          </div>
          <div className={styles.roleCard}>
            <strong>트레이너</strong>
            <span>고객관리와 상담 화면 접근 권한은 운영자가 확인한 뒤 기존 회원 계정에 부여합니다.</span>
          </div>
          <div className={styles.roleCard}>
            <strong>관리자</strong>
            <span>전체 고객 데이터와 운영 화면 접근은 수동 승인으로만 열립니다.</span>
          </div>
        </div>
        <div className={styles.notice}>
          <strong>로그인 유지</strong>
          <span>로그인 세션은 기본 14일 동안 유지됩니다.</span>
        </div>
        <div className={styles.actions}>
          <Link href="/login">로그인</Link>
          <Link href="/find-account">계정 찾기</Link>
        </div>
      </aside>
    </div>
  );
}
