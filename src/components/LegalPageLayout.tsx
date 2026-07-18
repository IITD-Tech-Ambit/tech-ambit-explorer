import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

interface LegalSection {
  title: string;
  paragraphs: string[];
  list?: string[];
}

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const LegalPageLayout = ({ title, subtitle, lastUpdated: _lastUpdated, sections }: LegalPageLayoutProps) => (
  <div className="min-h-screen page-bg">
    <Navigation />

    <div className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-8 -ml-2 text-muted-foreground hover:text-foreground group">
          <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Home
        </Button>
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{title}</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">{subtitle}</p>
      </header>

      <article className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground mb-4">{section.title}</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
              {section.list && (
                <ul className="list-disc pl-5 space-y-2">
                  {section.list.map((item) => (
                    <li key={item.slice(0, 40)}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </article>

      <p className="mt-10 text-sm text-muted-foreground">
        Questions? Contact us at{" "}
        <a href="mailto:iitdambit@iitd.ac.in" className="text-primary hover:underline">
          iitdambit@iitd.ac.in
        </a>
        .
      </p>
    </div>

    <Footer />
  </div>
);

export default LegalPageLayout;
