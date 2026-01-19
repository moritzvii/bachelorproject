"use client";

import type { ReactNode } from "react";
import { ReferenceArea, ReferenceLine } from "recharts";

const CELL_COUNT = 3;




const createMatrixElements = (): ReactNode[] => {
  const elements: ReactNode[] = [];

  
  elements.push(
    <ReferenceArea
      key="matrix-background"
      x1={0}
      x2={1}
      y1={0}
      y2={1}
      fill="hsl(var(--chart-3))"
      fillOpacity={0.55}
      stroke="none"
    />
  );

  
  for (let i = 1; i < CELL_COUNT; i++) {
    const position = i / CELL_COUNT;

    elements.push(
      <ReferenceLine
        key={`vertical-${i}`}
        x={position}
        stroke="#ffffff"
        strokeWidth={4}
        strokeOpacity={0.5}
      />,
      <ReferenceLine
        key={`horizontal-${i}`}
        y={position}
        stroke="#ffffff"
        strokeWidth={4}
        strokeOpacity={0.5}
      />
    );
  }

  return elements;
};

export const matrixGridCells: ReactNode[] = createMatrixElements();
