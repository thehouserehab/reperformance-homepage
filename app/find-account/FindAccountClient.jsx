'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './FindAccount.module.css';

const initialForm = {
  name: '',
  phone: '',
  code: '',
  newPassword: '',
  passwordConfirm: '',
};

function getModeLabel(mode) {
  return mode === 'reset-password' ? '비밀번호 재설정' : '아이디 찾기';
}

export default function FindAccountClient() {
  const [mode, setMode] = useState('find-id');
  const [form, setForm] = useState(initialForm);
  const [verificationToken, setVerificationToken] = useState('');
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'name' || name === 'phone' ? { code: '' } : {}),
    }));

    if (name === 'name' || name === 'phone') {
      setVerificationToken('');
      setStatus(null);
      setResult(null);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setVerificationToken('');
    setStatus(null);
    setResult(null);
    setForm(initialForm);
  }

  async function requestCode(event) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    setResult(null);

    try {
      const response = await fetch('/api/auth/account-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request-code',
          purpose: mode,
          name: form.name,
          phone: form.phone,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || '인증번호 요청에 실패했습니다.');
      }

      setVerificationToken(data.verificationToken);
      setStatus({
        tone: data.sms?.setupRequired ? 'warn' : 'good',
        text: data.sms?.message || '인증번호를 보냈습니다.',
        debugCode: data.debugCode,
      });
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || '인증번호 요청에 실패했습니다.' });
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    setResult(null);

    try {
      const response = await fetch('/api/auth/account-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-code',
          purpose: mode,
          verificationToken,
          code: form.code,
          newPassword: form.newPassword,
          passwordConfirm: form.passwordConfirm,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || '인증 확인에 실패했습니다.');
      }

      setResult(data);
      setStatus({
        tone: 'good',
        text: mode === 'find-id' ? '아이디를 확인했습니다.' : data.message,
      });
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || '인증 확인에 실패했습니다.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="container">
      <div className={styles.findAccountPanel}>
        <div className={styles.findAccountTabs} aria-label="계정 찾기 선택">
          <button aria-pressed={mode === 'find-id'} onClick={() => switchMode('find-id')} type="button">
            아이디 찾기
          </button>
          <button aria-pressed={mode === 'reset-password'} onClick={() => switchMode('reset-password')} type="button">
            비밀번호 재설정
          </button>
        </div>

        <div className={styles.findAccountGrid}>
          <form className={styles.findAccountCard} onSubmit={requestCode}>
            <p className="eyebrow">{mode === 'find-id' ? 'FIND ID' : 'RESET PASSWORD'}</p>
            <h2>전화번호 인증</h2>
            <p>가입할 때 입력한 이름과 전화번호를 확인한 뒤 6자리 인증번호를 보냅니다.</p>

            <label>
              이름
              <input name="name" onChange={updateField} required type="text" value={form.name} />
            </label>
            <label>
              전화번호
              <input
                autoComplete="tel"
                inputMode="tel"
                name="phone"
                onChange={updateField}
                placeholder="01012345678"
                required
                type="tel"
                value={form.phone}
              />
            </label>
            <button disabled={pending} type="submit">
              인증번호 받기
            </button>
          </form>

          <form className={styles.findAccountCard} onSubmit={verifyCode}>
            <p className="eyebrow">VERIFY</p>
            <h2>{getModeLabel(mode)}</h2>
            <p>
              받은 인증번호를 입력하면 {mode === 'find-id' ? '아이디를 바로 확인합니다.' : '새 비밀번호로 변경합니다.'}
            </p>

            <label>
              인증번호
              <input
                disabled={!verificationToken}
                inputMode="numeric"
                maxLength={6}
                name="code"
                onChange={updateField}
                pattern="[0-9]*"
                required
                type="text"
                value={form.code}
              />
            </label>

            {mode === 'reset-password' ? (
              <>
                <label>
                  새 비밀번호
                  <input
                    autoComplete="new-password"
                    disabled={!verificationToken}
                    minLength={6}
                    name="newPassword"
                    onChange={updateField}
                    required
                    type="password"
                    value={form.newPassword}
                  />
                </label>
                <label>
                  새 비밀번호 확인
                  <input
                    autoComplete="new-password"
                    disabled={!verificationToken}
                    minLength={6}
                    name="passwordConfirm"
                    onChange={updateField}
                    required
                    type="password"
                    value={form.passwordConfirm}
                  />
                </label>
              </>
            ) : null}

            <button disabled={pending || !verificationToken} type="submit">
              {mode === 'find-id' ? '아이디 확인하기' : '비밀번호 변경하기'}
            </button>
          </form>
        </div>

        {status ? (
          <div className={styles.findAccountStatus} data-tone={status.tone}>
            <strong>{status.text}</strong>
            {status.debugCode ? <span>개발 확인용 인증번호: {status.debugCode}</span> : null}
          </div>
        ) : null}

        {result?.username ? (
          <div className={styles.findAccountResult}>
            <span>{mode === 'find-id' ? '확인된 아이디' : '비밀번호가 변경된 아이디'}</span>
            <strong>{result.username}</strong>
            <Link className="button primary" href="/login">
              로그인하기
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
