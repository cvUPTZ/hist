import React, { useState } from "react";
import { motion } from "framer-motion";
import NodeCard from "./NodeCard";
import VisualizationToolbar from "./VisualizationToolbar";

interface Node {
  id: string;
  type: string;
  title: string;
  description: string;
  x: number;
  y: number;
  relationships: Array<{
    type: string;
    entity: string;
  }>;
  dates: string[];
}

interface Edge {
  source: string;
  target: string;
  type: string;
}

interface MindMapVisualizationProps {
  nodes?: Node[];
  edges?: Edge[];
  onNodeClick?: (nodeId: string) => void;
  onNodeDrag?: (nodeId: string, x: number, y: number) => void;
}

const MindMapVisualization = ({
  nodes = [
    {
      id: "1",
      type: "Historical Figure",
      title: "Ibn Khaldun",
      description:
        "A prominent Arab historian and scholar who wrote the Muqaddimah.",
      x: 400,
      y: 300,
      relationships: [
        { type: "Wrote", entity: "Muqaddimah" },
        { type: "Influenced", entity: "Islamic Historiography" },
      ],
      dates: ["1332 CE", "1406 CE"],
    },
    {
      id: "2",
      type: "Text",
      title: "Muqaddimah",
      description:
        "A groundbreaking work on social sciences and historiography.",
      x: 700,
      y: 300,
      relationships: [
        { type: "Author", entity: "Ibn Khaldun" },
        { type: "Topic", entity: "Social Science" },
      ],
      dates: ["1377 CE"],
    },
  ],
  edges = [
    {
      source: "1",
      target: "2",
      type: "authored",
    },
  ],
  onNodeClick = (nodeId) => console.log(`Node clicked: ${nodeId}`),
  onNodeDrag = (nodeId, x, y) =>
    console.log(`Node ${nodeId} dragged to ${x},${y}`),
}: MindMapVisualizationProps) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setScale((scale) => Math.min(scale + 0.1, 2));
  const handleZoomOut = () => setScale((scale) => Math.max(scale - 0.1, 0.5));

  return (
    <div className="w-full h-full bg-gray-50 flex flex-col">
      <VisualizationToolbar onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      <div className="flex-1 relative overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            scale,
            x: position.x,
            y: position.y,
          }}
          drag
          dragMomentum={false}
          onDragEnd={(_, info) => {
            setPosition({
              x: position.x + info.offset.x,
              y: position.y + info.offset.y,
            });
          }}
        >
          {/* Render edges */}
          <svg className="absolute inset-0 pointer-events-none">
            {edges.map((edge, index) => {
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              return (
                <line
                  key={index}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
              );
            })}
          </svg>

          {/* Render nodes */}
          {nodes.map((node) => (
            <motion.div
              key={node.id}
              className="absolute"
              style={{
                x: node.x - 150, // Center the card (300px width / 2)
                y: node.y - 100, // Center the card (200px height / 2)
              }}
              drag
              dragMomentum={false}
              onDragEnd={(_, info) => {
                onNodeDrag(
                  node.id,
                  node.x + info.offset.x,
                  node.y + info.offset.y,
                );
              }}
              onClick={() => {
                setSelectedNode(node.id);
                onNodeClick(node.id);
              }}
            >
              <NodeCard
                title={node.title}
                type={node.type}
                description={node.description}
                relationships={node.relationships}
                dates={node.dates}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default MindMapVisualization;
