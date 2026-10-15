import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import React, { useEffect, useMemo, useState } from "react";
import palette from "@/constants/palette";
import { formatMoney } from "@/hooks/usePosCart";
import { WEB_FONT_STACK } from "@/utils/globalFont";

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

// Misma tipografía y paleta que el resto de la app.
const CSS = `
.pos-cmdk-overlay { position: fixed; inset: 0; background: ${palette.overlay}; z-index: 1000; }
.pos-cmdk { position: fixed; top: 12vh; left: 50%; transform: translateX(-50%); width: min(680px, 92vw);
  background: ${palette.surface}; border: 1px solid ${palette.border}; border-radius: 14px;
  box-shadow: 0 24px 60px rgba(31, 36, 27, .25); z-index: 1001; overflow: hidden; font-family: ${WEB_FONT_STACK}; }
.pos-cmdk * { font-family: inherit; }
.pos-cmdk-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.pos-cmdk [cmdk-input] { width: 100%; box-sizing: border-box; border: 0; border-bottom: 1px solid ${palette.border}; outline: none;
  font-size: 18px; padding: 18px 20px; color: ${palette.text}; background: transparent; }
.pos-cmdk [cmdk-input]::placeholder { color: ${palette.textMuted}; }
.pos-cmdk [cmdk-list] { max-height: 52vh; overflow: auto; padding: 6px; }
.pos-cmdk [cmdk-item] { padding: 10px 12px; border-radius: 10px; cursor: pointer; }
.pos-cmdk [cmdk-item][data-selected="true"] { background: ${palette.primarySoft}; }
.pos-cmdk [cmdk-item][data-disabled="true"] { opacity: .45; cursor: not-allowed; }
.pos-cmdk [cmdk-empty] { padding: 24px; text-align: center; color: ${palette.textSecondary}; }
.pos-cmdk-row { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.pos-cmdk-name { font-size: 15px; color: ${palette.text}; display: flex; flex-direction: column; }
.pos-cmdk-code { font-size: 12px; color: ${palette.textMuted}; }
.pos-cmdk-meta { display: flex; gap: 14px; align-items: center; font-size: 15px; white-space: nowrap; color: ${palette.text}; }
.pos-cmdk-stock { font-size: 12px; color: ${palette.success}; }
.pos-cmdk-stock.out { color: ${palette.error}; }
.pos-cmdk-footer { border-top: 1px solid ${palette.border}; padding: 8px 14px; font-size: 12px; color: ${palette.textMuted}; }
`;
