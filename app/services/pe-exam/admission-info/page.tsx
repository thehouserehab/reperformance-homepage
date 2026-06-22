import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "체대입시 정보 | RePERFORMANCE",
  description: "RePERFORMANCE 체대입시 정보 허브에서 대학별 정보와 전형 일정을 확인합니다.",
};

export default function PeExamAdmissionInfoPage() {
  redirect("/pe-exam#universities");
}
