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
import { Plus, Minus, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import CustomNode, { CustomNodeData } from './CustomNode';

// Top-level configurable constants
const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;
const MIN_VERTICAL_GAP = 24;  // Vertical spacing between siblings in a column
const LEVEL_HORIZONTAL_GAP = 250;  // Horizontal spacing between columns (levels)
const MAX_DEPTH = 8;
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
  CHILDREN_PER_NODE: 5,
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
  const expandedNodes = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize with root node
  useEffect(() => {
    const rootNode: Node<CustomNodeData> = {
      id: '1',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        label: 'Level 1',
        level: 1,
        expanded: false,
        isMaxDepth: false,
        selected: false,
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
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));
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
    return allNodes;
  }, [calculateSubtreeHeight]);

  // Generate children for a node
  const generateChildren = useCallback((parentNode: Node<CustomNodeData>) => {
    const parentLevel = parentNode.data.level;
    const newLevel = parentLevel + 1;
    
    if (newLevel > CONFIG.MAX_DEPTH) return { nodes: [], edges: [] };

    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge[] = [];

    for (let i = 0; i < CONFIG.CHILDREN_PER_NODE; i++) {
      const childId = `${parentNode.id}-${i + 1}`;
      
      newNodes.push({
        id: childId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: `Level ${newLevel}`,
          level: newLevel,
          expanded: false,
          isMaxDepth: newLevel === MAX_DEPTH,
          selected: false,
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
    }

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
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node<CustomNodeData>) => {
    event.stopPropagation();
    
    // Check if at max depth
    if (node.data.level >= MAX_DEPTH) return;

    // Debounce to prevent conflicting recalculations
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const isExpanded = expandedNodes.current.has(node.id);
      setSelectedNodeId(node.id);
      
      setNodes((prevNodes) => {
        let updatedNodes = [...prevNodes];
        
        if (isExpanded) {
          // Collapse: remove all descendants
          const descendants = getDescendants(node.id, updatedNodes);
          updatedNodes = updatedNodes.filter(n => !descendants.includes(n.id));
          
          // Remove from expanded set
          expandedNodes.current.delete(node.id);
          
          // Update edges
          setEdges((prevEdges) => 
            prevEdges.filter(e => !descendants.includes(e.target))
          );
        } else {
          // Expand: add children
          const { nodes: newNodes, edges: newEdges } = generateChildren(node);
          updatedNodes = [...updatedNodes, ...newNodes];
          
          // Add to expanded set
          expandedNodes.current.add(node.id);
          
          // Update edges
          setEdges((prevEdges) => [...prevEdges, ...newEdges]);
        }
        
        // Update node's expanded state and selected state
        updatedNodes = updatedNodes.map(n => 
          n.id === node.id 
            ? { ...n, data: { ...n.data, expanded: !isExpanded, selected: true } }
            : { ...n, data: { ...n.data, selected: false } }
        );
        
        // STEP 1: Recalculate spacing for affected levels (Level X and Level X-1)
        // This computes uniform gaps across entire levels
        const layoutedNodes = calculateTreeLayout(updatedNodes);
        
        // Auto-fit after layout with animation
        setTimeout(() => {
          fitView({ 
            padding: CONFIG.FIT_VIEW_PADDING, 
            duration: ANIMATION_DURATION 
          });
        }, 50);
        
        return layoutedNodes;
      });
    }, DEBOUNCE_DELAY);
  }, [generateChildren, getDescendants, calculateTreeLayout, fitView, setEdges, setNodes]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setNodes((prevNodes) => {
      const rootNode = prevNodes.find(n => n.id === '1');
      if (!rootNode) return prevNodes;
      
      return [{
        ...rootNode,
        data: { ...rootNode.data, expanded: false, selected: false }
      }];
    });
    setEdges([]);
    expandedNodes.current.clear();
    setSelectedNodeId(null);
    
    setTimeout(() => {
      fitView({ 
        padding: CONFIG.FIT_VIEW_PADDING, 
        duration: CONFIG.ANIMATION_DURATION 
      });
    }, 50);
  }, [setNodes, setEdges, fitView]);

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
        
        <Panel position="top-right" className="flex gap-2 bg-background/95 backdrop-blur p-3 rounded-lg border border-border shadow-lg">
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
