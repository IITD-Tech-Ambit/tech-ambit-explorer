// Minimal type shim — react-cytoscapejs ships without TypeScript definitions.
declare module "react-cytoscapejs" {
  import type { Component, CSSProperties } from "react";
  import type { Core, ElementDefinition } from "cytoscape";

  interface CytoscapeComponentProps {
    elements: ElementDefinition[];
    stylesheet?: any[];
    layout?: any;
    style?: CSSProperties;
    cy?: (cy: Core) => void;
    minZoom?: number;
    maxZoom?: number;
    className?: string;
    [key: string]: any;
  }

  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {}
}

declare module "cytoscape-fcose" {
  const ext: (cytoscape: unknown) => void;
  export default ext;
}
