import React, { useState, useCallback } from "react";
import TextInputPanel from "./TextInputPanel";
import FlowGraph from "./FlowGraph";
import {
  AnalysisResult,
  AnalyzedEntity,
  AnalyzedRelationship,
} from "@/lib/gemini";
import { Node, Edge } from "reactflow";

interface HomeProps {
  onVisualizationExport?: (format: "image" | "pdf" | "json") => void;
  onSaveText?: (text: string) => void;
  initialText?: string;
}

const Home = ({
  onVisualizationExport = () => {},
  onSaveText = () => {},
  initialText = "",
}: HomeProps) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const convertToNodes = (result: AnalysisResult): Node[] => {
    return [
      ...result.entities.characters.map(
        createNode("character", "شخصية تاريخية"),
      ),
      ...result.entities.places.map(createNode("place", "مكان")),
      ...result.entities.events.map(createNode("event", "حدث")),
      ...result.entities.dates.map(createNode("date", "تاريخ")),
    ];
  };

  const createNode =
    (type: string, label: string) =>
    (entity: AnalyzedEntity, index: number) => ({
      id: `${type}-${index}-${entity.name}`,
      type: "mindmap",
      position: { x: 0, y: 0 },
      data: {
        title: entity.name,
        type: label,
        description: entity.description || "",
        dates: entity.date ? [entity.date] : [],
      },
    });

  const convertToEdges = (relationships: AnalyzedRelationship[]): Edge[] => {
    return relationships.map((rel, index) => ({
      id: `edge-${index}`,
      source: rel.source,
      target: rel.target,
      label: rel.type,
      data: { description: rel.description },
    }));
  };

  const handleAnalysisComplete = useCallback((result: AnalysisResult) => {
    const newNodes = convertToNodes(result);
    const newEdges = convertToEdges(result.relationships);
    setNodes(newNodes);
    setEdges(newEdges);
  }, []);

  return (
    <div className="flex h-screen w-full bg-background">
      <TextInputPanel
        onAnalysisComplete={handleAnalysisComplete}
        onSave={onSaveText}
        initialText={initialText}
      />

      <div className="flex-1">
        <FlowGraph
          nodes={nodes}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
        />
      </div>
    </div>
  );
};

export default Home;
