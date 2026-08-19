import React from "react";
import { usePermissions } from "../../hooks/usePermissions";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
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
}: EntityTableProps<T>) {
  const { canUpdate, canDelete } = usePermissions();

  const showActions = !!onEdit || !!onDelete || !!onView;
  const canEdit = onEdit && canUpdate(resourceName);
  const canRemove = onDelete && canDelete(resourceName);
  
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
            {columns.map((col, idx) => (
              <th key={idx}>{col.label}</th>
            ))}
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
    </div>
  );
}
