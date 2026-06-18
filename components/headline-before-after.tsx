import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HeadlineBeforeAfterProps {
  original: string;
  rewritten: string;
  revealed: boolean;
  /** Overlay (gate de e-mail) renderizado sobre o card "Depois" enquanto !revealed. */
  children?: ReactNode;
}

export function HeadlineBeforeAfter({
  original,
  rewritten,
  revealed,
  children,
}: HeadlineBeforeAfterProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Badge variant="outline">Antes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed text-foreground">{original}</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Badge className="bg-primary text-primary-foreground">Depois</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-base leading-relaxed text-foreground transition-all duration-300",
              !revealed && "select-none blur-sm",
            )}
          >
            {rewritten}
          </p>
        </CardContent>
        {!revealed && children}
      </Card>
    </div>
  );
}
