import { FileText, Film, Globe, ImageIcon, Paperclip } from "lucide-react";
import type { ComponentType } from "react";
import type { DeliverableFileType, DeliverableKind } from "@/types";

const ICONS: Record<DeliverableFileType, ComponentType<{ className?: string }>> = {
  video: Film,
  image: ImageIcon,
  document: FileText,
  other: Paperclip,
};

export function FileTypeIcon({
  type,
  kind,
  className,
}: {
  type: DeliverableFileType;
  /** When "website", overrides `type` with a globe icon — a website build's
   *  single asset is just an image (its screenshot), so `type` alone can't
   *  tell it apart from a plain image upload. */
  kind?: DeliverableKind;
  className?: string;
}) {
  if (kind === "website") return <Globe className={className} />;
  const Icon = ICONS[type] ?? Paperclip;
  return <Icon className={className} />;
}
