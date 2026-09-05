"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList, Database, LockKeyhole, MessageCircleQuestion, MessagesSquare, ShieldCheck, Trash2, X } from "lucide-react";
import { appRoleDefinitions, appRoleOrder } from "@/lib/appStructure";
import { useAppState } from "./AppStateProvider";
import { formatAttachmentSize } from "@/lib/messageAttachments";
import { getPrototypeDataSummary } from "@/lib/prototypeDataLifecycle";
import type { GuardianPermissionKey } from "@/lib/types";

const permissionItems: { key: GuardianPermissionKey; title: string; description: string }[] = [
  { key: "attendance", title: "출결 확인", description: "수업·상담 참석 여부와 다음 일정을 공개합니다." },
  { key: "contract", title: "계약·결제", description: "계약 진행과 결제 완료 여부만 공개합니다. 금액 상세는 포함하지 않습니다." },
  { key: "academics", title: "학업", description: "공부 시간과 계획 이행의 주간 요약을 공개합니다." },
  { key: "practical", title: "실기", description: "종목별 최근 기록과 변화 요약을 공개합니다." },
];

export function PrivacySettings() {
  const { state, hydrated, setGuardianPermission, clearPrototypeData } = useAppState();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const sharedCount = Object.values(state.guardianPermissions).filter(Boolean).length;
  const dataSummary = getPrototypeDataSummary(state);

  const confirmClear = async () => {
    if (clearing) return;
    setClearing(true);
    setClearStatus(null);

    try {
      const result = await clearPrototypeData();
      if (!result.stateCleared) {
        setClearStatus({
          tone: "error",
          message: "브라우저 저장소를 비우지 못했습니다. 저장 권한을 확인한 뒤 다시 시도해 주세요.",
        });
        return;
      }

      if (result.failedScopes.length > 0) {
        const failedLabels = result.failedScopes.map((scope) =>
          scope === "attachments" ? "사진·영상 첨부" : "작성 중인 임시 초안"
        );
        setClearStatus({
          tone: "error",
          message: `일정·기록·메시지는 삭제했지만 ${failedLabels.join("과 ")} 삭제가 완료되지 않았습니다. 다른 RP APP 탭을 닫고 다시 시도해 주세요.`,
        });
      } else {
        setClearStatus({
          tone: "success",
          message: "이 기기의 일정·기록·메시지·첨부파일과 공개 설정을 삭제했습니다.",
        });
      }
      setConfirmationOpen(false);
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <section className="mypage-quicklinks" aria-label="바로가기">
        <Link href="/student/records" className="mypage-quicklink">
          <ClipboardList aria-hidden="true" size={20} />
          <span>기록</span>
        </Link>
        <Link href="/student/consultation" className="mypage-quicklink">
          <MessagesSquare aria-hidden="true" size={20} />
          <span>상담</span>
        </Link>
      </section>

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

      <section className="device-data-section" aria-labelledby="device-data-title" aria-busy={clearing}>
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">DEVICE DATA</p>
            <h2 id="device-data-title">이 기기에 저장된 내 데이터</h2>
            <p>현재 프로토타입은 계정 서버가 아니라 이 브라우저에 데이터를 저장합니다.</p>
          </div>
          <Database aria-hidden="true" size={24} />
        </div>

        <dl className="device-data-summary">
          <div><dt>할 일·일정</dt><dd>{hydrated ? `${dataSummary.tasksAndEvents}개` : "확인 중"}</dd></div>
          <div><dt>공부·기록</dt><dd>{hydrated ? `${dataSummary.studyAndRecords}개` : "확인 중"}</dd></div>
          <div><dt>메시지</dt><dd>{hydrated ? `${dataSummary.messages}개` : "확인 중"}</dd></div>
          <div>
            <dt>사진·영상 첨부</dt>
            <dd>
              {hydrated
                ? `${dataSummary.attachments}개${dataSummary.attachmentBytes ? ` · ${formatAttachmentSize(dataSummary.attachmentBytes)}` : ""}`
                : "확인 중"}
            </dd>
          </div>
          <div><dt>사용자 기록 항목</dt><dd>{hydrated ? `${dataSummary.customRecordItems}개` : "확인 중"}</dd></div>
          <div><dt>학부모 공개 항목</dt><dd>{hydrated ? `${dataSummary.sharedGuardianFields}개` : "확인 중"}</dd></div>
        </dl>

        <div className="device-data-boundary">
          <strong>삭제 범위</strong>
          <p>이 브라우저의 할 일, 일정, 공부·실기·컨디션 기록, 메시지, 사진·영상, 임시 초안, 사용자 항목과 학부모 공개 설정을 삭제합니다.</p>
          <p>시스템 기록 항목과 앱 자체는 남습니다. 서버 계정이나 외부 캘린더·파일을 삭제하는 기능이 아니며 삭제한 브라우저 데이터는 복구할 수 없습니다.</p>
        </div>

        {confirmationOpen ? (
          <div className="device-data-confirmation" role="alert" aria-labelledby="device-data-confirm-title">
            <div>
              <strong id="device-data-confirm-title">정말 이 기기의 데이터를 삭제할까요?</strong>
              <p>현재 브라우저의 모든 역할 미리보기 데이터가 함께 비워집니다.</p>
            </div>
            <div className="device-data-confirm-actions">
              <button type="button" className="secondary" onClick={() => setConfirmationOpen(false)} disabled={clearing}>
                <X aria-hidden="true" size={17} /> 취소
              </button>
              <button type="button" className="danger" onClick={confirmClear} disabled={clearing}>
                <Trash2 aria-hidden="true" size={17} /> {clearing ? "삭제 중" : "이 기기 데이터 삭제 확인"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="device-data-clear-button"
            onClick={() => {
              setConfirmationOpen(true);
              setClearStatus(null);
            }}
            disabled={!hydrated || clearing}
          >
            <Trash2 aria-hidden="true" size={18} /> 이 기기 데이터 삭제
          </button>
        )}

        {clearStatus ? (
          <p className={`device-data-status ${clearStatus.tone}`} role="status" aria-live="polite">
            {clearStatus.message}
          </p>
        ) : null}
      </section>

      <section className="dev-role-preview" aria-labelledby="dev-role-preview-title">
        <p className="section-kicker">DEV ONLY</p>
        <h2 id="dev-role-preview-title">개발 화면 미리보기</h2>
        <div className="dev-role-preview-links">
          {appRoleOrder.map((previewRole) => {
            const preview = appRoleDefinitions[previewRole];
            return (
              <Link key={previewRole} href={preview.homeHref} aria-current={previewRole === "student" ? "page" : undefined}>
                {preview.label}
              </Link>
            );
          })}
        </div>
        <small>운영 버전에서는 로그인한 역할만 표시됩니다.</small>
      </section>
    </>
  );
}
