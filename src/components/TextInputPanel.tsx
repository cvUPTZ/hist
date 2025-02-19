import React, { useState, useRef } from "react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Play, Save, FileUp, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { analyzeText, AnalysisResult } from "@/lib/gemini";

interface TextInputPanelProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  onSave?: (text: string) => void;
  onReset?: () => void;
  isProcessing?: boolean;
  detectedEntities: AnalysisResult["entities"];
}

const TextInputPanel = ({
  onAnalysisComplete,
  onSave = () => console.log("Save text"),
  onReset = () => console.log("Reset text"),
  isProcessing: externalIsProcessing = false,
  detectedEntities,
}: TextInputPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        setText(text);
        setError(null);
      } catch (err) {
        setError("Failed to read file");
      }
    }
  };

  const handleProcessText = async () => {
    if (!text.trim()) {
      setError("Please enter some text to analyze");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const result = await analyzeText(text);
      onAnalysisComplete(result);
    } catch (err: any) {
      if (err?.message?.includes("503") || err?.message?.includes("overloaded")) {
        setError(
          "The service is currently overloaded. Please try again in a few moments."
        );
      } else if (err?.message?.includes("API key")) {
        setError("API configuration error. Please contact support.");
      } else {
        setError(err?.message || "An error occurred while processing the text");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-[400px] h-full bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <CardTitle className="mb-4">Text Analysis Input</CardTitle>
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleFileUploadClick}
          >
            <FileUp className="w-4 h-4 mr-2" />
            Upload Text
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".txt,.doc,.docx"
            onChange={handleFileChange}
          />
        </div>
        <Textarea
          placeholder="أدخل أو الصق النص التاريخي هنا..."
          className="min-h-[200px] font-arabic text-lg"
          dir="rtl"
          style={{
            fontFamily: "'Noto Naskh Arabic', 'Amiri', serif",
          }}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
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
          >
            <Play className="w-4 h-4 mr-2" />
            {isProcessing || externalIsProcessing
              ? "Processing..."
              : "Process Text"}
          </Button>
          <Button variant="outline" onClick={() => onSave(text)}>
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
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">People</h4>
                <div className="flex flex-wrap gap-2">
                  {detectedEntities.people.map((person, index) => (
                    <Badge key={index} variant="secondary">
                      {person.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Places</h4>
                <div className="flex flex-wrap gap-2">
                  {detectedEntities.places.map((place, index) => (
                    <Badge key={index} variant="outline">
                      {place.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Events</h4>
                <div className="flex flex-wrap gap-2">
                  {detectedEntities.events.map((event, index) => (
                    <Badge key={index} variant="secondary">
                      {event.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Dates</h4>
                <div className="flex flex-wrap gap-2">
                  {detectedEntities.dates.map((date, index) => (
                    <Badge key={index} variant="outline">
                      {date.date}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </ScrollArea>
    </div>
  );
};

export default TextInputPanel;
