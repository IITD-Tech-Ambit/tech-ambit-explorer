import LegalPageLayout from "@/components/LegalPageLayout";

const PrivacyPolicy = () => (
  <LegalPageLayout
    title="Privacy Policy"
    subtitle="How Research Ambit (IIT Delhi) collects, uses, and protects information when you use this portal."
    lastUpdated="June 19, 2025"
    sections={[
      {
        title: "1. About Research Ambit",
        paragraphs: [
          "Research Ambit is an official research discovery portal operated by the Indian Institute of Technology Delhi (IIT Delhi). The platform helps students, faculty, researchers, and the public explore faculty profiles, publications, departments, research themes, magazines, and related academic content aggregated from IIT Delhi sources and public bibliographic databases.",
        ],
      },
      {
        title: "2. Information We Display",
        paragraphs: [
          "Much of the content on Research Ambit is drawn from publicly available or institutionally approved sources, including faculty directory data, publication metadata, citation counts, research areas, and links to external profiles (such as Scopus or Google Scholar where available). This information is intended for academic discovery and institutional visibility.",
          "We do not require you to create an account to browse the portal. Profile and publication data may be updated periodically from backend systems maintained by IIT Delhi.",
        ],
      },
      {
        title: "3. Information You Provide",
        paragraphs: [
          "When you interact with certain features, we may collect information you voluntarily submit:",
        ],
        list: [
          "Suggestions and feedback submitted through the Suggestions form (e.g., name, email, message content).",
          "Questions or messages sent through the research chatbot widget.",
          "Standard technical data sent by your browser, such as IP address, device type, browser version, and pages visited, which may be logged by our hosting infrastructure for security and performance.",
        ],
      },
      {
        title: "4. How We Use Information",
        paragraphs: [
          "Information collected through Research Ambit is used to operate and improve the portal, respond to feedback, maintain system security, analyze usage patterns in aggregate, and support IIT Delhi’s research communication goals.",
          "We do not sell personal information. Feedback and chatbot submissions may be reviewed by authorized IIT Delhi staff or project contributors responsible for maintaining the platform.",
        ],
      },
      {
        title: "5. Cookies and Local Storage",
        paragraphs: [
          "Research Ambit may store preferences locally in your browser—for example, light/dark theme selection—using cookies or local storage. These are used solely to improve your experience on the site.",
          "You can control cookies through your browser settings. Disabling cookies may affect certain convenience features but will not prevent you from browsing public content.",
        ],
      },
      {
        title: "6. Third-Party Services and Links",
        paragraphs: [
          "The portal links to external websites, including IIT Delhi department pages, Scopus, Google Scholar, Google Maps, and social media profiles. When you leave Research Ambit, the privacy practices of those third-party sites apply.",
          "Publication metadata may originate from bibliographic providers. We display links to original sources where available so users can verify information directly.",
        ],
      },
      {
        title: "7. Data Retention and Security",
        paragraphs: [
          "We retain submitted feedback and operational logs only as long as needed for the purposes described in this policy or as required by IIT Delhi policies and applicable law.",
          "Reasonable administrative and technical measures are used to protect systems hosting Research Ambit. No online service can guarantee absolute security; please avoid submitting sensitive personal information unrelated to your use of the portal.",
        ],
      },
      {
        title: "8. Your Rights and Choices",
        paragraphs: [
          "If you believe information displayed about a faculty member or publication is inaccurate, you may contact us to request a review. IIT Delhi faculty may also work with their department or the Research Ambit team to update directory or profile data through established institutional channels.",
          "Depending on applicable law, you may have rights to access, correct, or request deletion of personal data you have submitted through interactive features. Contact us using the details below.",
        ],
      },
      {
        title: "9. Children’s Privacy",
        paragraphs: [
          "Research Ambit is an academic information portal and is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has submitted personal data through our forms, please contact us so we can take appropriate action.",
        ],
      },
      {
        title: "10. Changes to This Policy",
        paragraphs: [
          "We may update this Privacy Policy from time to time to reflect changes in the platform, legal requirements, or IIT Delhi practices. The “Last updated” date at the top of this page will be revised when changes are made. Continued use of Research Ambit after updates constitutes acceptance of the revised policy.",
        ],
      },
      {
        title: "11. Contact",
        paragraphs: [
          "For privacy-related questions or requests regarding Research Ambit, please contact:",
          "Research Ambit Team, IIT Delhi — Email: iitdambit@iitd.ac.in | Phone: +91-011-2659-7135 | Address: Indian Institute of Technology Delhi, Hauz Khas, New Delhi 110016, India.",
        ],
      },
    ]}
  />
);

export default PrivacyPolicy;
