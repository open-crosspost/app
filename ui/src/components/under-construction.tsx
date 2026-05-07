import { Construction } from "lucide-react";

interface UnderConstructionProps {
  label: string;
  sourceFile?: string;
  className?: string;
}

export function UnderConstruction({ label, sourceFile, className }: UnderConstructionProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-sm border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground ${className ?? ""}`}
    >
      <Construction size={14} />
      <span>
        {label} integration is under construction
        {sourceFile ? <span className="ml-1 opacity-60">({sourceFile})</span> : null}
      </span>
    </div>
  );
}