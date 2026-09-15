import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyRemarks } from "../../services/entities";
import { Avatar } from "../../components/common/Avatar";
import type { RemarkStudentListItem } from "../../types/user";

export default function StudentRemarks() {
  const user = getCurrentUser();

  const [remarks, setRemarks] = useState<RemarkStudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyRemarks(1, 10)
      .then(r => {
        setRemarks(r.results);
        setPage(r.current_page);
        setTotalPages(r.total_pages);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    getMyRemarks(nextPage, 10).then(r => {
      setRemarks(prev => [...prev, ...r.results]);
      setPage(r.current_page);
      setTotalPages(r.total_pages);
    }).finally(() => setLoadingMore(false));
  };

  const sortedRemarks = [...remarks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function formatRemarkDate(dateStr: string) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading remarks...</div></>;
  }

  return (
    <>
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h2>My Remarks</h2>
        <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-text-secondary)" }}>
          Feedback and academic notes shared by your instructors
        </p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Student record not found.
        </div>
      ) : (
        <>
          <div className="table-responsive content-card" style={{ boxShadow: "var(--shadow-sm)" }}>
            <table className="data-table table-compact" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 20px" }}>Date</th>
                  <th style={{ padding: "12px 20px" }}>Course</th>
                  <th style={{ padding: "12px 20px" }}>Instructor</th>
                  <th style={{ padding: "12px 20px" }}>Feedback & Remarks</th>
                </tr>
              </thead>
              <tbody>
                {sortedRemarks.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "36px 20px", color: "var(--color-text-secondary)" }}>
                      No remarks or feedback recorded yet.
                    </td>
                  </tr>
                ) : (
                  sortedRemarks.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: "12px 20px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {formatRemarkDate(r.date)}
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                        {r.course}
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Avatar name={r.teacher || "Instructor"} size={22} />
                          <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{r.teacher}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px", color: "var(--color-text-primary)", fontSize: "0.875rem", lineHeight: 1.45 }}>
                        <div style={{
                          padding: "8px 12px",
                          backgroundColor: "#f8fafc",
                          borderRadius: "6px",
                          border: "1px solid #f1f5f9",
                          borderLeft: "3px solid var(--color-primary)",
                        }}>
                          {r.remark}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {page < totalPages && (
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button className="btn btn-secondary btn-sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
