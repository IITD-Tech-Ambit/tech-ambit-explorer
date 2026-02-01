import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { ThesisData } from '@/lib/api';

export type NodeType = 'root' | 'category' | 'collection' | 'professor' | 'student' | 'thesis';

export interface CustomNodeData {
  label: string;
  level: number;
  expanded: boolean;
  isMaxDepth: boolean;
  selected?: boolean;
  highlighted?: boolean;     // For navigation path highlighting
  nodeType: NodeType;
  categoryName?: string;      // For category nodes (Departments/Schools/Centres)
  departmentName?: string;    // For collection nodes (department/school/centre name)
  departmentId?: string;      // For collection nodes (department/school/centre ID)
  facultyId?: string;         // For professor and student nodes (faculty member ID)
  thesisId?: string;          // For regular thesis nodes (thesis ID)
  phdThesisId?: string;       // For PhD thesis nodes (PhD thesis document ID)
  researchId?: string;        // For research paper nodes (research document ID)
  handle?: string;            // For collection nodes (department/school/centre handle)
  professorName?: string;     // For professor nodes
  studentName?: string;       // For student nodes
  thesisData?: ThesisData;    // For thesis nodes
  [key: string]: unknown;
}

// Fixed node dimensions - change these values to adjust all nodes
const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;

// Calculate font size based on label length to fit all text
const getFontSize = (label: string): number => {
  const length = label.length;
  if (length <= 12) return 14;
  if (length <= 20) return 12;
  if (length <= 35) return 10;
  if (length <= 50) return 9;
  return 8;
};

// Calculate line height based on font size
const getLineHeight = (fontSize: number): number => {
  return fontSize <= 10 ? 1.3 : 1.2;
};

const CustomNode = ({ data }: NodeProps) => {
  const { label, level, expanded, isMaxDepth, selected, highlighted } = data as CustomNodeData;
  
  const fontSize = getFontSize(label);
  const lineHeight = getLineHeight(fontSize);
  
  // Color variations based on level (for text)
  const getTextColor = () => {
    const colors = [
      'hsl(var(--primary))',
      'hsl(280, 70%, 50%)',
      'hsl(220, 70%, 50%)',
      'hsl(160, 70%, 45%)',
      'hsl(40, 80%, 50%)',
      'hsl(0, 70%, 50%)',
      'hsl(180, 60%, 45%)',
      'hsl(300, 60%, 50%)',
    ];
    return colors[(level - 1) % colors.length];
  };
  
  // Border color - golden if highlighted, otherwise based on level
  const getBorderColor = () => {
    if (highlighted) {
      return 'hsl(45, 100%, 50%)';
    }
    return getTextColor();
  };

  return (
    <div 
      className="relative group"
      role="button"
      tabIndex={0}
      aria-label={`${label}, ${expanded ? 'expanded' : 'collapsed'}${isMaxDepth ? ', max depth reached' : ''}`}
    >
      {/* Target handle on LEFT for children (receives connection from parent) */}
      {level > 1 && (
        <Handle 
          type="target" 
          position={Position.Left}
          className="!w-2 !h-2 !bg-primary"
        />
      )}
      
      <div 
        className="relative flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-xl"
        style={{ 
          width: `${NODE_WIDTH}px`,
          height: `${NODE_HEIGHT}px`,
          borderColor: getBorderColor(),
          borderWidth: highlighted ? '5px' : (selected ? '4px' : '3px'),
          borderStyle: 'solid',
          backgroundColor: 'hsl(var(--background))',
          boxShadow: highlighted 
            ? `0 0 25px hsl(45, 100%, 50%, 0.6), 0 0 50px hsl(45, 100%, 50%, 0.3)` 
            : (selected ? `0 0 20px ${getBorderColor()}40` : undefined),
        }}
      >
        <div className="text-center px-2 w-full overflow-hidden flex items-center justify-center" style={{ height: `${NODE_HEIGHT - 16}px` }}>
          <p 
            className="font-bold leading-tight break-words"
            style={{ 
              color: getTextColor(),
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            title={label}
          >
            {label}
          </p>
        </div>
      </div>
      
      {/* Source handle on RIGHT for parents (connects to children) */}
      {!isMaxDepth && (
        <Handle 
          type="source" 
          position={Position.Right}
          className="!w-2 !h-2 !bg-primary"
        />
      )}
    </div>
  );
};

export default memo(CustomNode);
