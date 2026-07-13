import ServiceEditorialPage from "../../_components/ServiceEditorialPage";
import { serviceItems } from "../../_components/siteData";

const item = serviceItems[1];

export default function AthleteReconditioningPage() {
  return (
    <ServiceEditorialPage
      item={item}
      eyebrow="02 ATHLETE RECONDITIONING"
      statement="복귀는 다시 뛰는 순간이 아니라, 다시 버틸 수 있는 몸을 만드는 과정입니다."
      principles={["복귀 단계 설계", "움직임 품질 확인", "경기력 재구축"]}
    />
  );
}
