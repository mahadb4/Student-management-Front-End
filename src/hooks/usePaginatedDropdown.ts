import { useCallback, useEffect, useState } from "react";
import type { PaginatedResponse } from "../services/entities";

// Generic scroll-pagination state for a single dropdown's data source.
// No cached data survives beyond this hook instance: every mount (i.e. every
// time the owning component/modal opens) starts a fresh page-1 fetch, and
// changing `resetKey` (e.g. a parent Department id for a dependent Section
// dropdown, or a search term when server-side search is enabled) discards
// loaded items and re-fetches page 1. Duplicate in-flight requests are
// prevented with the `loading` state value itself (checked before starting a
// new fetch) - not a ref/cache.
export function usePaginatedDropdown<T>(
  fetchPage: (page: number, pageSize: number, signal?: AbortSignal, search?: string) => Promise<PaginatedResponse<T>>,
  pageSize: number = 10,
  resetKey?: string | number | null,
  // Only meaningful when the caller wires this dropdown to server-side search
  // (see PaginatedSelect's `serverSearch` prop) - pass undefined/omit for a
  // dropdown that filters its already-loaded items on the client instead, so
  // typing never triggers a reset/refetch here.
  search?: string,
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchAndAppend = useCallback((nextPage: number, replace: boolean, signal?: AbortSignal) => {
    setLoading(true);
    fetchPage(nextPage, pageSize, signal, search)
      .then(res => {
        // A superseded request (its own resetKey/search already changed
        // again before this one settled) can come back aborted-but-resolved
        // rather than rejected, or resolve with no usable body - either way,
        // a newer fetch already owns this dropdown's state, so skip it.
        if (!res || signal?.aborted) return;
        setItems(prev => replace ? res.results : [...prev, ...res.results]);
        setPage(res.current_page);
        setTotalPages(res.total_pages);
      })
      .catch(err => {
        if (err?.name === "AbortError") return;
        console.error(err);
      })
      .finally(() => setLoading(false));
    // fetchPage must be a dependency: callers can (and do, e.g. the
    // Enrollment form's student-section-scoped Course Offering dropdown)
    // pass a new fetchPage closure that captures other current state (like
    // the selected student's section id). Without it here, this callback
    // would keep calling a stale fetchPage frozen at whatever it captured
    // when pageSize/search last changed - silently ignoring any newer
    // filter value even though resetKey correctly triggers a refetch.
  }, [pageSize, search, fetchPage]);

  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setPage(0);
    setTotalPages(1);
    fetchAndAppend(1, true, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, search]);

  const loadNext = () => {
    if (loading) return;
    if (page > 0 && page >= totalPages) return;
    fetchAndAppend(page + 1, false);
  };

  return {
    items,
    loading,
    hasMore: page === 0 || page < totalPages,
    loadNext,
  };
}
