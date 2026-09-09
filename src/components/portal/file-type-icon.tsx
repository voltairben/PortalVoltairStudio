import { FileText, Film, ImageIcon, Paperclip } from "lucide-react";
import type { ComponentType } from "react";
import type { DeliverableFileType } from "@/types";

const ICONS: Record<DeliverableFileType, ComponentType<{ className?: string }>> = {
  video: Film,
  image: ImageIcon,
  document: FileText,
  other: Paperclip,
};

export function FileTypeIcon({
  type,
  className,
}: {
  type: DeliverableFileType;
  className?: string;
}) {
  const Icon = ICONS[type] ?? Paperclip;
  return <Icon className={className} />;
}
