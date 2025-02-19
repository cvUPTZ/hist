import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";

interface NodeCardProps {
  title?: string;
  type?: string;
  subtitle?: string;
  description?: string;
  relationships?: Array<{
    type: string;
    entity: string;
  }>;
  dates?: string[];
}

const getNodeColor = (type: string) => {
  switch (type) {
    case "شخصية تاريخية":
      return "bg-blue-50 border-blue-200";
    case "مكان":
      return "bg-green-50 border-green-200";
    case "حدث":
      return "bg-amber-50 border-amber-200";
    case "نص":
      return "bg-purple-50 border-purple-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
};

const NodeCard = ({
  title = "ابن خلدون",
  type = "شخصية تاريخية",
  subtitle = "مؤرخ وعالم اجتماع",
  description = "مؤرخ وفيلسوف عربي، يعتبر مؤسس علم الاجتماع",
  relationships = [
    { type: "كتب", entity: "المقدمة" },
    { type: "عاصر", entity: "الدولة المرينية" },
  ],
  dates = ["732 هـ", "808 هـ"],
}: NodeCardProps) => {
  return (
    <Card
      className={`w-[300px] shadow-lg hover:shadow-xl transition-shadow duration-200 ${getNodeColor(type)}`}
      style={{ fontFamily: "'Noto Naskh Arabic', 'Amiri', serif" }}
    >
      <CardHeader className="pb-2" dir="rtl">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {subtitle && (
              <div className="text-sm text-gray-600 mt-1">{subtitle}</div>
            )}
            <Badge variant="secondary" className="mt-1">
              {type}
            </Badge>
          </div>
          <div className="text-sm text-gray-500 font-arabic">
            {dates.join(" - ")}
          </div>
        </div>
      </CardHeader>
      <CardContent dir="rtl">
        <CardDescription className="text-sm mb-4 font-arabic">
          {description}
        </CardDescription>
        <Separator className="my-2" />
        <div className="mt-2">
          <h4 className="text-sm font-semibold mb-2 font-arabic">العلاقات</h4>
          <ScrollArea className="h-[100px]">
            <div className="space-y-2">
              {relationships.map((rel, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-arabic">
                    {rel.type}
                  </Badge>
                  <span className="text-sm font-arabic">{rel.entity}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default NodeCard;
