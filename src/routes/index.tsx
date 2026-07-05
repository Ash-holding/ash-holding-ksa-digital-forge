import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Hero, About, Services, Process, Products, Hosting, Marketing, ClientPortal, Why, CTA,
} from "@/components/site/Sections";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Process />
        <Products />
        <Hosting />
        <Marketing />
        <ClientPortal />
        <Why />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
