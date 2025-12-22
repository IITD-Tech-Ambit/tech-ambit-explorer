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
import {
  fetchCategories,
  fetchDepartments,
  fetchSchools,
  fetchCentres,
  fetchProfessors,
  fetchStudents,
  fetchTheses,
  fetchThesisById,
  ThesisData,
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

const MindMapContent = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, setCenter, getZoom, zoomIn, zoomOut } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState<ThesisData | null>(null);
  const expandedNodes = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pagination state
  const [pendingChildren, setPendingChildren] = useState<{
    parentId: string;
    children: Array<{ label: string; nodeType: NodeType; categoryName?: string; handle?: string; professorName?: string; studentName?: string; thesisData?: ThesisData }>;
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
        label: 'Thesis',
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
  const fetchChildrenData = useCallback(async (parentNode: Node<CustomNodeData>): Promise<Array<{ label: string; nodeType: NodeType; categoryName?: string; handle?: string; professorName?: string; studentName?: string; thesisData?: ThesisData }>> => {
    const parentNodeType = parentNode.data.nodeType;
    let childrenData: Array<{ label: string; nodeType: NodeType; categoryName?: string; handle?: string; professorName?: string; studentName?: string; thesisData?: ThesisData }> = [];

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
        let collections;
        
        if (categoryName === 'departments') {
          collections = await fetchDepartments();
        } else if (categoryName === 'schools') {
          collections = await fetchSchools();
        } else if (categoryName === 'centres') {
          collections = await fetchCentres();
        } else {
          collections = [];
        }
        
        childrenData = collections.map(col => ({
          label: col.department_name,
          nodeType: 'collection' as NodeType,
          handle: col.handle,
        }));
      }
      // Level 3 (Collection) -> Level 4 (Professors)
      else if (parentNodeType === 'collection' && parentNode.data.handle) {
        const professors = await fetchProfessors(parentNode.data.handle);
        childrenData = professors.map(prof => ({
          label: prof,
          nodeType: 'professor' as NodeType,
          professorName: prof,
        }));
      }
      // Level 4 (Professor) -> Level 5 (Students)
      else if (parentNodeType === 'professor' && parentNode.data.professorName) {
        const students = await fetchStudents(parentNode.data.professorName);
        childrenData = students.map(student => ({
          label: student,
          nodeType: 'student' as NodeType,
          studentName: student,
        }));
      }
      // Level 5 (Student) -> Level 6 (Theses)
      else if (parentNodeType === 'student' && parentNode.data.studentName) {
        const theses = await fetchTheses(parentNode.data.studentName);
        childrenData = theses.map(thesis => ({
          label: thesis.dc_title || 'Untitled Thesis',
          nodeType: 'thesis' as NodeType,
          thesisData: thesis,
        }));
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }

    return childrenData;
  }, []);

  // Create nodes and edges from children data
  const createNodesFromChildren = useCallback((
    parentNode: Node<CustomNodeData>,
    childrenData: Array<{ label: string; nodeType: NodeType; categoryName?: string; handle?: string; professorName?: string; studentName?: string; thesisData?: ThesisData }>,
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
        animated: true,
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

  // Handle node click with debouncing
  const handleNodeClick = useCallback(async (event: React.MouseEvent, node: Node<CustomNodeData>) => {
    event.stopPropagation();
    
    // If it's a thesis node, show the thesis card
    if (node.data.nodeType === 'thesis' && node.data.thesisData) {
      setIsLoading(true);
      try {
        // Fetch full thesis details
        const thesisDetails = await fetchThesisById(node.data.thesisData.id);
        setSelectedThesis(thesisDetails);
      } catch (error) {
        console.error('Error fetching thesis details:', error);
        // Fallback to the data we already have
        setSelectedThesis(node.data.thesisData);
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
    <div className="w-full h-[calc(100vh-5rem)] relative">
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
        <Controls showInteractive={false} />
        
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

        <Panel position="bottom-left" className="bg-background/95 backdrop-blur p-3 rounded-lg border border-border shadow-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><kbd className="px-1.5 py-0.5 bg-muted rounded">Click</kbd> node to expand/collapse</p>
            <p><kbd className="px-1.5 py-0.5 bg-muted rounded">Drag</kbd> background to pan</p>
            <p><kbd className="px-1.5 py-0.5 bg-muted rounded">Scroll</kbd> to zoom</p>
            <p><kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd> to collapse all</p>
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
    </div>
  );
};

const MindMap = () => {
  return (
    <ReactFlowProvider>
      <MindMapContent />
    </ReactFlowProvider>
  );
};

export default MindMap;
