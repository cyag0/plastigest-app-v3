/**
 * En la app nativa no hay paleta de comandos (cmdk es solo DOM): el POS usa
 * SimpleSearchModal. Metro toma CmdkPalette.web.tsx en web.
 */
export default function CmdkPalette(_props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: (query: string, limit?: number) => App.Entities.PosCatalogItem[];
  findByCode: (code: string) => App.Entities.PosCatalogItem | null;
  onSelect: (item: App.Entities.PosCatalogItem) => void;
}) {
  return null;
}
