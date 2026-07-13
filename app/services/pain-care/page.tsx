import ServiceEditorialPage from "../../_components/ServiceEditorialPage";
import { serviceItems } from "../../_components/siteData";

const item = serviceItems[2];

export default function PainCarePage() {
  return (
    <ServiceEditorialPage
      item={item}
      eyebrow="03 PAIN CARE"
      statement="운동을 참는 시간이 아니라, 다시 움직임을 믿는 과정을 만듭니다."
      principles={["불편 동작 확인", "가능 범위 우선", "기초 체력 회복"]}
    />
  );
}
