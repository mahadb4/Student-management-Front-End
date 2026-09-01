import { useEffect, useState } from "react";
import { attendanceService, getAttendanceList, getEnrollmentList } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { PaginatedSelect } from "../../components/common/PaginatedSelect";
import type { Attendance, AttendanceListItem, AttendanceStatus } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function AttendanceMgmt() {
  const { showToast } = useToast();
  const [attendance, setAttendance] = useState<AttendanceListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(true);
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
    date: new Date().toISOString().split('T')[0],
    status: "PRESENT" as AttendanceStatus,
    remarks: "" 
  });

  const loadData = (signal?: AbortSignal) => {
    setLoading(true);
    getAttendanceList(currentPage, pageSize, signal).then(res => {
      setAttendance(res.results);
      setTotalCount(res.total_count);
    }).catch(err => {
      if (err.name === 'AbortError') return;
      console.error(err);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [currentPage,pageSize]);

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
        enrollment: "", date: new Date().toISOString().split('T')[0],
        status: "PRESENT", remarks: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (formData.enrollment === "") {
      showToast("Please select an enrollment.", "error");
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
          <p>Manage student attendance across all courses</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Record
        </button>
      </div>

      <div className="content-card">
        <EntityTable<AttendanceListItem>
          data={attendance}
          loading={loading}
          resourceName="attendance"
          columns={[
            {
              key: "enrollment",
              label: "Student & Course",
              render: (a) => a.enrollment_id
                ? `${a.student_name} - ${a.course_code}`
                : "Unknown"
            },
            { key: "date", label: "Date" },
            { 
              key: "status", 
              label: "Status",
              render: (a) => {
                let badgeClass = "badge-warning";
                if (a.status === "PRESENT") badgeClass = "badge-success";
                if (a.status === "ABSENT") badgeClass = "badge-danger";
                return <span className={`badge ${badgeClass}`}>{a.status}</span>;
              }
            },
            { key: "remarks", label: "Remarks" }
          ]}
          onEdit={handleOpenModal}
          onDelete={setDeleteConfirm}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <Modal isOpen={isModalOpen} title={editingRecord ? "Edit Record" : "Add Record"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Enrollment</label>
            <PaginatedSelect
              fetchPage={(page, pageSize, signal, search) => getEnrollmentList(page, pageSize, signal, search)}
              getId={e => e.id}
              getLabel={e => `${e.student_name} - ${e.course_code}`}
              value={formData.enrollment}
              onChange={id => setFormData({...formData, enrollment: id})}
              selectedLabel={editingEnrollmentLabel}
              placeholder="-- Select Enrollment --"
              serverSearch
              searchPlaceholder="Search student or course..."
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
