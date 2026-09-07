import React from "react";
import { usePermissions } from "../../hooks/usePermissions";

// Small inline icon, no third-party icon library in this project (see
// package.json) - a neutral double-chevron when the column isn't the active
// sort, a single chevron pointing the active direction when it is.
function SortIcon({ direction }: { direction: "asc" | "desc" | "none" }) {
  if (direction === "none") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ opacity: 0.45, flexShrink: 0 }}>
        <path d="M3 4.5L6 1.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 7.5L6 10.5L9 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      {direction === "asc" ? (
        <path d="M2.5 7.5L6 4L9.5 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  // Backend ordering key for this column (see each entity's *_repository.py
  // ORDERING_FIELDS), e.g. "name", "department". NOT the same thing as `key`
  // above - `key` is sometimes only a React/display identifier for a composite
  // `render` column (e.g. "course" paired with a course_name+code render) and
  // does not necessarily correspond to a real, backend-sortable field. Omit
  // sortKey to leave a column non-clickable/non-sortable.
  sortKey?: string;
}

interface EntityTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  resourceName: string; // e.g., "students"
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  emptyMessage?: string;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  // Current ordering value in backend form, e.g. "name" or "-name" - owned by
  // the parent page's state, same pattern as currentPage/onPageChange.
  ordering?: string;
  // Called with the FULL next ordering value (e.g. "-department") once
  // computed from the clicked column's sortKey and the current `ordering` -
  // the parent just needs to setOrdering(next) and reset its page state,
  // same as onPageSizeChange.
  onSortChange?: (ordering: string) => void;
}

export function EntityTable<T extends { id: number | string }>({
  data,
  columns,
  loading = false,
  resourceName,
  onEdit,
  onDelete,
  onView,
  emptyMessage = "No data available",
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  ordering,
  onSortChange,
}: EntityTableProps<T>) {
  const { canUpdate, canDelete } = usePermissions();

  const showActions = !!onEdit || !!onDelete || !!onView;
  const canEdit = onEdit && canUpdate(resourceName);
  const canRemove = onDelete && canDelete(resourceName);

  const handleSort = (sortKey: string) => {
    if (!onSortChange) return;
    // Same column, already ascending -> descending. Anything else (a
    // different column, or no current ordering) -> ascending on this column.
    onSortChange(ordering === sortKey ? `-${sortKey}` : sortKey);
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Loading...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-secondary)" }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => {
              const sortable = !!col.sortKey && !!onSortChange;
              const isActive = sortable && (ordering === col.sortKey || ordering === `-${col.sortKey}`);
              const isDescending = isActive && ordering?.startsWith("-");

              return (
                <th
                  key={idx}
                  onClick={sortable ? () => handleSort(col.sortKey!) : undefined}
                  className={sortable ? `sortable-col${isActive ? " active" : ""}` : undefined}
                  aria-sort={sortable ? (isActive ? (isDescending ? "descending" : "ascending") : "none") : undefined}
                >
                  {sortable ? (
                    <span
                      className="sort-label"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSort(col.sortKey!);
                        }
                      }}
                    >
                      {col.label}
                      <SortIcon direction={isActive ? (isDescending ? "desc" : "asc") : "none"} />
                    </span>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              {columns.map((col, idx) => (
                <td key={idx}>
                  {col.render
                    ? col.render(item)
                    : (item[col.key as keyof T] as unknown as React.ReactNode)}
                </td>
              ))}
              {showActions && (
                <td>
                  <div className="action-group">
                    {onView && (
                      <button onClick={() => onView(item)} className="btn btn-outline" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                        View
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => onEdit(item)} className="btn btn-outline" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                        Edit
                      </button>
                    )}
                    {canRemove && (
                      <button onClick={() => onDelete(item)} className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {totalCount !== undefined && currentPage !== undefined && pageSize !== undefined && onPageChange && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Showing {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onPageSizeChange && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Rows per page</span>
                <select
                  className="form-control"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  style={{ padding: "4px 8px", width: "auto" }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
            <button
              className="btn btn-outline"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              style={{ padding: "4px 12px" }}>
              Previous
            </button>
            <button 
              className="btn btn-outline" 
              disabled={currentPage * pageSize >= totalCount} 
              onClick={() => onPageChange(currentPage + 1)}
              style={{ padding: "4px 12px" }}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
