import { Badge } from "@/components/ui/badge";

interface KeywordHighlightsProps {
  items: string[];
}

export function KeywordHighlights({ items }: KeywordHighlightsProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Adicionamos {items.length} keywords que recrutadores internacionais buscam na sua área:
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="font-normal">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
