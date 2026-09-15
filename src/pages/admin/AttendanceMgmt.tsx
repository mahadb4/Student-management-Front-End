import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  attendanceService, getAttendanceList, getEnrollmentList,
  getDepartmentReference, getTeacherReference, getCourseOfferingReference,
} from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { PaginatedSelect } from "../../components/common/PaginatedSelect";
import type { Attendance, AttendanceListItem, AttendanceStatus } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function AttendanceMgmt() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Hierarchical filter context lives in the URL (department -> teacher ->
  // course_offering -> date), so a filtered view is shareable/bookmarkable
  // and survives refresh/back/forward - see Part 6 of the redesign.
  const departmentId = searchParams.get("department") ? Number(searchParams.get("department")) : "";
  const teacherId = searchParams.get("teacher") ? Number(searchParams.get("teacher")) : "";
  const courseOfferingId = searchParams.get("course_offering") ? Number(searchParams.get("course_offering")) : "";
  const date = searchParams.get("date") || "";

  const setFilterParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next);
  };

  const handleDepartmentChange = (id: number) => {
    setFilterParams({ department: String(id), teacher: undefined, course_offering: undefined, date: undefined });
  };
  const handleDepartmentClear = () => {
    setFilterParams({ department: undefined, teacher: undefined, course_offering: undefined, date: undefined });
  };
  const handleTeacherChange = (id: number) => {
    setFilterParams({ teacher: String(id), course_offering: undefined, date: undefined });
  };
  const handleTeacherClear = () => {
    setFilterParams({ teacher: undefined, course_offering: undefined, date: undefined });
  };
  const handleCourseOfferingChange = (id: number) => {
    setFilterParams({ course_offering: String(id), date: undefined });
    setCurrentPage(1);
  };
  const handleCourseOfferingClear = () => {
    setFilterParams({ course_offering: undefined });
  };
  const handleDateChange = (value: string) => {
    setFilterParams({ date: value || undefined });
    setCurrentPage(1);
  };

  const hasRequiredFilters = courseOfferingId !== "" && date !== "";

  const [attendance, setAttendance] = useState<AttendanceListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(false);
  // Label for the currently-edited record's Enrollment, shown until the
  // paginated dropdown's own loaded page happens to include it.
  const [editingEnrollmentLabel, setEditingEnrollmentLabel] = useState<string | undefined>(undefined);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AttendanceListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    enrollment: "" as number | "",
    date: date || today,
    status: "PRESENT" as AttendanceStatus,
    remarks: ""
  });

  const loadData = (signal?: AbortSignal) => {
    if (!hasRequiredFilters) {
      setAttendance([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    // hasRequiredFilters (checked above) already guarantees both are set here.
    getAttendanceList(currentPage, pageSize, signal, {
      courseOfferingId: courseOfferingId as number,
      date,
    }).then(res => {
      setAttendance(res.results);
      setTotalCount(res.total_count);
    }).catch(err => {
      if (err.name === 'AbortError') return;
      console.error(err);
    }).finally(() => setLoading(false));
  };

  // Fires only when the resolved filter context or pagination changes - no
  // GET /attendance/ at all until course_offering + date are both selected.
  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseOfferingId, date, currentPage, pageSize]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleOpenModal = (record?: AttendanceListItem) => {
    if (record) {
      setEditingRecord(record as unknown as Attendance);
      setEditingEnrollmentLabel(
        record.enrollment_id ? `${record.student_name} - ${record.course_code}` : undefined
      );
      setFormData({
        enrollment: record.enrollment_id ?? "",
        date: record.date,
        status: record.status,
        remarks: record.remarks || ""
      });
    } else {
      setEditingRecord(null);
      setEditingEnrollmentLabel(undefined);
      setFormData({
        enrollment: "", date: date || today,
        status: "PRESENT", remarks: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (formData.enrollment === "") {
      showToast("Please select a student.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const { enrollment, ...rest } = formData;
      const payload = {
        ...rest,
        enrollment_id: Number(enrollment),
      };

      if (editingRecord) {
        await attendanceService.update(editingRecord.id, payload as unknown as Partial<Attendance>);
        showToast("Attendance record updated successfully.", "success");
      } else {
        await attendanceService.create(payload as unknown as Partial<Attendance>);
        showToast("Attendance record created successfully.", "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save attendance.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await attendanceService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast("Attendance record deleted successfully.", "success");
      loadData();
    } catch (error) {
      console.error(error);
      showToast("Failed to delete attendance record.", "error");
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Attendance Records</h2>
          <p>Select a department, teacher, course and date to view attendance</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary"
          disabled={!hasRequiredFilters}
          title={hasRequiredFilters ? undefined : "Select a course offering and date first"}
        >
          + Add Record
        </button>
      </div>

      <div className="content-card" style={{ marginBottom: "24px", padding: "16px", overflow: "visible" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ maxWidth: "220px", width: "100%" }}>
            <PaginatedSelect
              fetchPage={(page, pageSize, signal, search) => getDepartmentReference(page, pageSize, signal, search)}
              getId={d => d.id}
              getLabel={d => d.name}
              value={departmentId}
              onChange={id => handleDepartmentChange(id)}
              onClear={handleDepartmentClear}
              clearLabel="All Departments"
              placeholder="Department"
              serverSearch
            />
          </div>

          <div style={{ maxWidth: "220px", width: "100%" }}>
            <PaginatedSelect
              fetchPage={(page, pageSize, signal) => getTeacherReference(page, pageSize, signal, departmentId === "" ? undefined : departmentId)}
              resetKey={departmentId}
              getId={t => t.id}
              getLabel={t => t.name}
              value={teacherId}
              onChange={id => handleTeacherChange(id)}
              onClear={handleTeacherClear}
              clearLabel="All Teachers"
              placeholder="Teacher"
              disabled={departmentId === ""}
            />
          </div>

          <div style={{ maxWidth: "260px", width: "100%" }}>
            <PaginatedSelect
              fetchPage={(page, pageSize, signal, search) => getCourseOfferingReference(page, pageSize, signal, search, teacherId === "" ? undefined : teacherId)}
              resetKey={teacherId}
              getId={c => c.id}
              getLabel={c => `${c.course_code} - ${c.section_name || "No Section"}`}
              value={courseOfferingId}
              onChange={id => handleCourseOfferingChange(id)}
              onClear={handleCourseOfferingClear}
              clearLabel="All Course Offerings"
              placeholder="Course / Section"
              serverSearch
              disabled={teacherId === ""}
            />
          </div>

          <div style={{ maxWidth: "200px", width: "100%" }}>
            <input
              type="date"
              className="form-control"
              value={date}
              max={today}
              onChange={e => handleDateChange(e.target.value)}
              disabled={courseOfferingId === ""}
            />
          </div>
        </div>
      </div>

      <div className="content-card" style={{ boxShadow: "var(--shadow-sm)" }}>
        {!hasRequiredFilters ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-secondary)" }}>
            Select a department, teacher, course offering and date to view attendance.
          </div>
        ) : (
          <>
            {/* Same register-card header style as the Teacher Attendance page:
                title + row count on the left, a Present/Late/Absent legend on
                the right - kept even though this table is read/edit (not
                inline-marking) so the two pages read as one consistent feature. */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Attendance Register</h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  {totalCount} {totalCount === 1 ? "record" : "records"}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "0.82rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-success)" }} />
                  Present
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-warning)" }} />
                  Late
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-danger)" }} />
                  Absent
                </span>
              </div>
            </div>

            <EntityTable<AttendanceListItem>
              data={attendance}
              loading={loading}
              resourceName="attendance"
              emptyMessage="No attendance records found for this course and date."
              columns={[
                {
                  key: "student_name",
                  label: "Student",
                  render: (a) => (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        backgroundColor: "var(--color-primary-light)",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {(a.student_name || "S").charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.875rem" }}>
                        {a.student_name || "Unknown"}
                      </span>
                    </div>
                  )
                },
                {
                  key: "enrollment_id",
                  label: "Enrollment ID",
                  render: (a) => (
                    <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
                      {a.enrollment_id ?? "-"}
                    </span>
                  )
                },
                {
                  key: "status",
                  label: "Status",
                  render: (a) => (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        backgroundColor:
                          a.status === "PRESENT" ? "var(--color-success-bg)" :
                          a.status === "ABSENT" ? "var(--color-danger-bg)" : "var(--color-warning-bg)",
                        color:
                          a.status === "PRESENT" ? "var(--color-success-text)" :
                          a.status === "ABSENT" ? "var(--color-danger-text)" : "var(--color-warning-text)",
                        border: `1px solid ${
                          a.status === "PRESENT" ? "var(--color-success-border)" :
                          a.status === "ABSENT" ? "var(--color-danger-border)" : "var(--color-warning-border)"
                        }`,
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor:
                            a.status === "PRESENT" ? "var(--color-success)" :
                            a.status === "ABSENT" ? "var(--color-danger)" : "var(--color-warning)",
                        }}
                      />
                      {a.status === "PRESENT" ? "Present" : a.status === "ABSENT" ? "Absent" : a.status === "LATE" ? "Late" : a.status}
                    </span>
                  )
                },
                { key: "remarks", label: "Remarks", render: (a) => a.remarks || <span style={{ color: "var(--color-text-secondary)", opacity: 0.5 }}>—</span> }
              ]}
              onEdit={handleOpenModal}
              onDelete={setDeleteConfirm}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>

      <Modal isOpen={isModalOpen} title={editingRecord ? "Edit Record" : "Add Record"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Student</label>
            <PaginatedSelect
              fetchPage={(page, pageSize, signal, search) => getEnrollmentList(page, pageSize, signal, search, undefined, courseOfferingId === "" ? undefined : courseOfferingId)}
              resetKey={courseOfferingId}
              getId={e => e.id}
              getLabel={e => `${e.student_name} - ${e.course_code}`}
              value={formData.enrollment}
              onChange={id => setFormData({...formData, enrollment: id})}
              selectedLabel={editingEnrollmentLabel}
              placeholder="-- Select Student --"
              serverSearch
              searchPlaceholder="Search student..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input required type="date" max={today} className="form-control" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select required className="form-control" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as AttendanceStatus})}>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <input className="form-control" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Record"
        message="Are you sure you want to delete this attendance record?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
