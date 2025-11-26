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

// Configurable constants
const CONFIG = {
  MAX_DEPTH: 8,
  NODE_WIDTH: 140,
  NODE_HEIGHT: 60,
  MIN_HORIZONTAL_GAP: 24,
  HORIZONTAL_SPACING: 250,
  VERTICAL_SPACING: 150,
  LEVEL_VERTICAL_GAP: 150,
  ANIMATION_DURATION: 300,
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 3.0,
  FIT_VIEW_PADDING: 0.12,
  CHILDREN_PER_NODE: 5,
};

const nodeTypes = {
  custom: CustomNode,
};

const MindMapContent = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, setCenter, getZoom, zoomIn, zoomOut } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState(100);
  const expandedNodes = useRef<Set<string>>(new Set());

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

  // Calculate subtree width for dynamic spacing
  const calculateSubtreeWidth = useCallback((nodeId: string, childrenMap: Map<string, string[]>): number => {
    const children = childrenMap.get(nodeId) || [];
    
    if (children.length === 0) {
      return CONFIG.NODE_WIDTH;
    }
    
    // Sort children to maintain order
    const sortedChildren = [...children].sort();
    
    const childrenWidth = sortedChildren.reduce((sum, childId) => {
      return sum + calculateSubtreeWidth(childId, childrenMap);
    }, 0);
    
    const totalGaps = Math.max(0, sortedChildren.length - 1) * CONFIG.MIN_HORIZONTAL_GAP;
    
    return Math.max(childrenWidth + totalGaps, CONFIG.NODE_WIDTH);
  }, []);

  // Calculate positions for tree layout with dynamic spacing
  const calculateTreeLayout = useCallback((allNodes: Node<CustomNodeData>[]) => {
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));
    const childrenMap = new Map<string, string[]>();
    
    // Build parent-child relationships and maintain order
    allNodes.forEach(node => {
      const parentId = node.id.split('-').slice(0, -1).join('-') || null;
      if (parentId) {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(node.id);
      }
    });

    // Sort all children arrays to maintain consistent order
    childrenMap.forEach((children, parentId) => {
      childrenMap.set(parentId, children.sort());
    });

    // Position nodes using tree layout with dynamic spacing
    const positionNode = (nodeId: string, x: number, y: number) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      node.position = { x, y };
      
      const children = childrenMap.get(nodeId) || [];
      if (children.length > 0) {
        // Ensure children are in sorted order (preserving original order)
        const sortedChildren = [...children].sort();
        
        // Calculate width needed for each child's subtree
        const childWidths = sortedChildren.map(childId => 
          calculateSubtreeWidth(childId, childrenMap)
        );
        
        const totalGaps = Math.max(0, sortedChildren.length - 1) * CONFIG.MIN_HORIZONTAL_GAP;
        const totalWidth = childWidths.reduce((sum, w) => sum + w, 0) + totalGaps;
        
        // Position children based on their subtree widths, maintaining order
        let currentX = x - totalWidth / 2;
        sortedChildren.forEach((childId, index) => {
          const childWidth = childWidths[index];
          const childX = currentX + childWidth / 2;
          const childY = y + CONFIG.LEVEL_VERTICAL_GAP;
          positionNode(childId, childX, childY);
          currentX += childWidth + CONFIG.MIN_HORIZONTAL_GAP;
        });
      }
    };

    positionNode('1', 0, 0);
    return allNodes;
  }, [calculateSubtreeWidth]);

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
          isMaxDepth: newLevel === CONFIG.MAX_DEPTH,
        },
      });

      newEdges.push({
        id: `e-${parentNode.id}-${childId}`,
        source: parentNode.id,
        target: childId,
        animated: true,
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
    if (node.data.level >= CONFIG.MAX_DEPTH) return;

    const isExpanded = expandedNodes.current.has(node.id);
    
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
      
      // Update node's expanded state
      updatedNodes = updatedNodes.map(n => 
        n.id === node.id 
          ? { ...n, data: { ...n.data, expanded: !isExpanded } }
          : n
      );
      
      // Recalculate layout
      const layoutedNodes = calculateTreeLayout(updatedNodes);
      
      // Auto-fit after layout
      setTimeout(() => {
        fitView({ 
          padding: CONFIG.FIT_VIEW_PADDING, 
          duration: CONFIG.ANIMATION_DURATION 
        });
      }, 50);
      
      return layoutedNodes;
    });
  }, [generateChildren, getDescendants, calculateTreeLayout, fitView, setEdges, setNodes]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setNodes((prevNodes) => {
      const rootNode = prevNodes.find(n => n.id === '1');
      if (!rootNode) return prevNodes;
      
      return [{
        ...rootNode,
        data: { ...rootNode.data, expanded: false }
      }];
    });
    setEdges([]);
    expandedNodes.current.clear();
    
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
