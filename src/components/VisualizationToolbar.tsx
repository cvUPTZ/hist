import React from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  ZoomIn,
  ZoomOut,
  Download,
  Image,
  FileJson,
  FileText,
  Move,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface VisualizationToolbarProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onPan?: () => void;
  onExport?: (format: "image" | "pdf" | "json") => void;
}

const VisualizationToolbar = ({
  onZoomIn = () => console.log("Zoom in clicked"),
  onZoomOut = () => console.log("Zoom out clicked"),
  onPan = () => console.log("Pan clicked"),
  onExport = (format) => console.log(`Export as ${format} clicked'`),
}: VisualizationToolbarProps) => {
  return (
    <div className="w-full h-12 bg-background border-b flex items-center px-4 gap-2">
      <TooltipProvider>
        <div className="flex items-center gap-2 border-r pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onPan}>
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pan View</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onExport("image")}>
                <Image className="h-4 w-4 mr-2" />
                Export as Image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("pdf")}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("json")}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default VisualizationToolbar;
