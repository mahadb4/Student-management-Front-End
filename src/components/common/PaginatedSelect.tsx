import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PaginatedResponse } from "../../services/entities";
import { usePaginatedDropdown } from "../../hooks/usePaginatedDropdown";

interface PaginatedSelectProps<T> {
  fetchPage: (page: number, pageSize: number, signal?: AbortSignal, search?: string) => Promise<PaginatedResponse<T>>;
  getId: (item: T) => number;
  getLabel: (item: T) => string;
  value: number | "";
  // item is the full loaded row for this id (not just the id) - lets a
  // parent read another field off the same selection (e.g. a dependent
  // dropdown's filter value) without an extra by-id lookup request.
  onChange: (id: number, item: T) => void;
  placeholder?: string;
  // Label to show for the current `value` before/without it being present in
  // the loaded page(s) - e.g. editing a record whose selection is outside the
  // first page. Supplied by the parent, which already has this data from the
  // row being edited, so no extra lookup request is needed.
  selectedLabel?: string;
  // Changing this key resets the dropdown's loaded pages back to page 1 and
  // re-fetches - used for a dependent dropdown (e.g. Section depends on the
  // selected Department id).
  resetKey?: string | number | null;
  disabled?: boolean;
  pageSize?: number;
  // When provided, renders a top "clear" row (e.g. "All Departments") that
  // calls onClear() instead of selecting an item - used for filter dropdowns
  // that support an unfiltered/"all" state.
  onClear?: () => void;
  clearLabel?: string;
  // true: the search box's text is sent to `fetchPage` as its `search` param
  // (the backing API already supports server-side search) - typing resets
  // pagination to page 1 and re-fetches matching records from the backend.
  // false/omitted: the backing API has no search support, so the search box
  // instead filters only the options already loaded into the dropdown by
  // scrolling - it cannot reach records on pages that haven't loaded yet.
  serverSearch?: boolean;
  searchPlaceholder?: string;
}

export function PaginatedSelect<T>({
  fetchPage, getId, getLabel, value, onChange,
  placeholder = "-- Select --", selectedLabel, resetKey, disabled, pageSize = 10,
  onClear, clearLabel = "All", serverSearch = false, searchPlaceholder = "Search...",
}: PaginatedSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  // The options panel is rendered into document.body (see the portal below)
  // instead of positioned relative to this field, so no scrollable ancestor
  // (a modal's own overflow-y:auto, a page's overflow:hidden content card,
  // etc.) can ever clip or misplace it - it only ever depends on the
  // button's own on-screen position, tracked here.
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  // Debounce only delays when a server request fires - it never stores or
  // reuses a previous response, so this is not a cache.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { items, loading, hasMore, loadNext } = usePaginatedDropdown<T>(
    fetchPage, pageSize, resetKey, serverSearch ? debouncedSearch : undefined,
  );

  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      const el = buttonRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom, left: r.left, width: r.width });
    };

    updateRect();
    // capture:true so this also fires for a scroll on any ancestor (e.g. the
    // Modal's own scrollable body), not just window-level scrolling.
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  // Client-side filtering only ever narrows what's already been loaded via
  // scroll pagination - it cannot search records on pages not yet fetched.
  const visibleItems = serverSearch || !search.trim()
    ? items
    : items.filter(i => getLabel(i).toLowerCase().includes(search.trim().toLowerCase()));

  const selectedItem = value === "" ? undefined : items.find(i => getId(i) === value);
  const currentLabel = value === "" ? "" : (selectedItem ? getLabel(selectedItem) : selectedLabel) || "";

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      loadNext();
    }
  };

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        type="button"
        className="form-control"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          textAlign: "left", cursor: disabled ? "not-allowed" : "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px",
        }}
      >
        <span style={{
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: value === "" ? "var(--color-text-secondary, #888)" : "inherit",
        }}>
          {value === "" ? placeholder : (currentLabel || placeholder)}
        </span>
        <span aria-hidden style={{ opacity: 0.6, fontSize: "0.75em", transform: open ? "rotate(180deg)" : undefined }}>▼</span>
      </button>

      {open && rect && createPortal(
        <>
          <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 1010 }} />
          <div
            style={{
              position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 1011,
              background: "var(--color-surface, #fff)",
              border: "1px solid var(--color-border, #ccc)", borderRadius: "6px", marginTop: "4px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ padding: "8px", borderBottom: "1px solid var(--color-border, #eee)" }}>
              <input
                autoFocus
                type="text"
                className="form-control"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: "6px 8px" }}
              />
            </div>

            <div onScroll={handleScroll} style={{ maxHeight: "200px", overflowY: "auto", overscrollBehavior: "contain" }}>
              {onClear && !search && (
                <div
                  onClick={() => { onClear(); close(); }}
                  style={{
                    padding: "8px 12px", cursor: "pointer",
                    background: value === "" ? "var(--color-primary-light, #eef2ff)" : "transparent",
                    fontStyle: "italic",
                  }}
                >
                  {clearLabel}
                </div>
              )}

              {visibleItems.map(item => {
                const id = getId(item);
                return (
                  <div
                    key={id}
                    onClick={() => { onChange(id, item); close(); }}
                    style={{
                      padding: "8px 12px", cursor: "pointer",
                      background: id === value ? "var(--color-primary-light, #eef2ff)" : "transparent",
                    }}
                  >
                    {getLabel(item)}
                  </div>
                );
              })}

              {!loading && visibleItems.length === 0 && (
                <div style={{ padding: "12px", color: "var(--color-text-secondary)", textAlign: "center" }}>
                  {search ? "No matching results." : "No records found."}
                </div>
              )}

              {loading && (
                <div style={{ padding: "10px 12px", color: "var(--color-text-secondary)", textAlign: "center", fontSize: "0.9em" }}>
                  Loading...
                </div>
              )}

              {!loading && !hasMore && visibleItems.length > 0 && !search && (
                <div style={{ padding: "6px 12px", color: "var(--color-text-secondary)", textAlign: "center", fontSize: "0.8em" }}>
                  End of list
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
