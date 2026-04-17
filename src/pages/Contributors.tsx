import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Linkedin, Mail, Users, Heart, Sparkles, Send, UserPlus, GraduationCap, Award, Star, CheckCircle2, X, Globe } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

import deanAvatar from "@/assets/image(Dean).png";
import mentor1Avatar from "@/assets/image(OM).png";
import mentor2Avatar from "@/assets/image(Harun).png";
import mentor3Avatar from "@/assets/image(Shilpi).png";
import mentor4Avatar from "@/assets/archana.jpeg";

/* ───────── Data ───────── */

interface TeamMember {
  name: string;
  role: string;
  avatar?: string;
  entryNumber?: string;
  linkedin?: string;
  email?: string;
}

const dean: TeamMember = {
  name: "Prof. Aswhwini K Aggarwal",
  role: "Dean in Charge",
  avatar: deanAvatar,
  linkedin: "https://textile.iitd.ac.in/faculty-profile/7",
  email: "mailto:ashwini@textile.iitd.ac.in",
};

const mentors: TeamMember[] = [
  {
    name: "Prof. Shilpi Sharma",
    role: "Mentor",
    avatar: mentor3Avatar,
    linkedin: "https://beb.iitd.ac.in/shilpi.html",
    email: "mailto:shilpi@dbeb.iitd.ac.in",
  },
  {
    name: "Prof. Omprakash",
    role: "Mentor",
    avatar: mentor1Avatar,
    linkedin: "https://iprana-lab.github.io/",
    email: "mailto:omprakash@iitd.ac.in",
  },
  {
    name: "Prof. Harun Venkatesan",
    role: "Mentor",
    avatar: mentor2Avatar,
    linkedin: "https://textile.iitd.ac.in/faculty-profile/22",
    email: "mailto:harun@textile.iitd.ac.in",
  },
  {
    name: "Dr. Archana Trivedi",
    role: "Mentor",
    avatar: mentor4Avatar,
    linkedin: "https://www.linkedin.com/in/archana-trivedi-a1968115/?originalSubdomain=in",
    email: "mailto:ird12649@iitd.ac.in",
  },
];

const phaseContributors: TeamMember[] = [
  {
    name: "Anuradha Barnwal",
    role: "Operations",
    entryNumber: "bb1230659@iitd.ac.in",
    linkedin: "https://www.linkedin.com/in/anuradha-barnwal-701674229?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "bb1230659@iitd.ac.in",
  },
  {
    name: "Rahul Arvind Masand",
    role: "Operations",
    entryNumber: "ch7221476@iitd.ac.in",
    linkedin: "https://www.linkedin.com/in/rahul-masand-787010250?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "ch7221476@iitd.ac.in",
  },
  {
    name: "Nikhil Gupta",
    role: "Journalism",
    entryNumber: "ch1221016@iitd.ac.in",
    linkedin: "https://www.linkedin.com/in/nikhil-gupta-b67786252?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "ch1221016@iitd.ac.in",
  },
  {
    name: "Sudarshan Kumar",
    role: "Tech",
    entryNumber: "ch7221511@iitd.ac.in",
    linkedin: "https://www.linkedin.com/in/sudarshan-iiitd?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "ch7221511@iitd.ac.in",
  },
  {
    name: "Prem Bhugra",
    role: "Tech",
    entryNumber: "ch7221038@iitd.ac.in",
    linkedin: "https://www.linkedin.com/in/prembhugra-iitd?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "ch7221038@iitd.ac.in",
  },
  {
    name: "Vivek Kumar",
    role: "Tech",
    entryNumber: "ce1221555@iitd.ac.in",
    linkedin: "https://www.linkedin.com/in/vivek-kumar-0b344124b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "ce1221555@iitd.ac.in",
  },
  {
    name: "Shubham Chawla",
    role: "Tech",
    entryNumber: "ch7221507@iitd.ac.in",
    linkedin: "https://www.linkedin.com/in/shubham-chawla-8b4ab3257?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "ch7221507@iitd.ac.in",
  },
];

