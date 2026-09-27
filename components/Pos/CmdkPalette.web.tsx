import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import React, { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/hooks/usePosCart";

type Item = App.Entities.PosCatalogItem;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: (query: string, limit?: number) => Item[];
  onSelect: (item: Item) => void;
}

/**
 * Paleta de búsqueda de productos (web de escritorio). Se abre con F2 / Ctrl+K
 * o "/", flechas para moverse, Enter agrega y ESC cierra. El filtrado lo hace
 * fuse.js (búsqueda difusa por nombre y código), no cmdk.
 */
export default function CmdkPalette({ open, onOpenChange, search, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => search(query, 40), [search, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <>
      <style>{CSS}</style>
      <Command.Dialog
        open={open}
        onOpenChange={onOpenChange}
        label="Buscar producto"
        shouldFilter={false}
        className="pos-cmdk"
        overlayClassName="pos-cmdk-overlay"
      >
        {/* Radix exige un título para lectores de pantalla. */}
        <Dialog.Title className="pos-cmdk-sr">Buscar producto</Dialog.Title>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Escanea o escribe nombre o código…"
          autoFocus
        />
        <Command.List>
          <Command.Empty>Sin resultados para “{query}”</Command.Empty>
          {results.map((item) => (
            <Command.Item
              key={item.key}
              value={item.key}
              onSelect={() => {
                onSelect(item);
                onOpenChange(false);
              }}
              disabled={item.stock <= 0}
            >
              <div className="pos-cmdk-row">
                <div className="pos-cmdk-name">
                  {item.name}
                  <span className="pos-cmdk-code">{item.code}</span>
                </div>
                <div className="pos-cmdk-meta">
                  <span className={item.stock > 0 ? "pos-cmdk-stock" : "pos-cmdk-stock out"}>
                    {item.stock > 0 ? `${item.stock} ${item.unit?.abbreviation ?? ""}` : "Sin existencia"}
                  </span>
                  <strong>{formatMoney(item.price)}</strong>
                </div>
              </div>
            </Command.Item>
          ))}
        </Command.List>
        <div className="pos-cmdk-footer">↑↓ moverse · Enter agregar · Esc cerrar</div>
      </Command.Dialog>
    </>
  );
}

const CSS = `
.pos-cmdk-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); z-index: 1000; }
.pos-cmdk { position: fixed; top: 12vh; left: 50%; transform: translateX(-50%); width: min(680px, 92vw);
  background: #fff; border-radius: 14px; box-shadow: 0 24px 60px rgba(15,23,42,.35); z-index: 1001; overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
.pos-cmdk * { font-family: inherit; }
.pos-cmdk-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.pos-cmdk [cmdk-input] { width: 100%; box-sizing: border-box; border: 0; border-bottom: 1px solid #e2e8f0; outline: none;
  font-size: 18px; padding: 18px 20px; }
.pos-cmdk [cmdk-list] { max-height: 52vh; overflow: auto; padding: 6px; }
.pos-cmdk [cmdk-item] { padding: 10px 12px; border-radius: 10px; cursor: pointer; }
.pos-cmdk [cmdk-item][data-selected="true"] { background: #ecf3e7; }
.pos-cmdk [cmdk-item][data-disabled="true"] { opacity: .45; cursor: not-allowed; }
.pos-cmdk [cmdk-empty] { padding: 24px; text-align: center; color: #64748b; }
.pos-cmdk-row { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.pos-cmdk-name { font-size: 15px; color: #0f172a; display: flex; flex-direction: column; }
.pos-cmdk-code { font-size: 12px; color: #94a3b8; }
.pos-cmdk-meta { display: flex; gap: 14px; align-items: center; font-size: 15px; white-space: nowrap; }
.pos-cmdk-stock { font-size: 12px; color: #16a34a; }
.pos-cmdk-stock.out { color: #dc2626; }
.pos-cmdk-footer { border-top: 1px solid #e2e8f0; padding: 8px 14px; font-size: 12px; color: #94a3b8; }
`;
