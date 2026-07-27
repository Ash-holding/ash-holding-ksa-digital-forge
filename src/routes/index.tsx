import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Hero, About, Services, Hosting, Marketing, Process, ClientPortal, Why, CTA,
} from "@/components/site/Sections";
import {
  HomeLogos, HomeStats, HomeFeaturedProjects, HomeTestimonials,
} from "@/components/site/HomeExtras";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <HomeLogos />
        <About />
        <HomeStats />
        <Services />
        <HomeFeaturedProjects />
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

