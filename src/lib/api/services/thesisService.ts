import type { DepartmentCollection, ThesisData, Faculty, PhdThesisData, ResearchData, OpenPathResponse } from '../types';

const API_BASE_URL = 'http://localhost:3001/api/mind-map';

export const fetchCategories = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/categories`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch categories');
  return data.data;
};

export const fetchDepartments = async (): Promise<DepartmentCollection[]> => {
  const response = await fetch(`${API_BASE_URL}/departments`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch departments');
  return data.data;
};

export const fetchSchools = async (): Promise<DepartmentCollection[]> => {
  const response = await fetch(`${API_BASE_URL}/schools`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch schools');
  return data.data;
};

export const fetchCentres = async (): Promise<DepartmentCollection[]> => {
  const response = await fetch(`${API_BASE_URL}/centres`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch centres');
  return data.data;
};

export const fetchFaculties = async (departmentId: string): Promise<Faculty[]> => {
  const response = await fetch(`${API_BASE_URL}/faculties/${departmentId}`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch faculties');
  return data.data;
};

export const fetchProjectTypes = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/project-type`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch project types');
  return data.data;
};

export const fetchPhdTheses = async (facultyId: string): Promise<Array<{_id: string, title: string}>> => {
  const response = await fetch(`${API_BASE_URL}/phd-thesis/${facultyId}`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch PhD theses');
  return data.data;
};

export const fetchPhdThesisById = async (thesisId: string): Promise<PhdThesisData> => {
  const response = await fetch(`${API_BASE_URL}/phd-thesis/card/${thesisId}`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch PhD thesis details');
  return data.data;
};

export const fetchResearch = async (facultyId: string): Promise<Array<{_id: string, title: string}>> => {
  const response = await fetch(`${API_BASE_URL}/research/${facultyId}`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch research papers');
  return data.data;
};

export const fetchResearchById = async (researchId: string): Promise<ResearchData> => {
  const response = await fetch(`${API_BASE_URL}/research/card/${researchId}`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch research paper details');
  return data.data;
};

export const fetchProfessors = async (handle: string): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/professors/${handle}`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch professors');
  return data.data;
};

export const fetchStudents = async (professorName: string): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/students/professor/${encodeURIComponent(professorName)}`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch students');
  return data.data;
};

export const fetchTheses = async (studentName: string): Promise<ThesisData[]> => {
  const response = await fetch(`${API_BASE_URL}/theses/student/${encodeURIComponent(studentName)}`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch theses');
  return data.data;
};

export const fetchThesisById = async (id: number): Promise<ThesisData> => {
  const response = await fetch(`${API_BASE_URL}/theses/${id}`);
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch thesis details');
  return data.data;
};

export const fetchOpenPath = async (documentData: object): Promise<OpenPathResponse> => {
  const response = await fetch(`${API_BASE_URL}/open-path`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(documentData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to get open path');
  return data.data;
};
