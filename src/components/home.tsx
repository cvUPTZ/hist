import React, { useState } from "react";
import TextInputPanel from "./TextInputPanel";
import MindMapVisualization from "./MindMapVisualization";
import { AnalysisResult } from "@/lib/gemini";

interface HomeProps {
  onVisualizationExport?: (format: "image" | "pdf" | "json") => void;
  onSaveText?: (text: string) => void;
  isProcessing?: boolean;
}

const Home = ({
  onVisualizationExport = (format) => console.log(`Exporting as ${format}`),
  onSaveText = () => console.log("Saving text"),
  isProcessing = false,
}: HomeProps) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>({
    entities: {
      people: [],
      places: [],
      events: [],
      dates: [],
    },
    relationships: [],
  });

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    
    // Convert analysis results to nodes
    const newNodes = [
      ...result.entities.people.map((person, index) => ({
        id: `person-${index}`,
        type: "شخصية تاريخية",
        title: person.name,
        description: person.description || "",
        subtitle: person.title,
        x: 400 + Math.cos(index * ((2 * Math.PI) / result.entities.people.length)) * 300,
        y: 400 + Math.sin(index * ((2 * Math.PI) / result.entities.people.length)) * 300,
        relationships: [],
        dates: [],
      })),
      ...result.entities.places.map((place, index) => ({
        id: `place-${index}`,
        type: "مكان",
        title: place.name,
        description: place.description || "",
        subtitle: place.type,
        x: 400 + Math.cos(index * ((2 * Math.PI) / result.entities.places.length)) * 500,
        y: 400 + Math.sin(index * ((2 * Math.PI) / result.entities.places.length)) * 500,
        relationships: [],
        dates: [],
      })),
      ...result.entities.events.map((event, index) => ({
        id: `event-${index}`,
        type: "حدث",
        title: event.name,
        description: event.description || "",
        subtitle: event.type,
        x: 400 + Math.cos(index * ((2 * Math.PI) / result.entities.events.length)) * 700,
        y: 400 + Math.sin(index * ((2 * Math.PI) / result.entities.events.length)) * 700,
        relationships: [],
        dates: [event.date || ""],
      })),
    ];

    setNodes(newNodes);

    // Convert relationships to edges
    const newEdges = result.relationships.map((rel, index) => ({
      id: `edge-${index}`,
      source: rel.source,
      target: rel.target,
      type: rel.type,
    }));

    setEdges(newEdges);
  };

  const handleNodeDrag = (nodeId: string, x: number, y: number) => {
    setNodes(
      nodes.map((node) => (node.id === nodeId ? { ...node, x, y } : node))
    );
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <TextInputPanel
        onAnalysisComplete={handleAnalysisComplete}
        onSave={onSaveText}
        isProcessing={isProcessing}
        detectedEntities={analysisResult.entities}
      />
      <div className="flex-1">
        <MindMapVisualization
          nodes={nodes}
          edges={edges}
          onNodeClick={(nodeId) => console.log(`Node clicked: ${nodeId}`)}
          onNodeDrag={handleNodeDrag}
        />
      </div>
    </div>
  );
};

export default Home;
