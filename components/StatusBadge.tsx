import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "confirmed":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Confirmado
        </Badge>
      );
    case "submitted":
    case "pending":
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          Pendente
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Falhou
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary" className="gap-1">
          <FileText className="h-3 w-3" />
          Rascunho
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
