import React from "react";
import TextInputPanel from "./TextInputPanel";
import MindMapVisualization from "./MindMapVisualization";

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
  const [nodes, setNodes] = React.useState([
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
  ]);

  const [edges, setEdges] = React.useState([
    {
      source: "1",
      target: "2",
      type: "authored",
    },
  ]);

  const [detectedEntities, setDetectedEntities] = React.useState({
    people: ["Ibn Khaldun", "Al-Tabari", "Al-Biruni"],
    places: ["Baghdad", "Damascus", "Cairo"],
    events: ["Battle of Badr", "Fall of Granada"],
    dates: ["632 CE", "750 CE", "1258 CE"],
  });

  const handleTextProcess = async (text: string) => {
    const { analyzeText } = await import("@/lib/gemini");
    const result = await analyzeText(text);

    if (!result) {
      console.error("Failed to analyze text");
      return;
    }

    setDetectedEntities(result.entities);

    // Create new nodes from detected entities
    const newNodes = [
      ...nodes,
      ...result.entities.people.map((person, index) => ({
        id: `person-${nodes.length + index}`,
        type: "شخصية تاريخية",
        title: person.name,
        description: person.description || "",
        subtitle: person.title,
        x:
          400 +
          Math.cos(index * ((2 * Math.PI) / result.entities.people.length)) *
            300,
        y:
          400 +
          Math.sin(index * ((2 * Math.PI) / result.entities.people.length)) *
            300,
        id: `person-${nodes.length + index}`,
        type: "Historical Figure",
        title: person,
        description: "",
        x: 400 + index * 150,
        y: 400,
        relationships: [],
        dates: [],
      })),
      ...result.entities.places.map((place, index) => ({
        id: `place-${nodes.length + result.entities.people.length + index}`,
        type: "مكان",
        title: place.name,
        description: place.description || "",
        subtitle: place.type,
        x:
          400 +
          Math.cos(index * ((2 * Math.PI) / result.entities.places.length)) *
            500,
        y:
          400 +
          Math.sin(index * ((2 * Math.PI) / result.entities.places.length)) *
            500,
        id: `place-${nodes.length + result.entities.people.length + index}`,
        type: "Place",
        title: place,
        description: "",
        x: 400 + index * 150,
        y: 600,
        relationships: [],
        dates: [],
      })),
      ...result.entities.events.map((event, index) => ({
        id: `event-${nodes.length + result.entities.people.length + result.entities.places.length + index}`,
        type: "حدث",
        title: event.name,
        description: event.description || "",
        subtitle: event.type,
        x:
          400 +
          Math.cos(index * ((2 * Math.PI) / result.entities.events.length)) *
            700,
        y:
          400 +
          Math.sin(index * ((2 * Math.PI) / result.entities.events.length)) *
            700,
        id: `event-${nodes.length + result.entities.people.length + result.entities.places.length + index}`,
        type: "Event",
        title: event,
        description: "",
        x: 400 + index * 150,
        y: 800,
        relationships: [],
        dates: result.entities.dates,
      })),
    ];

    setNodes(newNodes);

    // Create edges between related entities
    const newEdges = result.relationships.map((rel) => ({
      source: rel.source,
      target: rel.target,
      type: rel.type,
    }));

    setEdges([...edges, ...newEdges]);
  };

  const handleNodeDrag = (nodeId: string, x: number, y: number) => {
    setNodes(
      nodes.map((node) => (node.id === nodeId ? { ...node, x, y } : node)),
    );
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <TextInputPanel
        onProcessText={handleTextProcess}
        onSave={onSaveText}
        isProcessing={isProcessing}
        detectedEntities={detectedEntities}
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