/* ───────── Success Popup ───────── */

const SuccessPopup = ({
  show,
  title,
  message,
  onClose,
}: {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card dark:bg-slate-800 border border-border/40 rounded-3xl shadow-2xl shadow-primary/10 p-8 max-w-md w-full animate-in zoom-in-95 fade-in duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success icon with animated ring */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-center text-foreground mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-center text-muted-foreground mb-6 leading-relaxed">
          {message}
        </p>

        {/* Decorative sparkles */}
        <div className="flex justify-center gap-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-teal-400"
              style={{ animationDelay: `${i * 100}ms`, opacity: 0.3 + i * 0.15 }}
            />
          ))}
        </div>

        {/* Close Button */}
        <Button
          onClick={onClose}
          className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/20 transition-all duration-300"
        >
          Got it!
        </Button>
      </div>
    </div>
  );
};

/* ───────── Reusable Card (Dean & Mentors — with photo) ───────── */

const MemberCard = ({
  member,
  large = false,
}: {
  member: TeamMember;
  large?: boolean;
}) => (
  <div
    className={cn(
      "group relative flex flex-col items-center rounded-3xl border border-border/30",
      "bg-card/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-lg",
      "transition-all duration-500 hover:shadow-2xl hover:shadow-primary/15",
      "hover:-translate-y-2 hover:border-primary/30",
      large ? "px-10 py-12" : "px-8 py-10"
    )}
  >
    {/* Animated hover glow */}
    <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-blue-500/5 via-primary/5 to-teal-500/5" />

    {/* Top decorative stripe */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-b-full bg-gradient-to-r from-blue-500 via-primary to-teal-400 opacity-60 group-hover:w-32 group-hover:opacity-100 transition-all duration-500" />

    {/* Avatar with gradient ring */}
    {member.avatar && (
      <div
        className={cn(
          "relative mb-6 rounded-full p-[3px] bg-gradient-to-br from-blue-500 via-primary to-teal-400",
          "shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-500",
          "group-hover:scale-105",
          large ? "w-36 h-36" : "w-28 h-28"
        )}
      >
        <img
          src={member.avatar}
          alt={member.name}
          className="w-full h-full rounded-full object-cover bg-background"
        />
      </div>
    )}

    {/* Name */}
    <h3
      className={cn(
        "font-bold text-center bg-gradient-to-r from-blue-400 via-primary to-teal-400 bg-clip-text text-transparent",
        large ? "text-2xl mb-2" : "text-lg mb-1"
      )}
    >
      {member.name}
    </h3>

    {/* Role */}
    <p className="text-muted-foreground text-sm mb-5 font-medium">{member.role}</p>

    {/* Social links */}
    <div className="flex items-center gap-3">
      {member.linkedin && (
        <a
          href={member.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/10"
          aria-label={`${member.name} Website`}
        >
          <Globe className="w-4 h-4" />
        </a>
      )}
      {member.email && (
        <a
          href={member.email.startsWith("mailto:") ? member.email : `mailto:${member.email}`}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-primary/10"
          aria-label={`Email ${member.name}`}
        >
          <Mail className="w-4 h-4" />
        </a>
      )}
    </div>
  </div>
);

/* ───────── Contributor Card (no photo, clickable entry, LinkedIn only) ───────── */

const ContributorCard = ({
  member,
  index,
}: {
  member: TeamMember;
  index: number;
}) => {
  const accents = [
    { bg: "from-blue-500/15 to-indigo-500/15", icon: "text-blue-400", border: "hover:border-blue-400/40", glow: "group-hover:shadow-blue-500/10" },
    { bg: "from-emerald-500/15 to-teal-500/15", icon: "text-emerald-400", border: "hover:border-emerald-400/40", glow: "group-hover:shadow-emerald-500/10" },
    { bg: "from-purple-500/15 to-violet-500/15", icon: "text-purple-400", border: "hover:border-purple-400/40", glow: "group-hover:shadow-purple-500/10" },
    { bg: "from-amber-500/15 to-orange-500/15", icon: "text-amber-400", border: "hover:border-amber-400/40", glow: "group-hover:shadow-amber-500/10" },
    { bg: "from-cyan-500/15 to-sky-500/15", icon: "text-cyan-400", border: "hover:border-cyan-400/40", glow: "group-hover:shadow-cyan-500/10" },
    { bg: "from-rose-500/15 to-pink-500/15", icon: "text-rose-400", border: "hover:border-rose-400/40", glow: "group-hover:shadow-rose-500/10" },
  ];
  const a = accents[index % accents.length];

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center rounded-3xl border border-border/20",
        "bg-card/60 dark:bg-slate-800/60 backdrop-blur-xl",
        "shadow-md transition-all duration-500 hover:shadow-2xl hover:-translate-y-2",
        a.border, a.glow,
        "px-6 py-8 overflow-hidden"
      )}
    >
      {/* Hover gradient overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700", a.bg)} />

      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-[3rem] opacity-80" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-accent/5 to-transparent rounded-tr-[2rem] opacity-60" />

      {/* Graduation icon */}
      <div className={cn(
        "relative z-10 w-16 h-16 rounded-2xl mb-5 flex items-center justify-center",
        "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800",
        "border border-border/30 shadow-md",
        "group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
      )}>
        <GraduationCap className={cn("w-7 h-7", a.icon)} />
      </div>

      {/* Name */}
      <h3 className="relative z-10 font-bold text-lg text-center text-foreground mb-1.5 group-hover:text-primary transition-colors duration-300">
        {member.name}
      </h3>

      {/* Role badge */}
      <span className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
        <Star className="w-3 h-3" />
        {member.role}
      </span>

      {/* Entry number — mailto link */}
      {member.entryNumber && (
        <a
          href={`mailto:${member.entryNumber}`}
          className="relative z-10 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-medium tracking-wide mb-5 transition-colors duration-300 group/entry"
        >
          <Mail className="w-3.5 h-3.5 group-hover/entry:scale-110 transition-transform" />
          <span className="border-b border-dashed border-muted-foreground/40 group-hover/entry:border-primary/60 pb-px">
            {member.entryNumber}
          </span>
        </a>
      )}

      {/* LinkedIn button */}
      {member.linkedin && (
        <a
          href={member.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
          aria-label={`${member.name} LinkedIn`}
        >
          <Linkedin className="w-4 h-4" />
          LinkedIn
        </a>
      )}
    </div>
  );
};

