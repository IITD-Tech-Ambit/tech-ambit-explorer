/** Official IIT Delhi department/school/centre website URLs, keyed by unit name. */
export const DEPT_URLS: Record<string, string> = {
  "Applied Mechanics": "https://am.iitd.ac.in/",
  "Biochemical Engineering & Biotechnology": "https://beb.iitd.ac.in/",
  "Chemical Engineering": "https://chemical.iitd.ac.in/",
  "Chemistry Department": "https://chemistry.iitd.ac.in/",
  "Civil Engineering": "https://civil.iitd.ac.in/",
  "Computer Science & Engineering": "https://homecse.iitd.ac.in/",
  "Department of Design": "https://design.iitd.ac.in/",
  "Department of Energy Science & Engineering": "https://dese.iitd.ac.in/",
  "Department of Management Studies": "https://dms.iitd.ac.in/",
  "Electrical Engineering": "https://ee.iitd.ac.in/",
  "Humanities & Social Sciences": "https://hss.iitd.ac.in/",
  "Materials Science & Engineering": "https://mse.iitd.ac.in/",
  "Mathematics Department": "https://maths.iitd.ac.in/",
  "Mechanical Engineering": "https://mech.iitd.ac.in/",
  "Physics Department": "https://physics.iitd.ac.in/",
  "Textile & Fibre Engineering": "https://textile.iitd.ac.in/",

  // Schools
  "Amar Nath and Shashi Khosla School of Information Technology": "https://sit.iitd.ac.in/",
  "Bharti School of Telecommunication Technology and Management": "https://bhartischool.iitd.ac.in/",
  "Kusuma School of Biological Sciences": "https://bioschool.iitd.ac.in/",
  "School of Artificial Intelligence": "https://scai.iitd.ac.in/",
  "School of Interdisciplinary Research": "https://sire.iitd.ac.in/",
  "School of Public Policy": "https://spp.iitd.ac.in/",

  // Centres
  "Centre for Applied Research in Electronics": "https://care.iitd.ac.in/",
  "Centre for Atmospheric Sciences": "https://cas.iitd.ac.in/",
  "Centre for Automotive Research and Tribology": "https://cart.iitd.ac.in/",
  "Centre for Biomedical Engineering": "https://cbme.iitd.ac.in/",
  "Centre for Rural Development and Technology": "https://crdt.iitd.ac.in/",
  "Centre for Sensors, Instrumentation and Cyber Physical System Engineering (SeNSE)": "https://sense.iitd.ac.in/",
  "Computer Centre": "https://csc.iitd.ac.in/",
  "Educational Technology Services Centre": "https://etsc.iitd.ac.in/",
  "National Resource Centre for Value Education in Engineering": "https://nrcvee.iitd.ac.in/",
  "Optics and Photonics Centre": "https://opc.iitd.ac.in/",
  "Transportation Research and Injury Prevention Programme (TRIPP)": "https://tripp.iitd.ac.in/",
};

export function getDepartmentUrl(departmentName?: string | null): string | undefined {
  if (!departmentName?.trim()) return undefined;
  return DEPT_URLS[departmentName.trim()];
}
