import LegalPageLayout from "@/components/LegalPageLayout";

const TermsOfService = () => (
  <LegalPageLayout
    title="Terms of Service"
    subtitle="Terms governing access to and use of the Research Ambit portal at IIT Delhi."
    lastUpdated="June 19, 2025"
    sections={[
      {
        title: "1. Acceptance of Terms",
        paragraphs: [
          "By accessing or using Research Ambit (“the Portal”), operated by the Indian Institute of Technology Delhi (“IIT Delhi,” “we,” or “us”), you agree to these Terms of Service. If you do not agree, please do not use the Portal.",
          "These terms apply to all visitors, students, faculty, staff, researchers, and other users of the Portal.",
        ],
      },
      {
        title: "2. Purpose of the Portal",
        paragraphs: [
          "Research Ambit is provided as a research discovery and institutional showcase platform. It aggregates and presents information about IIT Delhi faculty, departments, publications, research themes, magazines, Atlas, and related academic content to support exploration, collaboration, and public understanding of research at the Institute.",
        ],
      },
      {
        title: "3. Permitted Use",
        paragraphs: [
          "You may use the Portal for lawful, non-commercial research, educational, and informational purposes, subject to these terms and applicable law. Permitted uses include browsing faculty and publication data, following links to original sources, and submitting constructive feedback through provided forms.",
        ],
        list: [
          "Do not attempt to disrupt, overload, scrape excessively, reverse engineer, or gain unauthorized access to Portal systems or data.",
          "Do not use automated tools to harvest content in a manner that impairs service availability for other users.",
          "Do not misrepresent your affiliation with IIT Delhi or impersonate faculty, staff, or other users.",
          "Do not upload or transmit malicious code, spam, or unlawful content through interactive features.",
        ],
      },
      {
        title: "4. Accuracy of Information",
        paragraphs: [
          "Research Ambit displays information compiled from institutional records and public bibliographic sources. While we strive to keep content accurate and current, we do not warrant that all faculty profiles, publication metadata, citation counts, department details, or research classifications are complete, error-free, or up to date at all times.",
          "Official academic records, hiring decisions, citations for tenure or promotion, and legal or contractual matters should be verified through authoritative IIT Delhi channels and original publication sources—not solely through this Portal.",
        ],
      },
      {
        title: "5. Intellectual Property",
        paragraphs: [
          "The Research Ambit name, branding, site design, and original portal content are the property of IIT Delhi or its licensors and are protected by applicable intellectual property laws.",
          "Research papers, faculty photographs, magazine articles, and other scholarly works referenced or linked on the Portal remain the property of their respective authors, publishers, or IIT Delhi. Links to Scopus, Google Scholar, or publisher sites are provided for reference; reproduction or redistribution of third-party content must comply with the rights holder’s terms.",
        ],
      },
      {
        title: "6. External Links",
        paragraphs: [
          "The Portal contains links to third-party websites, including department homepages, bibliographic databases, and social media. IIT Delhi does not control and is not responsible for the content, availability, or privacy practices of external sites. Accessing third-party links is at your own risk.",
        ],
      },
      {
        title: "7. Interactive Features",
        paragraphs: [
          "Features such as the Suggestions form and research chatbot are provided to improve the user experience. By submitting content, you grant IIT Delhi a non-exclusive right to use your submission for operating, maintaining, and improving the Portal. Do not submit confidential, proprietary, or personally sensitive information unrelated to Portal feedback.",
          "We reserve the right to remove or disregard submissions that are abusive, off-topic, unlawful, or inconsistent with institutional values.",
        ],
      },
      {
        title: "8. Disclaimer of Warranties",
        paragraphs: [
          "The Portal is provided on an “as is” and “as available” basis without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.",
          "IIT Delhi does not guarantee uninterrupted or error-free operation of the Portal.",
        ],
      },
      {
        title: "9. Limitation of Liability",
        paragraphs: [
          "To the fullest extent permitted by law, IIT Delhi and its officers, employees, students, contributors, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of—or inability to use—the Portal, including reliance on displayed research metadata or third-party links.",
        ],
      },
      {
        title: "10. Indemnification",
        paragraphs: [
          "You agree to indemnify and hold harmless IIT Delhi from claims, damages, or expenses arising from your misuse of the Portal or violation of these Terms of Service, to the extent permitted by applicable law.",
        ],
      },
      {
        title: "11. Modifications and Availability",
        paragraphs: [
          "We may modify, suspend, or discontinue any part of the Portal at any time without prior notice. We may also update these Terms of Service; the “Last updated” date will reflect revisions. Your continued use after changes constitutes acceptance of the updated terms.",
        ],
      },
      {
        title: "12. Governing Law",
        paragraphs: [
          "These Terms of Service are governed by the laws of India. Any disputes arising in connection with the Portal shall be subject to the exclusive jurisdiction of the courts at New Delhi, India, unless otherwise required by applicable IIT Delhi policy or law.",
        ],
      },
      {
        title: "13. Contact",
        paragraphs: [
          "For questions about these Terms of Service, contact:",
          "Research Ambit Team, IIT Delhi — Email: iitdambit@iitd.ac.in | Phone: +91-011-2659-7135 | Address: Indian Institute of Technology Delhi, Hauz Khas, New Delhi 110016, India.",
        ],
      },
    ]}
  />
);

export default TermsOfService;