/* ───────── Section Heading ───────── */

const SectionHeading = ({
  children,
  subtitle,
  className,
}: {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
}) => (
  <div className={cn("text-center mb-14", className)}>
    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
      {children}
    </h2>
    <div className="mx-auto w-20 h-1 rounded-full bg-gradient-to-r from-blue-500 via-primary to-teal-400 mb-4" />
    {subtitle && (
      <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">{subtitle}</p>
    )}
  </div>
);

/* ───────── Page ───────── */

const Contributors = () => {
  const [contributeForm, setContributeForm] = useState({
    fullName: "",
    email: "",
    organization: "",
    contribution: "",
    message: "",
  });

  const [volunteerForm, setVolunteerForm] = useState({
    memberName: "",
    roleVertical: "",
    phaseNumber: "",
    reportingTo: "",
    phaseFrom: "",
    phaseTo: "",
    objectives: "",
    targets: "",
    resources: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVolunteerSubmitting, setIsVolunteerSubmitting] = useState(false);

  // Popup state
  const [popup, setPopup] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: "",
    message: "",
  });

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const params = new URLSearchParams();
      params.append("fullName", contributeForm.fullName);
      params.append("email", contributeForm.email);
      params.append("organization", contributeForm.organization);
      params.append("contribution", contributeForm.contribution);
      params.append("message", contributeForm.message);

      await fetch(
        "https://script.google.com/macros/s/AKfycbyecgWEMwsa96hcVj2Vxzw3ssortgM3-lZ-z08uoiEJQ8yk7atCR6lrnE3PN5EoB4J71Q/exec",
        {
          method: "POST",
          body: params,
          mode: "no-cors",
        }
      );

      setPopup({
        show: true,
        title: "Contribution Submitted!",
        message: "Thank you for your interest in contributing to Research Ambit. We'll review your submission and get back to you soon!",
      });
      setContributeForm({ fullName: "", email: "", organization: "", contribution: "", message: "" });
    } catch (error) {
      console.error("Submission error:", error);
      setPopup({
        show: true,
        title: "Oops!",
        message: "Something went wrong. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVolunteerSubmitting(true);

    try {
      const params = new URLSearchParams();
      params.append("memberName", volunteerForm.memberName);
      params.append("roleVertical", volunteerForm.roleVertical);
      params.append("phaseNumber", volunteerForm.phaseNumber);
      params.append("reportingTo", volunteerForm.reportingTo);
      params.append("phaseFrom", volunteerForm.phaseFrom);
      params.append("phaseTo", volunteerForm.phaseTo);
      params.append("objectives", volunteerForm.objectives);
      params.append("targets", volunteerForm.targets);
      params.append("resources", volunteerForm.resources);

      await fetch(
        "https://script.google.com/macros/s/AKfycbyvjoJ1lb9SYJkaVj0Pte3eMnRJ5ChentNI5J267bpuMaVuqsS3RU7-fwPMlyCrCeWaww/exec",
        {
          method: "POST",
          body: params,
          mode: "no-cors",
        }
      );

      setPopup({
        show: true,
        title: "Application Submitted!",
        message: "Your volunteer application has been received. We'll reach out with next steps soon. Thank you for your enthusiasm!",
      });
      setVolunteerForm({
        memberName: "", roleVertical: "", phaseNumber: "", reportingTo: "",
        phaseFrom: "", phaseTo: "", objectives: "", targets: "", resources: "",
      });
    } catch (error) {
      console.error("Submission error:", error);
      setPopup({
        show: true,
        title: "Oops!",
        message: "Something went wrong. Please try again later.",
      });
    } finally {
      setIsVolunteerSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen page-bg">
      <Navigation />

      {/* ── Success Popup ── */}
      <SuccessPopup
        show={popup.show}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ ...popup, show: false })}
      />

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent dark:from-primary/10" />
        <div className="absolute top-16 left-10 w-80 h-80 bg-blue-500/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-32 right-10 w-96 h-96 bg-teal-500/6 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary/4 rounded-full blur-3xl" />

        {/* Floating decorative dots */}
        <div className="absolute top-24 left-[15%] w-2 h-2 rounded-full bg-blue-400/40 animate-bounce delay-300" />
        <div className="absolute top-40 right-[20%] w-3 h-3 rounded-full bg-teal-400/30 animate-bounce delay-700" />
        <div className="absolute bottom-20 left-[25%] w-2 h-2 rounded-full bg-primary/30 animate-bounce delay-500" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 shadow-lg shadow-primary/5">
              <Users className="h-4 w-4" />
              <span>Meet Our Team</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 text-foreground leading-tight tracking-tight">
              About{" "}
              <span className="bg-gradient-to-r from-blue-400 via-primary to-teal-400 bg-clip-text text-transparent">
                Us
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Meet the brilliant minds behind Research Ambit — driving innovation
              and research excellence at IIT Delhi.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-12">
              {[
                { label: "Team Members", value: `${3 + phaseContributors.length}+` },
                { label: "Research Areas", value: "10+" },
                { label: "Publications", value: "50+" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Dean in Charge ─── */}
      <section className="relative py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/15 to-transparent dark:via-slate-900/15" />
        <div className="container mx-auto px-4 relative z-10">
          <SectionHeading subtitle="Leading the vision for research excellence">
            <span className="flex items-center justify-center gap-3">
              <Award className="w-9 h-9 text-primary" />
              Dean in Charge
            </span>
          </SectionHeading>
          <div className="flex justify-center animate-slide-up">
            <div className="w-full max-w-md">
              <MemberCard member={dean} large />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Mentors in Charge ─── */}
      <section className="relative py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/15 via-muted/25 to-transparent dark:from-slate-900/20 dark:via-slate-800/15" />
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl -translate-y-1/2" />
        <div className="container mx-auto px-4 relative z-10">
          <SectionHeading subtitle="Guiding the next generation of researchers">
            Mentors in Charge
          </SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto animate-slide-up">
            {mentors.map((m) => (
              <MemberCard key={m.name} member={m} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Current Phase Contributors ─── */}
      <section className="relative py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent dark:via-primary/5" />
        <div className="container mx-auto px-4 relative z-10">
          <SectionHeading subtitle="The passionate team members powering the current phase">
            Current Phase Contributors
          </SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {phaseContributors.map((c, i) => (
              <div key={c.name} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                <ContributorCard member={c} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contribute With Us Form ─── */}
      <section className="relative py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/25 to-transparent dark:from-transparent dark:via-slate-900/25" />
        <div className="absolute top-20 right-0 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <SectionHeading subtitle="Join our mission to advance research documentation">
            <span className="flex items-center justify-center gap-3">
              <Heart className="w-8 h-8 text-primary" />
              Contribute with us
            </span>
          </SectionHeading>

          <form
            onSubmit={handleContributeSubmit}
            className="max-w-2xl mx-auto space-y-6 animate-slide-up"
          >
            <div className="rounded-3xl border border-border/30 bg-card/70 dark:bg-slate-800/60 backdrop-blur-xl p-8 sm:p-10 shadow-xl space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Full Name
                </label>
                <Input
                  placeholder="Your Name"
                  value={contributeForm.fullName}
                  onChange={(e) =>
                    setContributeForm({ ...contributeForm, fullName: e.target.value })
                  }
                  className="h-12 bg-background/80 border-border/50 focus:border-primary rounded-xl"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={contributeForm.email}
                  onChange={(e) =>
                    setContributeForm({ ...contributeForm, email: e.target.value })
                  }
                  className="h-12 bg-background/80 border-border/50 focus:border-primary rounded-xl"
                  required
                />
              </div>

              {/* Organization */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Organization / Affiliation
                </label>
                <Input
                  placeholder="Your University or Company"
                  value={contributeForm.organization}
                  onChange={(e) =>
                    setContributeForm({ ...contributeForm, organization: e.target.value })
                  }
                  className="h-12 bg-background/80 border-border/50 focus:border-primary rounded-xl"
                />
              </div>

              {/* Contribution Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  How would you like to contribute?
                </label>
                <select
                  value={contributeForm.contribution}
                  onChange={(e) =>
                    setContributeForm({ ...contributeForm, contribution: e.target.value })
                  }
                  className="w-full h-12 rounded-xl border border-border/50 bg-background/80 px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  required
                >
                  <option value="">Select an option</option>
                  <option value="research">Research Collaboration</option>
                  <option value="content">Content Writing</option>
                  <option value="tech">Technical Development</option>
                  <option value="design">Design & Media</option>
                  <option value="operations">Operations & Management</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Message
                </label>
                <textarea
                  placeholder="Tell us briefly about your interests and how you'd like to get involved..."
                  rows={4}
                  value={contributeForm.message}
                  onChange={(e) =>
                    setContributeForm({ ...contributeForm, message: e.target.value })
                  }
                  className="w-full rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors resize-y"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group disabled:opacity-60"
              >
                <Send className="mr-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                {isSubmitting ? "Submitting..." : "Submit to Contribute"}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* ─── Volunteer for New Phases ─── */}
      <section className="relative py-20 pb-28">
        <div className="absolute bottom-20 left-0 w-60 h-60 bg-accent/5 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <SectionHeading subtitle="Apply to be part of the next research phase">
            <span className="flex items-center justify-center gap-3">
              <UserPlus className="w-8 h-8 text-primary" />
              Volunteer for new phases
            </span>
          </SectionHeading>

          <form
            onSubmit={handleVolunteerSubmit}
            className="max-w-3xl mx-auto space-y-6 animate-slide-up"
          >
            <div className="rounded-3xl border border-border/30 bg-card/70 dark:bg-slate-800/60 backdrop-blur-xl p-8 sm:p-10 shadow-xl space-y-6">
              {/* Row 1: Name + Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Member Name
                  </label>
                  <Input
                    placeholder="Your Name"
                    value={volunteerForm.memberName}
                    onChange={(e) =>
                      setVolunteerForm({ ...volunteerForm, memberName: e.target.value })
                    }
                    className="h-12 bg-background/80 border-border/50 focus:border-primary rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Role/Vertical
                  </label>
                  <Input
                    placeholder="e.g. Tech, Operations"
                    value={volunteerForm.roleVertical}
                    onChange={(e) =>
                      setVolunteerForm({ ...volunteerForm, roleVertical: e.target.value })
                    }
                    className="h-12 bg-background/80 border-border/50 focus:border-primary rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Phase + Reporting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Phase Number
                  </label>
                  <Input
                    placeholder="e.g. Phase 3"
                    value={volunteerForm.phaseNumber}
                    onChange={(e) =>
                      setVolunteerForm({ ...volunteerForm, phaseNumber: e.target.value })
                    }
                    className="h-12 bg-background/80 border-border/50 focus:border-primary rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Reporting To
                  </label>
                  <Input
                    placeholder="e.g. Dr. Mahesh"
                    value={volunteerForm.reportingTo}
                    onChange={(e) =>
                      setVolunteerForm({ ...volunteerForm, reportingTo: e.target.value })
                    }
                    className="h-12 bg-background/80 border-border/50 focus:border-primary rounded-xl"
                  />
                </div>
              </div>

              {/* Row 3: Date range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Phase Duration (From)
                  </label>
                  <Input
                    type="date"
                    value={volunteerForm.phaseFrom}
                    onChange={(e) =>
                      setVolunteerForm({ ...volunteerForm, phaseFrom: e.target.value })
                    }
                    className="h-12 bg-background/80 border-border/50 focus:border-primary rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Phase Duration (To)
                  </label>
                  <Input
                    type="date"
                    value={volunteerForm.phaseTo}
                    onChange={(e) =>
                      setVolunteerForm({ ...volunteerForm, phaseTo: e.target.value })
                    }
                    className="h-12 bg-background/80 border-border/50 focus:border-primary rounded-xl"
                  />
                </div>
              </div>

              {/* Objectives */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  1. Phase Objectives
                </label>
                <textarea
                  placeholder="State 2-3 high-level objectives for this phase..."
                  rows={3}
                  value={volunteerForm.objectives}
                  onChange={(e) =>
                    setVolunteerForm({ ...volunteerForm, objectives: e.target.value })
                  }
                  className="w-full rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors resize-y"
                />
              </div>

              {/* Targets */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  2. Specific Targets
                </label>
                <textarea
                  placeholder="Target Description | Type (B/Q) | Success Criteria | Weightage %"
                  rows={3}
                  value={volunteerForm.targets}
                  onChange={(e) =>
                    setVolunteerForm({ ...volunteerForm, targets: e.target.value })
                  }
                  className="w-full rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors resize-y"
                />
              </div>

              {/* Resources */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  3. Resources Required
                </label>
                <textarea
                  placeholder={"- Software/Tools:\n- Data Access:\n- Estimated Contingency Budget: Rs."}
                  rows={3}
                  value={volunteerForm.resources}
                  onChange={(e) =>
                    setVolunteerForm({ ...volunteerForm, resources: e.target.value })
                  }
                  className="w-full rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors resize-y"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isVolunteerSubmitting}
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group disabled:opacity-60"
              >
                <Sparkles className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                {isVolunteerSubmitting ? "Submitting..." : "Submit Volunteer Application"}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contributors;
