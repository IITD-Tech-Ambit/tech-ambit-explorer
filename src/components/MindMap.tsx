import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Minus, Maximize2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import CustomNode, { CustomNodeData, NodeType } from './CustomNode';
import ThesisCard from './ThesisCard';
import PhdThesisCard from './PhdThesisCard';
import ResearchCard from './ResearchCard';
import {
  fetchCategories,
  fetchDepartments,
  fetchSchools,
  fetchCentres,
  fetchFaculties,
  fetchProjectTypes,
  fetchPhdTheses,
  fetchPhdThesisById,
  fetchResearch,
  fetchResearchById,
  fetchThesisById,
  ThesisData,
  PhdThesisData,
  ResearchData,
  DepartmentCollection,
  Faculty,
  OpenPathResponse,
} from '@/lib/api';

// Top-level configurable constants
const NODE_WIDTH = 180;  // Must match NODE_WIDTH in CustomNode.tsx
const NODE_HEIGHT = 70;  // Must match NODE_HEIGHT in CustomNode.tsx
const MIN_VERTICAL_GAP = 24;  // Vertical spacing between siblings in a column
const LEVEL_HORIZONTAL_GAP = 250;  // Horizontal spacing between columns (levels)
const MAX_DEPTH = 6;  // Updated: Root(1) -> Categories(2) -> Collections(3) -> Professors(4) -> Students(5) -> Theses(6)
const ANIMATION_DURATION = 300;
const DEBOUNCE_DELAY = 100;

const CONFIG = {
  MAX_DEPTH,
  NODE_WIDTH,
  NODE_HEIGHT,
  MIN_VERTICAL_GAP,
  LEVEL_HORIZONTAL_GAP,
  ANIMATION_DURATION,
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 3.0,
  FIT_VIEW_PADDING: 0.12,
};

const nodeTypes = {
  custom: CustomNode,
};

// Sort node IDs by their numeric index (last segment) to maintain order
const sortNodeIds = (ids: string[]) => {
  return [...ids].sort((a, b) => {
    const aIndex = parseInt(a.split('-').pop() || '0');
    const bIndex = parseInt(b.split('-').pop() || '0');
    return aIndex - bIndex;
  });
};

interface MindMapContentProps {
  navigationPath: OpenPathResponse | null;
  onNavigationComplete: () => void;
}

