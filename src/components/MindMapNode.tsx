import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface MindMapNodeProps {
  data: {
    title: string;
    type: string;
    description: string;
    dates?: string[];
  };
}

const getNodeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case "شخصية تاريخية":
    case "historical figure":
      return "bg-blue-50 border-blue-200";
    case "مكان":
    case "place":
      return "bg-green-50 border-green-200";
    case "حدث":
    case "event":
      return "bg-amber-50 border-amber-200";
    case "نص":
    case "text":
      return "bg-purple-50 border-purple-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
};

const MindMapNode = ({ data }: MindMapNodeProps) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      <Card className={`w-[200px] ${getNodeColor(data.type)}`}>
        <CardHeader className="p-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium leading-none">
              {data.title}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {data.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 text-xs">
          <p className="text-muted-foreground">{data.description}</p>
          {data.dates && data.dates.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {data.dates.join(" - ")}
            </div>
          )}
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </>
  );
};

export default memo(MindMapNode);
