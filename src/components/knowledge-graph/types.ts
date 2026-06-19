export type KgNodeType = "faculty" | "paper" | "theme" | "subdomain" | "topic";
export type KgTermType = "theme" | "subdomain" | "topic";
export type AppMode = "faculty" | "topic";

export interface KgGraphNode {
  id: string;
  label: string;
  type: KgNodeType;
  citation_count?: number;
  year?: number | null;
  department?: string;
  broad_theme?: string;
  sub_domain?: string;
  topic?: string;
  link?: string;
  document_scopus_id?: string;
  document_eid?: string;
}

export interface KgGraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface KgGraph {
  nodes: KgGraphNode[];
  edges: KgGraphEdge[];
}

export interface KgFacultyItem {
  facultyId: string;
  name: string;
  department: string;
  paperCount: number;
  nodeCount: number;
  edgeCount: number;
}

export interface KgTermItem {
  key: string;
  term: string;
  type: KgTermType;
  paperCount: number;
  deptCount: number;
  facultyCount: number;
}

export interface KgFacultyRef {
  facultyId: string;
  name: string;
  paperCount: number;
}

export interface KgDeptItem {
  department: string;
  paperCount: number;
  facultyCount: number;
  faculty: KgFacultyRef[];
}

export interface KgExploreDetail {
  term: string;
  type: KgTermType;
  departments: KgDeptItem[];
}
