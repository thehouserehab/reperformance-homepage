import ServiceEditorialPage from "../../_components/ServiceEditorialPage";
import { serviceItems } from "../../_components/siteData";

const item = serviceItems[0];

export default function SeniorRehabPage() {
  return (
    <ServiceEditorialPage
      item={item}
      eyebrow="01 SENIOR REHAB"
      statement="다시 편하게 걷는 일상은 작은 움직임의 회복에서 시작합니다."
      principles={["일상 동작 중심", "안전한 강도 조절", "지속 가능한 회복"]}
    />
  );
}
