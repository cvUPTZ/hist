import React from "react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Play, Save, FileUp, RotateCcw } from "lucide-react";

interface TextInputPanelProps {
  onProcessText?: (text: string) => void;
  onSave?: (text: string) => void;
  onReset?: () => void;
  onFileUpload?: (file: File) => void;
  isProcessing?: boolean;
  detectedEntities?: {
    people: string[];
    places: string[];
    events: string[];
    dates: string[];
  };
}

const TextInputPanel = ({
  onProcessText = (text: string) => console.log("Process text", text),
  onSave = () => console.log("Save text"),
  onReset = () => console.log("Reset text"),
  onFileUpload = () => console.log("File uploaded"),
  isProcessing = false,
  detectedEntities = {
    people: ["Ibn Khaldun", "Al-Tabari", "Al-Biruni"],
    places: ["Baghdad", "Damascus", "Cairo"],
    events: ["Battle of Badr", "Fall of Granada"],
    dates: ["632 CE", "750 CE", "1258 CE"],
  },
}: TextInputPanelProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const [text, setText] = React.useState("");

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const text = await file.text();
      setText(text);
      onFileUpload(file);
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
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1"
            onClick={() => onProcessText(text)}
            disabled={isProcessing}
          >
            <Play className="w-4 h-4 mr-2" />
            Process Text
          </Button>
          <Button variant="outline" onClick={onSave}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={onReset}>
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
                      {person}
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
                      {place}
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
                      {event}
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
                      {date}
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
