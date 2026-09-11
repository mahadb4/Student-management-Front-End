import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyRemarks } from "../../services/entities";
import type { RemarkStudentListItem } from "../../types/user";

// GET /remarks/ is scoped server-side for a student to their own
// STUDENT_VISIBLE remarks only (see remarks/authorization.py) - PRIVATE
// remarks are never sent to the frontend in the first place, so there is
// no client-side filtering to get right or get wrong here.
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
    // getCurrentUser() re-parses localStorage on every call and returns a
    // fresh object each render, so depending on `user` here would refire
    // this effect after every setState below, in an infinite loop. Same
    // pattern as TeacherAttendance/StudentAttendance's load effects.
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

  const sortedRemarks = [...remarks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading remarks...</div></>;
  }

  return (
    <>
      <div className="page-header">
        <h2>My Remarks</h2>
        <p>Feedback your teachers have shared with you</p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Student record not found.
        </div>
      ) : (
        <>
          <div className="table-responsive content-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Course</th>
                  <th>Teacher</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {sortedRemarks.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>No remarks yet.</td>
                  </tr>
                ) : (
                  sortedRemarks.map(r => (
                    <tr key={r.id}>
                      <td><strong>{new Date(r.created_at).toLocaleDateString()}</strong></td>
                      <td>{r.course_name} ({r.course_code})</td>
                      <td>{r.teacher_name}</td>
                      <td>{r.remark_text}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {page < totalPages && (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
