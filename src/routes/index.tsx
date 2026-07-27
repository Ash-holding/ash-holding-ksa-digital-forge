import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Hero, About, Services, Hosting, Marketing, Process, ClientPortal, Why, CTA,
} from "@/components/site/Sections";
import {
  HomeLogos, HomeStats, HomeTestimonials,
} from "@/components/site/HomeExtras";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ASH HOLDING | حلول رقمية سعودية" },
      {
        name: "description",
        content: "شركة ASH HOLDING تقدم تطوير المواقع والتطبيقات والأنظمة والاستضافة والتسويق الرقمي للشركات في السعودية.",
      },
      { property: "og:title", content: "ASH HOLDING | حلول رقمية سعودية" },
      {
        property: "og:description",
        content: "حلول رقمية متكاملة لبناء وتشغيل مواقع وتطبيقات وأنظمة أعمال احترافية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.hash === "#portal") {
      navigate({ to: "/login", replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <HomeLogos />
        <About />
        <HomeStats />
        <Services />
        <Hosting />
        <Marketing />
        <Process />
        <HomeTestimonials />
        <ClientPortal />
        <Why />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

