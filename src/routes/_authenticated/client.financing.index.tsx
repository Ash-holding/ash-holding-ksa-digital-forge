import { createFileRoute } from "@tanstack/react-router";
import { ClientFinancingHub } from "@/components/financing/ClientFinancingHub";

export const Route = createFileRoute("/_authenticated/client/financing/")({
  component: ClientFinancingHub,
  head: () => ({
    meta: [
      { title: "تمويل خدمات ASH — طلباتي" },
      { name: "description", content: "احسب قسطك، احصل على تقييم ائتماني فوري، وقدّم طلب تمويل خدمات آش هولدنق." },
      { property: "og:title", content: "تمويل خدمات ASH — طلباتي" },
      { property: "og:description", content: "حاسبة قسط ذكية، تقييم ائتماني داخلي، وتتبع لحظي لطلبات تمويل خدمات ASH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});