import Link from "next/link";
import { User, Building2, FolderKanban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandleBadge } from "@/components/HandleBadge";
import { WalletAddress } from "@/components/WalletAddress";

interface UserCardProps {
  name: string;
  handle: string;
  accountType: string;
  publicKey?: string | null;
  showSendButton?: boolean;
}

const accountTypeLabel: Record<string, string> = {
  person: "Pessoa",
  company: "Empresa",
  project: "Projeto",
  supplier: "Fornecedor",
};

const AccountIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "company":
      return <Building2 className="h-4 w-4" />;
    case "project":
      return <FolderKanban className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

export function UserCard({ name, handle, accountType, publicKey, showSendButton }: UserCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white text-xl font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-lg">{name}</h3>
              <Badge variant="secondary" className="gap-1 text-xs">
                <AccountIcon type={accountType} />
                {accountTypeLabel[accountType] ?? accountType}
              </Badge>
            </div>
            <HandleBadge handle={handle} size="sm" className="mt-1" />
            {publicKey && (
              <div className="mt-2">
                <WalletAddress publicKey={publicKey} />
              </div>
            )}
          </div>
          {showSendButton && (
            <Button asChild size="sm">
              <Link href={`/app/send?to=${handle}`}>Enviar</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
