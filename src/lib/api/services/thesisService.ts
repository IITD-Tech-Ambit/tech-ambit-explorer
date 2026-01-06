import type { DepartmentCollection, ThesisData } from '../types';

const API_BASE_URL = 'http://localhost:5123/api';

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
