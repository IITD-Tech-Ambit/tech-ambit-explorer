import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';

export interface CustomNodeData {
  label: string;
  level: number;
  expanded: boolean;
  isMaxDepth: boolean;
  [key: string]: unknown;
}

const CustomNode = ({ data }: NodeProps) => {
  const { label, level, expanded, isMaxDepth } = data as CustomNodeData;
  
  // Color variations based on level
  const getNodeColor = () => {
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

  return (
    <div 
      className="relative group"
      role="button"
      tabIndex={0}
      aria-label={`${label}, ${expanded ? 'expanded' : 'collapsed'}${isMaxDepth ? ', max depth reached' : ''}`}
    >
      {level > 1 && (
        <Handle 
          type="target" 
          position={Position.Top}
          className="!w-2 !h-2 !bg-primary"
        />
      )}
      
      <div 
        className="relative flex items-center justify-center w-[120px] h-[120px] rounded-full border-4 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-xl"
        style={{ 
          borderColor: getNodeColor(),
          backgroundColor: 'hsl(var(--background))',
        }}
      >
        <div className="text-center px-4">
          <p className="font-bold text-base" style={{ color: getNodeColor() }}>
            {label}
          </p>
          
          {isMaxDepth && (
            <div className="mt-1 flex justify-center">
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
        
        {!isMaxDepth && (
          <div 
            className="absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-transform"
            style={{ 
              backgroundColor: getNodeColor(),
              color: 'white',
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </div>
        )}
      </div>
      
      {!isMaxDepth && (
        <Handle 
          type="source" 
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-primary"
        />
      )}
    </div>
  );
};

export default memo(CustomNode);
