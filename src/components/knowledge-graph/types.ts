export interface KgFacultyItem {
  facultyId: string;
  name: string;
  department: string;
  paperCount: number;
  nodeCount?: number;
  edgeCount?: number;
}

export interface KgAtlasPaper {
  i: number;
  id: string;
  title: string;
  theme: string;
  subdomain: string;
  topic: string;
  department?: string;
  citations: number;
  x: number;
  y: number;
  z: number;
}

export interface KgAtlasDepartmentBreakdown {
  department: string;
  paperCount: number;
  papers: KgAtlasClusterPaper[];
}

export interface KgAtlasClusterPaper {
  id: string;
  i: number;
  title: string;
  topic: string;
  citations: number;
}

export interface KgAtlasClusterBreakdown {
  theme: string;
  query: string;
  totalPapers: number;
  departments: KgAtlasDepartmentBreakdown[];
}

export interface KgAtlasData {
  version: number;
  count: number;
  themes: string[];
  papers: KgAtlasPaper[];
}

export interface KgAtlasFacultyMatch {
  facultyId: string;
  name: string;
  department: string;
  paperCount: number;
  atlasCount: number;
}

export interface KgAtlasFacultySearchResult {
  query: string;
  matches: KgAtlasFacultyMatch[];
  matchCount: number;
  indices: number[];
}

export interface KgDepartmentItem {
  department: string;
  facultyCount: number;
  paperCount: number;
}

export interface KgAtlasDepartmentMatch {
  department: string;
  facultyCount: number;
  atlasCount: number;
}

export interface KgAtlasDepartmentSearchResult {
  query: string;
  matches: KgAtlasDepartmentMatch[];
  matchCount: number;
  indices: number[];
}
