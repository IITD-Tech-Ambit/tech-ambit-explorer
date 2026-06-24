/** Official IIT Delhi department/school/centre website URLs, keyed by department name. */
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
};

export function getDepartmentUrl(departmentName?: string | null): string | undefined {
  if (!departmentName?.trim()) return undefined;
  return DEPT_URLS[departmentName.trim()];
}