const MindMapContent = ({ navigationPath, onNavigationComplete }: MindMapContentProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, getZoom, zoomIn, zoomOut } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState<ThesisData | null>(null);
  const [selectedPhdThesis, setSelectedPhdThesis] = useState<PhdThesisData | null>(null);
  const [selectedResearch, setSelectedResearch] = useState<ResearchData | null>(null);
  const expandedNodes = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pagination state
  const [pendingChildren, setPendingChildren] = useState<{
    parentId: string;
    children: Array<{ label: string; nodeType: NodeType; categoryName?: string; departmentName?: string; departmentId?: string; facultyId?: string; thesisId?: string; phdThesisId?: string; researchId?: string; handle?: string; professorName?: string; studentName?: string; thesisData?: ThesisData }>;
    currentIndex: number;
  } | null>(null);
  const BATCH_SIZE = 5;

  // Initialize with root node
  useEffect(() => {
    const rootNode: Node<CustomNodeData> = {
      id: '1',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        label: 'IITD Research',
        level: 1,
        expanded: false,
        isMaxDepth: false,
        selected: false,
        nodeType: 'root',
      },
    };
    setNodes([rootNode]);
    
    // Center and fit view after a brief delay
    setTimeout(() => {
      fitView({ padding: CONFIG.FIT_VIEW_PADDING, duration: CONFIG.ANIMATION_DURATION });
    }, 100);
  }, []);

  // Track zoom level
  useEffect(() => {
    const updateZoom = () => {
      const zoom = getZoom();
      setZoomLevel(Math.round(zoom * 100));
    };
    
    updateZoom();
    const interval = setInterval(updateZoom, 100);
    return () => clearInterval(interval);
  }, [getZoom]);

  // Calculate subtree HEIGHT (vertical bounding box for node + all visible descendants)
  const calculateSubtreeHeight = useCallback((
    nodeId: string, 
    childrenMap: Map<string, string[]>,
    subtreeHeightCache: Map<string, number>
  ): number => {
    // Check cache first
    if (subtreeHeightCache.has(nodeId)) {
      return subtreeHeightCache.get(nodeId)!;
    }

    const children = childrenMap.get(nodeId) || [];
    
    if (children.length === 0) {
      subtreeHeightCache.set(nodeId, NODE_HEIGHT);
      return NODE_HEIGHT;
    }
    
    // Sort children by numeric index to maintain fixed vertical order
    const sortedChildren = sortNodeIds(children);
    
    // Sum of all child subtree heights
    const childrenHeight = sortedChildren.reduce((sum, childId) => {
      return sum + calculateSubtreeHeight(childId, childrenMap, subtreeHeightCache);
    }, 0);
    
    // Gaps between children (vertical)
    const totalGaps = Math.max(0, sortedChildren.length - 1) * MIN_VERTICAL_GAP;
    
    const height = Math.max(childrenHeight + totalGaps, NODE_HEIGHT);
    subtreeHeightCache.set(nodeId, height);
    return height;
  }, []);

  // Calculate VERTICAL COLUMN layout: levels are columns, children stack vertically
  // Level 1 leftmost, Level 2 to its right, etc.
  const calculateTreeLayout = useCallback((allNodes: Node<CustomNodeData>[]) => {
    const nodeMap = new Map(allNodes.map(n => [n.id, { ...n }])); // Create shallow copies
    const childrenMap = new Map<string, string[]>();
    const subtreeHeightCache = new Map<string, number>();
    
    // Build parent-child relationships maintaining fixed top-to-bottom order
    allNodes.forEach(node => {
      const parentId = node.id.split('-').slice(0, -1).join('-') || null;
      if (parentId) {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(node.id);
      }
    });

    // Sort all children arrays by numeric index to maintain consistent top-to-bottom order
    childrenMap.forEach((children, parentId) => {
      childrenMap.set(parentId, sortNodeIds(children));
    });

    // Pre-calculate all subtree heights (vertical space needed)
    allNodes.forEach(node => {
      calculateSubtreeHeight(node.id, childrenMap, subtreeHeightCache);
    });

    // Group nodes by level (column) for uniform spacing calculations
    const nodesByLevel = new Map<number, Node<CustomNodeData>[]>();
    allNodes.forEach(node => {
      const level = node.data.level;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(node);
    });

    // Calculate uniform vertical gap for each level (column)
    const levelGaps = new Map<number, number>();
    
    nodesByLevel.forEach((levelNodes, level) => {
      if (level === 1) {
        levelGaps.set(level, 0); // Root has no siblings
        return;
      }

      // Use uniform vertical gap across entire column
      levelGaps.set(level, MIN_VERTICAL_GAP);
    });

    // Position nodes in VERTICAL COLUMNS: Level N at X = (N-1) * LEVEL_HORIZONTAL_GAP
    // Children stack vertically in next column to the right
    const positionNode = (nodeId: string, parentCenterY: number, levelDepth: number) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      // X coordinate determined by level (column position, left-to-right growth)
      const nodeX = levelDepth * LEVEL_HORIZONTAL_GAP;
      
      // Y coordinate: center position accounting for node height
      node.position = { 
        x: nodeX, 
        y: parentCenterY - NODE_HEIGHT / 2
      };
      
      const children = childrenMap.get(nodeId) || [];
      if (children.length === 0) return;
      
      // Sort children to maintain fixed top-to-bottom order
      const sortedChildren = sortNodeIds(children);
      const childLevel = node.data.level + 1;
      const uniformGap = levelGaps.get(childLevel) || MIN_VERTICAL_GAP;
      
      // Calculate vertical space needed for each child's subtree
      const childHeights = sortedChildren.map(childId => 
        subtreeHeightCache.get(childId) || NODE_HEIGHT
      );
      
      const totalGaps = Math.max(0, sortedChildren.length - 1) * uniformGap;
      const totalHeight = childHeights.reduce((sum, h) => sum + h, 0) + totalGaps;
      
      // Position children vertically in next column to the right, maintaining top-to-bottom order
      let currentY = parentCenterY - totalHeight / 2;
      sortedChildren.forEach((childId, index) => {
        const childHeight = childHeights[index];
        const childCenterY = currentY + childHeight / 2;
        positionNode(childId, childCenterY, levelDepth + 1);
        currentY += childHeight + uniformGap;
      });
    };

    // Start from root at left center (level 0)
    positionNode('1', 0, 0);
    
    // Return array of nodes from the map (with updated positions)
    return Array.from(nodeMap.values());
  }, [calculateSubtreeHeight]);

  // Fetch children data from API (without creating nodes)
  const fetchChildrenData = useCallback(async (parentNode: Node<CustomNodeData>): Promise<Array<{ label: string; nodeType: NodeType; categoryName?: string; departmentName?: string; departmentId?: string; facultyId?: string; thesisId?: string; phdThesisId?: string; researchId?: string; handle?: string; professorName?: string; studentName?: string; thesisData?: ThesisData }>> => {
    const parentNodeType = parentNode.data.nodeType;
    let childrenData: Array<{ label: string; nodeType: NodeType; categoryName?: string; departmentName?: string; departmentId?: string; facultyId?: string; thesisId?: string; phdThesisId?: string; researchId?: string; handle?: string; professorName?: string; studentName?: string; thesisData?: ThesisData }> = [];

    try {
      // Level 1 (Root) -> Level 2 (Categories)
      if (parentNodeType === 'root') {
        const categories = await fetchCategories();
        childrenData = categories.map(cat => ({
          label: cat,
          nodeType: 'category' as NodeType,
          categoryName: cat,
        }));
      }
      // Level 2 (Category) -> Level 3 (Collections - Departments/Schools/Centres)
      else if (parentNodeType === 'category') {
        const categoryName = parentNode.data.categoryName?.toLowerCase();
        let collections: DepartmentCollection[];
        
        if (categoryName === 'departments') {
          collections = await fetchDepartments();
        } else if (categoryName === 'schools') {
          collections = await fetchSchools();
        } else if (categoryName === 'centres') {
          collections = await fetchCentres();
        } else {
          collections = [];
        }
        
        childrenData = collections.map(dept => ({
          label: dept.name,
          nodeType: 'collection' as NodeType,
          departmentName: dept.name,
          departmentId: dept._id,
        }));
      }
      // Level 3 (Collection) -> Level 4 (Faculties)
      else if (parentNodeType === 'collection' && parentNode.data.departmentId) {
        const faculties = await fetchFaculties(parentNode.data.departmentId);
        childrenData = faculties.map((faculty: Faculty) => ({
          label: faculty.name,
          nodeType: 'professor' as NodeType,
          professorName: faculty.name,
          facultyId: faculty._id,
        }));
      }
      // Level 4 (Professor) -> Level 5 (Project Types)
      else if (parentNodeType === 'professor' && parentNode.data.facultyId) {
        const projectTypes = await fetchProjectTypes();
        childrenData = projectTypes.map(type => ({
          label: type,
          nodeType: 'student' as NodeType,
          studentName: type,
          facultyId: parentNode.data.facultyId,
        }));
      }
      // Level 5 (Student/Project Type) -> Level 6 (Theses)
      else if (parentNodeType === 'student' && parentNode.data.studentName && parentNode.data.facultyId) {
        if (parentNode.data.studentName === 'PHD Thesis') {
          const theses = await fetchPhdTheses(parentNode.data.facultyId);
          childrenData = theses.map(thesis => ({
            label: thesis.title,
            nodeType: 'thesis' as NodeType,
            phdThesisId: thesis._id,
            thesisData: undefined,
          }));
        } else if (parentNode.data.studentName === 'Research') {
          const research = await fetchResearch(parentNode.data.facultyId);
          childrenData = research.map(paper => ({
            label: paper.title,
            nodeType: 'thesis' as NodeType,
            researchId: paper._id,
            thesisData: undefined,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }

    return childrenData;
  }, []);

  // Create nodes and edges from children data
  const createNodesFromChildren = useCallback((
    parentNode: Node<CustomNodeData>,
    childrenData: Array<{ label: string; nodeType: NodeType; categoryName?: string; departmentName?: string; departmentId?: string; facultyId?: string; thesisId?: string; phdThesisId?: string; researchId?: string; handle?: string; professorName?: string; studentName?: string; thesisData?: ThesisData }>,
    startIndex: number
  ): { nodes: Node<CustomNodeData>[]; edges: Edge[] } => {
    const newLevel = parentNode.data.level + 1;
    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge[] = [];

    childrenData.forEach((child, i) => {
      const childId = `${parentNode.id}-${startIndex + i + 1}`;
      const isThesis = child.nodeType === 'thesis';
      
      newNodes.push({
        id: childId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: child.label,
          level: newLevel,
          expanded: false,
          isMaxDepth: isThesis,
          selected: false,
          nodeType: child.nodeType,
          categoryName: child.categoryName,
          departmentName: child.departmentName,
          departmentId: child.departmentId,
          facultyId: child.facultyId,
          thesisId: child.thesisId,
          phdThesisId: child.phdThesisId,
          researchId: child.researchId,
          handle: child.handle,
          professorName: child.professorName,
          studentName: child.studentName,
          thesisData: child.thesisData,
        },
      });

      newEdges.push({
        id: `e-${parentNode.id}-${childId}`,
        source: parentNode.id,
        target: childId,
        type: 'smoothstep',
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      });
    });

    return { nodes: newNodes, edges: newEdges };
  }, []);

  // Get all descendant IDs
  const getDescendants = useCallback((nodeId: string, allNodes: Node<CustomNodeData>[]) => {
    const descendants: string[] = [];
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = allNodes.filter(n => 
        n.id.startsWith(currentId + '-') && 
        n.id.split('-').length === currentId.split('-').length + 1
      );
      
      children.forEach(child => {
        descendants.push(child.id);
        queue.push(child.id);
      });
    }
    
    return descendants;
  }, []);

  // Handle programmatic navigation when navigationPath changes
  useEffect(() => {
    if (!navigationPath) return;

    // Use refs to track state during async operations
    const pendingChildrenRef = { current: null as typeof pendingChildren };
    const nodesRef = { current: nodes };

    const navigateToPath = async () => {
      setIsLoading(true);
      
      try {
        // Step 0: Collapse everything first - reset to only root node
        expandedNodes.current.clear();
        setPendingChildren(null);
        
        const rootNode: Node<CustomNodeData> = {
          id: '1',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            label: 'IITD Research',
            level: 1,
            expanded: false,
            isMaxDepth: false,
            selected: false,
            nodeType: 'root',
          },
        };
        
        await new Promise<void>((resolve) => {
          setNodes([rootNode]);
          setEdges([]);
          nodesRef.current = [rootNode];
          setTimeout(resolve, 100);
        });

        // Step 1: Find and expand the root node (Layer 1 - "IITD Research")
        const currentRootNode = nodesRef.current.find(n => n.id === '1');
        if (!currentRootNode) {
          console.error('Root node not found');
          return;
        }

        // Check if root is already expanded
        const isRootExpanded = expandedNodes.current.has('1');
        
        if (!isRootExpanded) {
          // Expand root node to show categories
          const childrenData = await fetchChildrenData(currentRootNode as Node<CustomNodeData>);
          
          if (childrenData.length === 0) {
            console.error('No children data for root node');
            return;
          }

          const initialBatch = childrenData.slice(0, BATCH_SIZE);
          const remaining = childrenData.slice(BATCH_SIZE);
          
          if (remaining.length > 0) {
            setPendingChildren({
              parentId: currentRootNode.id,
              children: remaining,
              currentIndex: BATCH_SIZE
            });
          }

          const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(
            currentRootNode as Node<CustomNodeData>,
            initialBatch,
            0
          );

          await new Promise<void>((resolve) => {
            setNodes((prevNodes) => {
              let updatedNodes = [...prevNodes, ...newNodes];
              expandedNodes.current.add('1');
              
              updatedNodes = updatedNodes.map(n => 
                n.id === '1' 
                  ? { ...n, data: { ...n.data, expanded: true, selected: true } }
                  : { ...n, data: { ...n.data, selected: false } }
              );
              
              const layoutedNodes = calculateTreeLayout(updatedNodes);
              nodesRef.current = layoutedNodes;
              setTimeout(resolve, 100);
              return layoutedNodes;
            });
          });

          setEdges((prevEdges) => [...prevEdges, ...newEdges]);
          
          // Wait for state to update before proceeding to Layer 2
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Step 2: Find and expand the category node (Layer 2)
        let categoryNode: Node<CustomNodeData> | undefined;
        
        await new Promise<void>((resolve) => {
          setNodes((currentNodes) => {
            nodesRef.current = currentNodes;
            categoryNode = currentNodes.find(n => 
              n.data.level === 2 && 
              n.data.categoryName === navigationPath.category
            ) as Node<CustomNodeData> | undefined;
            resolve();
            return currentNodes;
          });
        });

        if (!categoryNode) {
          console.error(`Category node not found for: ${navigationPath.category}`);
          onNavigationComplete();
          return;
        }

        console.log(`Found category node: ${categoryNode.data.label} (ID: ${categoryNode.id})`);
        
        // Expand the category node
        const isCategoryExpanded = expandedNodes.current.has(categoryNode.id);
        
        if (!isCategoryExpanded) {
          const childrenData = await fetchChildrenData(categoryNode as Node<CustomNodeData>);
          
          if (childrenData.length === 0) {
            console.error('No children data for category node');
            onNavigationComplete();
            return;
          }

          const initialBatch = childrenData.slice(0, BATCH_SIZE);
          const remaining = childrenData.slice(BATCH_SIZE);
          
          if (remaining.length > 0) {
            const newPendingChildren = {
              parentId: categoryNode.id,
              children: remaining,
              currentIndex: BATCH_SIZE
            };
            setPendingChildren(newPendingChildren);
            pendingChildrenRef.current = newPendingChildren;
          } else {
            setPendingChildren(null);
            pendingChildrenRef.current = null;
          }

          const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(
            categoryNode as Node<CustomNodeData>,
            initialBatch,
            0
          );

          const categoryNodeId = categoryNode.id;
          await new Promise<void>((resolve) => {
            setNodes((prevNodes) => {
              let updatedNodes = [...prevNodes, ...newNodes];
              expandedNodes.current.add(categoryNodeId);
              
              updatedNodes = updatedNodes.map(n => 
                n.id === categoryNodeId 
                  ? { ...n, data: { ...n.data, expanded: true, selected: true } }
                  : { ...n, data: { ...n.data, selected: false } }
              );
              
              const layoutedNodes = calculateTreeLayout(updatedNodes);
              nodesRef.current = layoutedNodes;
              setTimeout(resolve, 100);
              return layoutedNodes;
            });
          });

          setEdges((prevEdges) => [...prevEdges, ...newEdges]);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Step 3: Find the department node (Layer 3)
        // Keep loading batches until we find the target department or exhaust all children
        const categoryNodeId = categoryNode.id;
        let departmentNode: Node<CustomNodeData> | undefined;
        let attempts = 0;
        const maxAttempts = 100; // Safety limit to prevent infinite loops

        while (!departmentNode && attempts < maxAttempts) {
          attempts++;
          
          // Check current nodes for the department
          await new Promise<void>((resolve) => {
            setNodes((currentNodes) => {
              nodesRef.current = currentNodes;
              departmentNode = currentNodes.find(n => 
                n.data.level === 3 && 
                n.data.departmentId === navigationPath.department_id
              ) as Node<CustomNodeData> | undefined;
              resolve();
              return currentNodes;
            });
          });

          if (departmentNode) {
            console.log(`Found department node: ${departmentNode.data.label} (ID: ${departmentNode.id})`);
            break;
          }

          // Check if there are more children to load for this category
          let currentPendingChildren: typeof pendingChildren = null;
          await new Promise<void>((resolve) => {
            setPendingChildren((current) => {
              currentPendingChildren = current;
              pendingChildrenRef.current = current;
              resolve();
              return current;
            });
          });

          if (!currentPendingChildren || currentPendingChildren.parentId !== categoryNodeId) {
            console.error(`Department not found: ${navigationPath.department_id}. All batches exhausted.`);
            break;
          }

          // Load next batch
          console.log(`Department not in current batch, loading next batch... (attempt ${attempts})`);
          
          const parentNode = nodesRef.current.find(n => n.id === currentPendingChildren!.parentId);
          if (!parentNode) {
            console.error('Parent node not found for loading next batch');
            break;
          }

          const nextBatch = currentPendingChildren.children.slice(0, BATCH_SIZE);
          const remaining = currentPendingChildren.children.slice(BATCH_SIZE);
          const startIndex = currentPendingChildren.currentIndex;

          const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(
            parentNode as Node<CustomNodeData>,
            nextBatch,
            startIndex
          );

          // Update pending children state
          if (remaining.length > 0) {
            const newPendingChildren = {
              parentId: currentPendingChildren.parentId,
              children: remaining,
              currentIndex: startIndex + BATCH_SIZE
            };
            setPendingChildren(newPendingChildren);
            pendingChildrenRef.current = newPendingChildren;
          } else {
            setPendingChildren(null);
            pendingChildrenRef.current = null;
          }

          await new Promise<void>((resolve) => {
            setNodes((prevNodes) => {
              const updatedNodes = [...prevNodes, ...newNodes];
              const layoutedNodes = calculateTreeLayout(updatedNodes);
              nodesRef.current = layoutedNodes;
              setTimeout(resolve, 100);
              return layoutedNodes;
            });
          });

          setEdges((prevEdges) => [...prevEdges, ...newEdges]);
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        if (!departmentNode) {
          console.error(`Department node not found after ${attempts} attempts`);
          onNavigationComplete();
          return;
        }

        // Step 4: Expand the department node (Layer 3) to show faculties
        const isDepartmentExpanded = expandedNodes.current.has(departmentNode.id);
        
        if (!isDepartmentExpanded) {
          const childrenData = await fetchChildrenData(departmentNode as Node<CustomNodeData>);
          
          if (childrenData.length === 0) {
            console.log('No children data for department node');
            onNavigationComplete();
            return;
          }

          const initialBatch = childrenData.slice(0, BATCH_SIZE);
          const remaining = childrenData.slice(BATCH_SIZE);
          
          if (remaining.length > 0) {
            const newPendingChildren = {
              parentId: departmentNode.id,
              children: remaining,
              currentIndex: BATCH_SIZE
            };
            setPendingChildren(newPendingChildren);
            pendingChildrenRef.current = newPendingChildren;
          } else {
            setPendingChildren(null);
            pendingChildrenRef.current = null;
          }

          const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(
            departmentNode as Node<CustomNodeData>,
            initialBatch,
            0
          );

          const departmentNodeId = departmentNode.id;
          await new Promise<void>((resolve) => {
            setNodes((prevNodes) => {
              let updatedNodes = [...prevNodes, ...newNodes];
              expandedNodes.current.add(departmentNodeId);
              
              updatedNodes = updatedNodes.map(n => 
                n.id === departmentNodeId 
                  ? { ...n, data: { ...n.data, expanded: true, selected: true } }
                  : { ...n, data: { ...n.data, selected: false } }
              );
              
              const layoutedNodes = calculateTreeLayout(updatedNodes);
              nodesRef.current = layoutedNodes;
              setTimeout(resolve, 100);
              return layoutedNodes;
            });
          });

          setEdges((prevEdges) => [...prevEdges, ...newEdges]);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Step 5: Find the faculty node (Layer 4)
        // Keep loading batches until we find the target faculty or exhaust all children
        const departmentNodeId = departmentNode.id;
        let facultyNode: Node<CustomNodeData> | undefined;
        attempts = 0; // Reset attempts counter

        while (!facultyNode && attempts < maxAttempts) {
          attempts++;
          
          // Check current nodes for the faculty
          await new Promise<void>((resolve) => {
            setNodes((currentNodes) => {
              nodesRef.current = currentNodes;
              facultyNode = currentNodes.find(n => 
                n.data.level === 4 && 
                n.data.facultyId === navigationPath.faculty_id
              ) as Node<CustomNodeData> | undefined;
              resolve();
              return currentNodes;
            });
          });

          if (facultyNode) {
            console.log(`Found faculty node: ${facultyNode.data.label} (ID: ${facultyNode.id})`);
            break;
          }

          // Check if there are more children to load for this department
          let currentPendingChildren: typeof pendingChildren = null;
          await new Promise<void>((resolve) => {
            setPendingChildren((current) => {
              currentPendingChildren = current;
              pendingChildrenRef.current = current;
              resolve();
              return current;
            });
          });

          if (!currentPendingChildren || currentPendingChildren.parentId !== departmentNodeId) {
            console.error(`Faculty not found: ${navigationPath.faculty_id}. All batches exhausted.`);
            break;
          }

          // Load next batch
          console.log(`Faculty not in current batch, loading next batch... (attempt ${attempts})`);
          
          const parentNode = nodesRef.current.find(n => n.id === currentPendingChildren!.parentId);
          if (!parentNode) {
            console.error('Parent node not found for loading next batch');
            break;
          }

          const nextBatch = currentPendingChildren.children.slice(0, BATCH_SIZE);
          const remaining = currentPendingChildren.children.slice(BATCH_SIZE);
          const startIndex = currentPendingChildren.currentIndex;

          const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(
            parentNode as Node<CustomNodeData>,
            nextBatch,
            startIndex
          );

          // Update pending children state
          if (remaining.length > 0) {
            const newPendingChildren = {
              parentId: currentPendingChildren.parentId,
              children: remaining,
              currentIndex: startIndex + BATCH_SIZE
            };
            setPendingChildren(newPendingChildren);
            pendingChildrenRef.current = newPendingChildren;
          } else {
            setPendingChildren(null);
            pendingChildrenRef.current = null;
          }

          await new Promise<void>((resolve) => {
            setNodes((prevNodes) => {
              const updatedNodes = [...prevNodes, ...newNodes];
              const layoutedNodes = calculateTreeLayout(updatedNodes);
              nodesRef.current = layoutedNodes;
              setTimeout(resolve, 100);
              return layoutedNodes;
            });
          });

          setEdges((prevEdges) => [...prevEdges, ...newEdges]);
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        if (!facultyNode) {
          console.error(`Faculty node not found after ${attempts} attempts`);
          onNavigationComplete();
          return;
        }

        // Step 6: Expand the faculty node (Layer 4) to show project types
        const isFacultyExpanded = expandedNodes.current.has(facultyNode.id);
        
        if (!isFacultyExpanded) {
          const childrenData = await fetchChildrenData(facultyNode as Node<CustomNodeData>);
          
          if (childrenData.length === 0) {
            console.log('No children data for faculty node');
            onNavigationComplete();
            return;
          }

          const initialBatch = childrenData.slice(0, BATCH_SIZE);
          const remaining = childrenData.slice(BATCH_SIZE);
          
          if (remaining.length > 0) {
            const newPendingChildren = {
              parentId: facultyNode.id,
              children: remaining,
              currentIndex: BATCH_SIZE
            };
            setPendingChildren(newPendingChildren);
            pendingChildrenRef.current = newPendingChildren;
          } else {
            setPendingChildren(null);
            pendingChildrenRef.current = null;
          }

          const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(
            facultyNode as Node<CustomNodeData>,
            initialBatch,
            0
          );

          const facultyNodeId = facultyNode.id;
          await new Promise<void>((resolve) => {
            setNodes((prevNodes) => {
              let updatedNodes = [...prevNodes, ...newNodes];
              expandedNodes.current.add(facultyNodeId);
              
              updatedNodes = updatedNodes.map(n => 
                n.id === facultyNodeId 
                  ? { ...n, data: { ...n.data, expanded: true, selected: true } }
                  : { ...n, data: { ...n.data, selected: false } }
              );
              
              const layoutedNodes = calculateTreeLayout(updatedNodes);
              nodesRef.current = layoutedNodes;
              setTimeout(resolve, 100);
              return layoutedNodes;
            });
          });

          setEdges((prevEdges) => [...prevEdges, ...newEdges]);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Step 7: Find and expand the project type node (Layer 5)
        // Project types are "PHD Thesis" or "Research" - only 2 options, so no batch loading needed
        const facultyNodeId = facultyNode.id;
        let projectTypeNode: Node<CustomNodeData> | undefined;
        
        await new Promise<void>((resolve) => {
          setNodes((currentNodes) => {
            nodesRef.current = currentNodes;
            // Find the project type node that matches navigationPath.project_type
            // The node's label or studentName should match the project_type
            projectTypeNode = currentNodes.find(n => 
              n.data.level === 5 && 
              n.id.startsWith(facultyNodeId + '-') &&
              (n.data.label === navigationPath.project_type || n.data.studentName === navigationPath.project_type)
            ) as Node<CustomNodeData> | undefined;
            resolve();
            return currentNodes;
          });
        });

        if (!projectTypeNode) {
          console.error(`Project type node not found for: ${navigationPath.project_type}`);
          onNavigationComplete();
          return;
        }

        console.log(`Found project type node: ${projectTypeNode.data.label} (ID: ${projectTypeNode.id})`);

        // Expand the project type node to show documents
        const isProjectTypeExpanded = expandedNodes.current.has(projectTypeNode.id);
        
        if (!isProjectTypeExpanded) {
          const childrenData = await fetchChildrenData(projectTypeNode as Node<CustomNodeData>);
          
          if (childrenData.length === 0) {
            console.log('No children data for project type node');
            onNavigationComplete();
            return;
          }

          const initialBatch = childrenData.slice(0, BATCH_SIZE);
          const remaining = childrenData.slice(BATCH_SIZE);
          
          if (remaining.length > 0) {
            const newPendingChildren = {
              parentId: projectTypeNode.id,
              children: remaining,
              currentIndex: BATCH_SIZE
            };
            setPendingChildren(newPendingChildren);
            pendingChildrenRef.current = newPendingChildren;
          } else {
            setPendingChildren(null);
            pendingChildrenRef.current = null;
          }

          const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(
            projectTypeNode as Node<CustomNodeData>,
            initialBatch,
            0
          );

          const projectTypeNodeId = projectTypeNode.id;
          await new Promise<void>((resolve) => {
            setNodes((prevNodes) => {
              let updatedNodes = [...prevNodes, ...newNodes];
              expandedNodes.current.add(projectTypeNodeId);
              
              updatedNodes = updatedNodes.map(n => 
                n.id === projectTypeNodeId 
                  ? { ...n, data: { ...n.data, expanded: true, selected: true } }
                  : { ...n, data: { ...n.data, selected: false } }
              );
              
              const layoutedNodes = calculateTreeLayout(updatedNodes);
              nodesRef.current = layoutedNodes;
              setTimeout(resolve, 100);
              return layoutedNodes;
            });
          });

          setEdges((prevEdges) => [...prevEdges, ...newEdges]);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Step 8: Find the document node (Layer 6) and highlight the path
        // Keep loading batches until we find the target document or exhaust all children
        const projectTypeNodeId = projectTypeNode.id;
        let documentNode: Node<CustomNodeData> | undefined;
        attempts = 0; // Reset attempts counter

        while (!documentNode && attempts < maxAttempts) {
          attempts++;
          
          // Check current nodes for the document
          await new Promise<void>((resolve) => {
            setNodes((currentNodes) => {
              nodesRef.current = currentNodes;
              // Find the document node that matches navigationPath.doc_id
              // The node's phdThesisId or researchId should match the doc_id
              documentNode = currentNodes.find(n => 
                n.data.level === 6 && 
                n.id.startsWith(projectTypeNodeId + '-') &&
                (n.data.phdThesisId === navigationPath.doc_id || n.data.researchId === navigationPath.doc_id)
              ) as Node<CustomNodeData> | undefined;
              resolve();
              return currentNodes;
            });
          });

          if (documentNode) {
            console.log(`Found document node: ${documentNode.data.label} (ID: ${documentNode.id})`);
            break;
          }

          // Check if there are more children to load for this project type
          let currentPendingChildren: typeof pendingChildren = null;
          await new Promise<void>((resolve) => {
            setPendingChildren((current) => {
              currentPendingChildren = current;
              pendingChildrenRef.current = current;
              resolve();
              return current;
            });
          });

          if (!currentPendingChildren || currentPendingChildren.parentId !== projectTypeNodeId) {
            console.error(`Document not found: ${navigationPath.doc_id}. All batches exhausted.`);
            break;
          }

          // Load next batch
          console.log(`Document not in current batch, loading next batch... (attempt ${attempts})`);
          
          const parentNode = nodesRef.current.find(n => n.id === currentPendingChildren!.parentId);
          if (!parentNode) {
            console.error('Parent node not found for loading next batch');
            break;
          }

          const nextBatch = currentPendingChildren.children.slice(0, BATCH_SIZE);
          const remaining = currentPendingChildren.children.slice(BATCH_SIZE);
          const startIndex = currentPendingChildren.currentIndex;

          const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(
            parentNode as Node<CustomNodeData>,
            nextBatch,
            startIndex
          );

          // Update pending children state
          if (remaining.length > 0) {
            const newPendingChildren = {
              parentId: currentPendingChildren.parentId,
              children: remaining,
              currentIndex: startIndex + BATCH_SIZE
            };
            setPendingChildren(newPendingChildren);
            pendingChildrenRef.current = newPendingChildren;
          } else {
            setPendingChildren(null);
            pendingChildrenRef.current = null;
          }

          await new Promise<void>((resolve) => {
            setNodes((prevNodes) => {
              const updatedNodes = [...prevNodes, ...newNodes];
              const layoutedNodes = calculateTreeLayout(updatedNodes);
              nodesRef.current = layoutedNodes;
              setTimeout(resolve, 100);
              return layoutedNodes;
            });
          });

          setEdges((prevEdges) => [...prevEdges, ...newEdges]);
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        // Step 9: Highlight the entire path from root to document
        if (documentNode) {
          // Get all node IDs in the path (e.g., "1-2-3-4-1-2" -> ["1", "1-2", "1-2-3", "1-2-3-4", "1-2-3-4-1", "1-2-3-4-1-2"])
          const pathNodeIds: string[] = [];
          const parts = documentNode.id.split('-');
          for (let i = 1; i <= parts.length; i++) {
            pathNodeIds.push(parts.slice(0, i).join('-'));
          }
          
          console.log('Highlighting path:', pathNodeIds);

          // Update all nodes to highlight the path
          await new Promise<void>((resolve) => {
            setNodes((currentNodes) => {
              const updatedNodes = currentNodes.map(n => ({
                ...n,
                data: {
                  ...n.data,
                  highlighted: pathNodeIds.includes(n.id),
                  selected: n.id === documentNode!.id, // Select only the final document node
                }
              }));
              
              const layoutedNodes = calculateTreeLayout(updatedNodes);
              nodesRef.current = layoutedNodes;
              setTimeout(resolve, 100);
              return layoutedNodes;
            });
          });

          // Also highlight the edges in the path by matching source and target
          setEdges((prevEdges) => 
            prevEdges.map(edge => {
              // Check if this edge connects two consecutive nodes in the path
              const sourceIndex = pathNodeIds.indexOf(edge.source);
              const targetIndex = pathNodeIds.indexOf(edge.target);
              const isPathEdge = sourceIndex !== -1 && targetIndex !== -1 && targetIndex === sourceIndex + 1;
              
              return {
                ...edge,
                style: isPathEdge
                  ? { 
                      stroke: 'hsl(45, 100%, 50%)', 
                      strokeWidth: 4,
                      filter: 'drop-shadow(0 0 8px hsl(45, 100%, 50%)) drop-shadow(0 0 16px hsl(45, 100%, 50%, 0.6))'
                    }
                  : { stroke: 'hsl(var(--primary))', strokeWidth: 2 }
              };
            })
          );
        } else {
          console.error(`Document node not found after ${attempts} attempts`);
        }

        // Mark navigation as complete
        onNavigationComplete();

      } catch (error) {
        console.error('Error during navigation:', error);
        onNavigationComplete();
      } finally {
        setIsLoading(false);
      }
    };

    navigateToPath();
  }, [navigationPath]);

  // Handle node click with debouncing
  const handleNodeClick = useCallback(async (event: React.MouseEvent, node: Node<CustomNodeData>) => {
    event.stopPropagation();
    
    // Clear any highlighting from navigation path
    setNodes((prevNodes) => 
      prevNodes.map(n => ({
        ...n,
        data: { ...n.data, highlighted: false, selected: false }
      }))
    );
    setEdges((prevEdges) => 
      prevEdges.map(edge => ({
        ...edge,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 }
      }))
    );
    
    // If it's a thesis node, show the appropriate thesis card
    if (node.data.nodeType === 'thesis') {
      setIsLoading(true);
      try {
        // Check if it's a PhD thesis
        if (node.data.phdThesisId) {
          const phdThesisDetails = await fetchPhdThesisById(node.data.phdThesisId);
          setSelectedPhdThesis(phdThesisDetails);
        }
        // Check if it's a research paper
        else if (node.data.researchId) {
          const researchDetails = await fetchResearchById(node.data.researchId);
          setSelectedResearch(researchDetails);
        }
        // Otherwise it's a regular thesis
        else if (node.data.thesisData) {
          const thesisDetails = await fetchThesisById(node.data.thesisData.id);
          setSelectedThesis(thesisDetails);
        }
      } catch (error) {
        console.error('Error fetching thesis details:', error);
        // Fallback to the data we already have for regular thesis
        if (node.data.thesisData) {
          setSelectedThesis(node.data.thesisData);
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Check if at max depth (thesis nodes)
    if (node.data.isMaxDepth) return;

    // Debounce to prevent conflicting recalculations
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const isExpanded = expandedNodes.current.has(node.id);
    setSelectedNodeId(node.id);

    if (isExpanded) {
      // Collapse: remove all descendants (synchronous)
      debounceTimerRef.current = setTimeout(() => {
        // Clear pending children if collapsing the parent that has pending children
        if (pendingChildren && pendingChildren.parentId === node.id) {
          setPendingChildren(null);
        }
        
        setNodes((prevNodes) => {
          let updatedNodes = [...prevNodes];
          const descendants = getDescendants(node.id, updatedNodes);
          updatedNodes = updatedNodes.filter(n => !descendants.includes(n.id));
          
          expandedNodes.current.delete(node.id);
          
          // Also clear pending children if the parent of pending children is being collapsed
          if (pendingChildren && descendants.includes(pendingChildren.parentId)) {
            setPendingChildren(null);
          }
          
          setEdges((prevEdges) => 
            prevEdges.filter(e => !descendants.includes(e.target))
          );
          
          updatedNodes = updatedNodes.map(n => 
            n.id === node.id 
              ? { ...n, data: { ...n.data, expanded: false, selected: true } }
              : { ...n, data: { ...n.data, selected: false } }
          );
          
          const layoutedNodes = calculateTreeLayout(updatedNodes);
          
          return layoutedNodes;
        });
      }, DEBOUNCE_DELAY);
    } else {
      // Expand: fetch children from API (asynchronous)
      setIsLoading(true);
      
      try {
        const childrenData = await fetchChildrenData(node);
        
        if (childrenData.length === 0) {
          setIsLoading(false);
          return;
        }
        
        // Determine how many to show initially
        const initialBatch = childrenData.slice(0, BATCH_SIZE);
        const remaining = childrenData.slice(BATCH_SIZE);
        
        // Store remaining children for pagination
        if (remaining.length > 0) {
          setPendingChildren({
            parentId: node.id,
            children: remaining,
            currentIndex: BATCH_SIZE
          });
        } else {
          setPendingChildren(null);
        }
        
        const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(node, initialBatch, 0);
        
        setNodes((prevNodes) => {
          let updatedNodes = [...prevNodes, ...newNodes];
          
          expandedNodes.current.add(node.id);
          
          updatedNodes = updatedNodes.map(n => 
            n.id === node.id 
              ? { ...n, data: { ...n.data, expanded: true, selected: true } }
              : { ...n, data: { ...n.data, selected: false } }
          );
          
          const layoutedNodes = calculateTreeLayout(updatedNodes);
          
          return layoutedNodes;
        });
        
        setEdges((prevEdges) => [...prevEdges, ...newEdges]);
        
      } catch (error) {
        console.error('Error expanding node:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [fetchChildrenData, createNodesFromChildren, getDescendants, calculateTreeLayout, setEdges, setNodes]);

  // Load next batch of children (Next 5)
  const loadNextBatch = useCallback(() => {
    if (!pendingChildren) return;
    
    const parentNode = nodes.find(n => n.id === pendingChildren.parentId);
    if (!parentNode) return;
    
    const nextBatch = pendingChildren.children.slice(0, BATCH_SIZE);
    const remaining = pendingChildren.children.slice(BATCH_SIZE);
    const startIndex = pendingChildren.currentIndex;
    
    const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(
      parentNode as Node<CustomNodeData>,
      nextBatch,
      startIndex
    );
    
    // Update pending children state
    if (remaining.length > 0) {
      setPendingChildren({
        parentId: pendingChildren.parentId,
        children: remaining,
        currentIndex: startIndex + BATCH_SIZE
      });
    } else {
      setPendingChildren(null);
    }
    
    setNodes((prevNodes) => {
      const updatedNodes = [...prevNodes, ...newNodes];
      const layoutedNodes = calculateTreeLayout(updatedNodes);
      
      return layoutedNodes;
    });
    
    setEdges((prevEdges) => [...prevEdges, ...newEdges]);
  }, [pendingChildren, nodes, createNodesFromChildren, calculateTreeLayout, setNodes, setEdges]);

  // Load all remaining children (Show All)
  const loadAllRemaining = useCallback(() => {
    if (!pendingChildren) return;
    
    const parentNode = nodes.find(n => n.id === pendingChildren.parentId);
    if (!parentNode) return;
    
    const { nodes: newNodes, edges: newEdges } = createNodesFromChildren(
      parentNode as Node<CustomNodeData>,
      pendingChildren.children,
      pendingChildren.currentIndex
    );
    
    setPendingChildren(null);
    
    setNodes((prevNodes) => {
      const updatedNodes = [...prevNodes, ...newNodes];
      const layoutedNodes = calculateTreeLayout(updatedNodes);
      
      return layoutedNodes;
    });
    
    setEdges((prevEdges) => [...prevEdges, ...newEdges]);
  }, [pendingChildren, nodes, createNodesFromChildren, calculateTreeLayout, setNodes, setEdges]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setPendingChildren(null);  // Clear any pending children
    setNodes((prevNodes) => {
      const rootNode = prevNodes.find(n => n.id === '1');
      if (!rootNode) return prevNodes;
      
      return [{
        ...rootNode,
        data: { ...rootNode.data, expanded: false, selected: false, nodeType: 'root' as NodeType }
      }];
    });
    setEdges([]);
    expandedNodes.current.clear();
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        collapseAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapseAll]);

  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    fitView({ 
      padding: CONFIG.FIT_VIEW_PADDING, 
      duration: CONFIG.ANIMATION_DURATION 
    });
  };

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-background p-4 rounded-lg shadow-lg border">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        minZoom={CONFIG.MIN_ZOOM}
        maxZoom={CONFIG.MAX_ZOOM}
        fitView
        fitViewOptions={{ padding: CONFIG.FIT_VIEW_PADDING }}
        className="bg-background"
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        
        <Panel position="top-right" className="bg-background/95 backdrop-blur p-3 rounded-lg border border-border shadow-lg">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomOut}
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[3rem] text-center">
                {zoomLevel}%
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomIn}
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleFitView}
                aria-label="Fit view"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Pagination Controls - show when there are pending children */}
            {pendingChildren && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {pendingChildren.children.length} more
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadNextBatch}
                  >
                    Next 5
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={loadAllRemaining}
                  >
                    Show All
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Panel>

      </ReactFlow>

      {/* Thesis Details Card */}
      {selectedThesis && (
        <ThesisCard 
          thesis={selectedThesis} 
          onClose={() => setSelectedThesis(null)} 
        />
      )}

      {/* PhD Thesis Details Card */}
      {selectedPhdThesis && (
        <PhdThesisCard 
          thesis={selectedPhdThesis} 
          onClose={() => setSelectedPhdThesis(null)} 
        />
      )}

      {/* Research Paper Details Card */}
      {selectedResearch && (
        <ResearchCard 
          research={selectedResearch} 
          onClose={() => setSelectedResearch(null)} 
        />
      )}
    </div>
  );
};

interface MindMapProps {
  navigationPath: OpenPathResponse | null;
  onNavigationComplete: () => void;
}

const MindMap = ({ navigationPath, onNavigationComplete }: MindMapProps) => {
  return (
    <ReactFlowProvider>
      <MindMapContent 
        navigationPath={navigationPath} 
        onNavigationComplete={onNavigationComplete}
      />
    </ReactFlowProvider>
  );
};

export default MindMap;
