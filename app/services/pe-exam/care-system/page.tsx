import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "체대입시 준비 안내 | RePERFORMANCE",
  description: "RePERFORMANCE 체대입시 정보 허브에서 준비 로드맵과 상담 흐름을 확인합니다.",
};

export default function PeExamCareSystemPage() {
  redirect("/pe-exam#roadmap");
}
