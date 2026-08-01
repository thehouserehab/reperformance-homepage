"use client";

import { LockKeyhole, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { useAppState } from "./AppStateProvider";
import type { GuardianPermissionKey } from "@/lib/types";

const permissionItems: { key: GuardianPermissionKey; title: string; description: string }[] = [
  { key: "attendance", title: "출결 확인", description: "수업·상담 참석 여부와 다음 일정을 공개합니다." },
  { key: "contract", title: "계약·결제", description: "계약 진행과 결제 완료 여부만 공개합니다. 금액 상세는 포함하지 않습니다." },
  { key: "academics", title: "학업", description: "공부 시간과 계획 이행의 주간 요약을 공개합니다." },
  { key: "practical", title: "실기", description: "종목별 최근 기록과 변화 요약을 공개합니다." },
];

export function PrivacySettings() {
  const { state, setGuardianPermission } = useAppState();
  const sharedCount = Object.values(state.guardianPermissions).filter(Boolean).length;

  return (
    <>
      <section className="privacy-summary-band">
        <ShieldCheck aria-hidden="true" size={30} />
        <div>
          <span>현재 공개 중</span>
          <strong>{sharedCount}개 항목</strong>
          <p>변경한 설정은 이 기기의 프로토타입에 바로 반영됩니다.</p>
        </div>
      </section>

      <section className="permission-section" aria-labelledby="guardian-permission-title">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">MY PRIVACY</p>
            <h2 id="guardian-permission-title">부모님에게 공개하고 싶은 정보</h2>
          </div>
        </div>

        <div className="always-allowed-row">
          <MessageCircleQuestion aria-hidden="true" size={22} />
          <div>
            <strong>문의 메시지</strong>
            <p>학부모가 코치에게 문의하는 기능은 기본으로 열려 있습니다.</p>
          </div>
          <span>기본 허용</span>
        </div>

        <div className="permission-list">
          {permissionItems.map((item) => {
            const checked = state.guardianPermissions[item.key];
            return (
              <label key={item.key} className="permission-row">
                <div className="permission-lock"><LockKeyhole aria-hidden="true" size={20} /></div>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
                <span className="toggle-control">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => setGuardianPermission(item.key, event.target.checked)}
                  />
                  <span aria-hidden="true" />
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <aside className="privacy-note">
        <strong>학생과 코치의 전체 대화, 개인 멘탈 기록, 건강·상담 메모, AI 질문 원문은 이 설정과 관계없이 공개하지 않습니다.</strong>
        <p>실제 서비스에서는 미성년자 동의와 계약 관련 법적 의무를 검토한 뒤 예외 범위를 확정합니다.</p>
      </aside>
    </>
  );
}
