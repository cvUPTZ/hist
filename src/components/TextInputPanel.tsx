import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Play, Save, FileUp, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { analyzeText, AnalysisResult, AnalyzedEntity } from "@/lib/gemini";

interface TextInputPanelProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  onSave?: (text: string) => void;
  onReset?: () => void;
  isProcessing?: boolean;
  initialText?: string;
  initialAnalysisResult?: AnalysisResult;
}

const TextInputPanel = ({
  onAnalysisComplete,
  onSave = () => {},
  onReset = () => {},
  isProcessing: externalIsProcessing = false,
  initialText = "",
  initialAnalysisResult,
}: TextInputPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(
    initialAnalysisResult || {
      entities: {
        characters: [],
        places: [],
        events: [],
        dates: [],
      },
      relationships: [],
    },
  );

  useEffect(() => {
    if (initialAnalysisResult) {
      setAnalysisResult(initialAnalysisResult);
    }
  }, [initialAnalysisResult]);

  const handleFileUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 1024 * 1024) {
        throw new Error("File size exceeds 1MB limit");
      }

      const fileText = await file.text();
      setText(fileText);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    }
  };

  const handleProcessText = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      setError("Please enter some text to analyze");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const result = await analyzeText(trimmedText);
      setAnalysisResult(result);
      onAnalysisComplete(result);
    } catch (err: any) {
      setError(err.message || "Failed to analyze text");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-[400px] h-full bg-background border-r flex flex-col">
      <div className="p-4 border-b">
        <CardTitle className="mb-4">Text Analysis Input</CardTitle>

        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleFileUploadClick}
            aria-label="Upload text file"
          >
            <FileUp className="w-4 h-4 mr-2" />
            Upload Text
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".txt"
            onChange={handleFileChange}
            aria-label="Text file input"
          />
        </div>

        <Textarea
          placeholder="أدخل أو الصق النص التاريخي هنا..."
          className="min-h-[200px] font-arabic text-lg"
          dir="rtl"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          aria-label="Arabic text input"
        />

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1"
            onClick={handleProcessText}
            disabled={isProcessing || externalIsProcessing}
            aria-label="Process text"
          >
            <Play className="w-4 h-4 mr-2" />
            {isProcessing || externalIsProcessing
              ? "Processing..."
              : "Process Text"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onSave(text)}
            aria-label="Save text"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setText("");
              setError(null);
              onReset();
            }}
            aria-label="Reset input"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Detected Entities</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(analysisResult.entities).map(
              ([category, entities]) => (
                <React.Fragment key={category}>
                  <div className="mt-4 first:mt-0">
                    <h4 className="text-sm font-semibold mb-2 capitalize">
                      {category}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(entities as AnalyzedEntity[]).map((entity, index) => (
                        <Badge key={index} variant="secondary">
                          {entity.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator className="my-3" />
                </React.Fragment>
              ),
            )}
          </CardContent>
        </Card>
      </ScrollArea>
    </div>
  );
};

export default TextInputPanel;
