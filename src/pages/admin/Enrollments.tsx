import { useEffect, useState } from "react";
import { enrollmentService, getStudentReference, getCourseOfferingList, getEnrollmentList } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { PaginatedSelect } from "../../components/common/PaginatedSelect";
import type { EnrollmentListItem, EnrollmentStatus, StudentReference } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function Enrollments() {
  const { showToast } = useToast();
  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  // Labels for the currently-edited enrollment's Student/Course Offering,
  // shown until the paginated dropdowns' own loaded pages happen to include them.
  const [editingLabels, setEditingLabels] = useState<{ student?: string; offering?: string }>({});

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentListItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EnrollmentListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    student: "" as number | "",
    course_offering: "" as number | "",
    status: "ACTIVE" as EnrollmentStatus
  });

  // The selected Student's own section - drives the Course Offering dropdown
  // below so only offerings compatible with that section are shown. undefined
  // = no student selected yet (or its section is still being looked up).
  const [selectedStudentSectionId, setSelectedStudentSectionId] = useState<number | null | undefined>(undefined);

  const loadData = (signal?: AbortSignal) => {
    setLoading(true);
    getEnrollmentList(currentPage, pageSize, signal, debouncedSearch).then(eRes => {
      setEnrollments(eRes.results);
      setTotalCount(eRes.total_count);
    }).catch(err => {
      if (err.name === 'AbortError') return;
      console.error(err);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    },400);

    return () => clearTimeout(timer);
  },[search]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [currentPage,pageSize,debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleOpenModal = (enrollment?: EnrollmentListItem) => {
    if (enrollment) {
      setEditingEnrollment(enrollment);
      setEditingLabels({
        student: `${enrollment.student_name} (${enrollment.student_email})`,
        offering: `${enrollment.course_name} - ${enrollment.section_name || "No Section"} (${enrollment.semester} ${enrollment.academic_year})`,
      });
      setFormData({
        student: enrollment.student_id,
        course_offering: enrollment.course_offering_id,
        status: enrollment.status
      });
      // Deliberately not resolving the student's section here: an existing
      // enrollment's student may since have been deleted (student detail
      // lookups exclude deleted students by design, returning 403) while the
      // enrollment referencing them still exists and remains editable. The
      // dependent Course Offering filter only needs to apply when the admin
      // actively changes the student (see handleStudentChange) - editing
      // with the student left as-is shows the unfiltered offering list,
      // same as before this filter existed.
      setSelectedStudentSectionId(undefined);
    } else {
      setEditingEnrollment(null);
      setEditingLabels({});
      setFormData({
        student: "", course_offering: "", status: "ACTIVE"
      });
      setSelectedStudentSectionId(undefined);
    }
    setIsModalOpen(true);
  };

  // Student changed (or newly selected): reset the Course Offering choice.
  // The Student reference row already carries section_id (no extra request,
  // no async lookup, no race with resetKey - both updates land in the same
  // render).
  const handleStudentChange = (id: number, student: StudentReference) => {
    setFormData(prev => ({ ...prev, student: id, course_offering: "" }));
    setEditingLabels(prev => ({ ...prev, offering: undefined }));
    setSelectedStudentSectionId(student.section_id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (formData.student === "" || formData.course_offering === "") {
      showToast("Please select a student and a course offering.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        student: Number(formData.student),
        course_offering: Number(formData.course_offering),
      };

      if (editingEnrollment) {
        await enrollmentService.update(editingEnrollment.id, payload);
        showToast("Enrollment updated successfully.", "success");
      } else {
        await enrollmentService.create(payload);
        showToast("Enrollment created successfully.", "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save enrollment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      await enrollmentService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast("Enrollment deleted successfully.", "success");
      loadData();
    } catch (error) {
      console.error(error);
      showToast("Failed to delete enrollment.", "error");
      setDeleteConfirm(null);
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Student Enrollments</h2>
          <p>Manage which students are in which offerings</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Enrollment
        </button>
      </div>

      <div className="content-card" style={{ marginBottom: "24px", padding: "16px" }}>
        <input
          type="text"
          placeholder="Search by student or course..."
          className="form-control"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
        />
      </div>

      <div className="content-card">
        <EntityTable<EnrollmentListItem>
          data={enrollments}
          loading={loading}
          resourceName="enrollments"
          columns={[
            {
              key: "student",
              label: "Student",
              render: (e) => `${e.student_name} (${e.student_email})`
            },
            {
              key: "course_offering",
              label: "Course Offering",
              render: (e) => `${e.course_name} - ${e.section_name || "No Section"} (${e.semester} ${e.academic_year})`
            },
            {
              key: "status",
              label: "Status",
              render: (e) => {
                let badgeClass = "badge-warning";
                if (e.status === "ACTIVE") badgeClass = "badge-success";
                if (e.status === "DROPPED") badgeClass = "badge-danger";
                return <span className={`badge ${badgeClass}`}>{e.status}</span>;
              }
            }
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

      <Modal isOpen={isModalOpen} title={editingEnrollment ? "Edit Enrollment" : "Add Enrollment"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Student</label>
            <PaginatedSelect
              fetchPage={(page, pageSize, signal) => getStudentReference(page, pageSize, signal)}
              getId={s => s.id}
              getLabel={s => `${s.name} (${s.student_email})`}
              value={formData.student}
              onChange={handleStudentChange}
              selectedLabel={editingLabels.student}
              placeholder="-- Select Student --"
              searchPlaceholder="Search loaded students..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Course Offering</label>
            <PaginatedSelect
              // Scoped to the selected student's own section - resetKey on
              // formData.student discards previously loaded pages and
              // re-fetches page 1 whenever the student changes, exactly like
              // the existing Department -> Section dependent dropdown.
              fetchPage={(page, pageSize, signal, search) =>
                getCourseOfferingList(page, pageSize, signal, search, selectedStudentSectionId ?? undefined)
              }
              resetKey={formData.student}
              getId={o => o.id}
              getLabel={o => `${o.course_name} - ${o.section_name || "No Section"} (${o.semester} ${o.academic_year})`}
              value={formData.course_offering}
              onChange={id => setFormData({...formData, course_offering: id})}
              selectedLabel={editingLabels.offering}
              placeholder={formData.student === "" ? "-- Select a Student First --" : "-- Select Offering --"}
              disabled={formData.student === ""}
              serverSearch
              searchPlaceholder="Search course or teacher..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select required className="form-control" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as EnrollmentStatus})}>
              <option value="ACTIVE">Active</option>
              <option value="DROPPED">Dropped</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Enrollment"
        message="Are you sure you want to delete this enrollment?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        confirmDisabled={isDeleting}
      />
    </>
  );
}
