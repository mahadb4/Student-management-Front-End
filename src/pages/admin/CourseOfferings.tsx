import { useEffect, useState } from "react";
import { offeringService, getDepartmentReference, getCourseReference, getTeacherReference, getSectionReference, getCourseOfferingList } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { PaginatedSelect } from "../../components/common/PaginatedSelect";
import type { CourseOfferingListItem, Semester } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function CourseOfferings() {
  const { showToast } = useToast();
  const [offerings, setOfferings] = useState<CourseOfferingListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  // Labels for the currently-edited offering's Course/Teacher/Section, shown
  // until the paginated dropdown's own loaded page happens to include them.
  const [editingLabels, setEditingLabels] = useState<{ course?: string; teacher?: string; section?: string }>({});

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<CourseOfferingListItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CourseOfferingListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    course: "" as number | "", teacher: "" as number | "",
    semester: "FALL" as Semester, academic_year: new Date().getFullYear(),
    section: "" as number | "", is_active: true
  });

  // Top-level department picker: scopes Teacher/Course/Section to that
  // department (a course offering is naturally "run by this department, for
  // this department's own course, by one of this department's teachers, into
  // one of this department's sections"). Not part of formData/the save
  // payload - CourseOffering itself has no department field, this only
  // drives which Teacher/Course/Section options show.
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | "">("");

  // Program semester (1-8) picked right after Department: scopes the Course
  // list to that semester's curriculum (Course.semester_number) and the
  // Section list to Department+Semester+AcademicYear together. Distinct from
  // formData.semester, which is the Fall/Spring/Summer academic TERM stored
  // on the offering itself.
  const [selectedSemesterNumber, setSelectedSemesterNumber] = useState<number | "">("");

  const loadData = (signal?: AbortSignal) => {
    setLoading(true);
    getCourseOfferingList(currentPage, pageSize, signal, debouncedSearch).then(oRes => {
      setOfferings(oRes.results);
      setTotalCount(oRes.total_count);
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

  const handleOpenModal = (offering?: CourseOfferingListItem) => {
    if (offering) {
      setEditingOffering(offering);
      setEditingLabels({
        course: offering.course_name || undefined,
        teacher: offering.teacher_name || undefined,
        section: offering.section_name || undefined,
      });
      setFormData({
        course: offering.course_id ?? "",
        teacher: offering.teacher_id ?? "",
        semester: offering.semester,
        academic_year: offering.academic_year,
        section: offering.section_id ?? "",
        is_active: offering.is_active
      });
      // Not resolving the offering's department/semester here - the existing
      // Teacher/Course/Section stay shown via editingLabels as-is; the
      // dependent filters only need to apply once the admin actively changes
      // Department/Semester (see handleDepartmentChange/handleSemesterNumberChange),
      // same reasoning as the Enrollment form's student-section filter.
      setSelectedDepartmentId("");
      setSelectedSemesterNumber("");
    } else {
      setEditingOffering(null);
      setEditingLabels({});
      setFormData({
        course: "", teacher: "", semester: "FALL",
        academic_year: new Date().getFullYear(), section: "", is_active: true
      });
      setSelectedDepartmentId("");
      setSelectedSemesterNumber("");
    }
    setIsModalOpen(true);
  };

  const handleDepartmentChange = (id: number | "") => {
    setSelectedDepartmentId(id);
    setSelectedSemesterNumber("");
    setFormData(prev => ({ ...prev, course: "", teacher: "", section: "" }));
    setEditingLabels(prev => ({ ...prev, course: undefined, teacher: undefined, section: undefined }));
  };

  const handleSemesterNumberChange = (value: number | "") => {
    setSelectedSemesterNumber(value);
    setFormData(prev => ({ ...prev, course: "", section: "" }));
    setEditingLabels(prev => ({ ...prev, course: undefined, section: undefined }));
  };

  const handleCourseChange = (id: number) => {
    setFormData(prev => ({ ...prev, course: id }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (formData.course === "" || formData.teacher === "") {
      showToast("Please select a course and teacher.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        course: Number(formData.course),
        teacher: Number(formData.teacher),
        section: formData.section === "" ? null : Number(formData.section),
      };

      if (editingOffering) {
        await offeringService.update(editingOffering.id, payload);
        showToast("Course offering updated successfully.", "success");
      } else {
        await offeringService.create(payload);
        showToast("Course offering created successfully.", "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save course offering.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      await offeringService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast("Course offering deleted successfully.", "success");
      loadData();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to delete course offering.", "error");
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
          <h2>Course Offerings</h2>
          <p>Manage courses taught in specific semesters</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Offering
        </button>
      </div>

      <div className="content-card" style={{ marginBottom: "24px", padding: "16px" }}>
        <input
          type="text"
          placeholder="Search by course, teacher or section..."
          className="form-control"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
        />
      </div>

      <div className="content-card">
        <EntityTable<CourseOfferingListItem>
          data={offerings}
          loading={loading}
          resourceName="course_offerings"
          columns={[
            {
              key: "course",
              label: "Course",
              render: (o) => o.course_name ? `${o.course_name} (${o.course_code})` : "-"
            },
            {
              key: "teacher",
              label: "Teacher",
              render: (o) => o.teacher_name || "-"
            },
            { key: "semester", label: "Semester" },
            { key: "academic_year", label: "Year" },
            {
              key: "section",
              label: "Section",
              render: (o) => o.section_name || "-"
            },
            {
              key: "is_active",
              label: "Status",
              render: (o) => <span className={`badge ${o.is_active ? 'badge-success' : 'badge-warning'}`}>{o.is_active ? 'Active' : 'Inactive'}</span>
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

      <Modal isOpen={isModalOpen} title={editingOffering ? "Edit Offering" : "Add Offering"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Department</label>
            <PaginatedSelect
              fetchPage={(page, pageSize, signal) => getDepartmentReference(page, pageSize, signal)}
              getId={d => d.id}
              getLabel={d => d.name}
              value={selectedDepartmentId}
              onChange={handleDepartmentChange}
              onClear={() => handleDepartmentChange("")}
              clearLabel="-- Any Department --"
              placeholder="-- Select Department --"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Semester Number</label>
            <select
              className="form-control"
              value={selectedSemesterNumber}
              onChange={(e) => handleSemesterNumberChange(e.target.value === "" ? "" : parseInt(e.target.value))}
              disabled={!editingOffering && selectedDepartmentId === ""}
            >
              <option value="">{!editingOffering && selectedDepartmentId === "" ? "-- Select a Department First --" : "-- Select Semester --"}</option>
              {Array.from({ length: 8 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Semester {n}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Course</label>
            <PaginatedSelect
              // Scoped to Department + Semester Number (Course.semester_number) -
              // resetKey re-fetches page 1 whenever either changes, same
              // dependent-dropdown pattern used throughout the app.
              fetchPage={(page, pageSize, signal) => getCourseReference(page, pageSize, signal, selectedDepartmentId === "" ? undefined : selectedDepartmentId, selectedSemesterNumber === "" ? undefined : selectedSemesterNumber)}
              resetKey={`${selectedDepartmentId}-${selectedSemesterNumber}`}
              getId={c => c.id}
              getLabel={c => c.department_name ? `${c.name} (${c.code}) - ${c.department_name}` : `${c.name} (${c.code})`}
              value={formData.course}
              onChange={handleCourseChange}
              selectedLabel={editingLabels.course}
              placeholder={!editingOffering && selectedSemesterNumber === "" ? "-- Select a Semester First --" : "-- Select Course --"}
              disabled={!editingOffering && selectedSemesterNumber === ""}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Teacher</label>
            <PaginatedSelect
              fetchPage={(page, pageSize, signal) => getTeacherReference(page, pageSize, signal, selectedDepartmentId === "" ? undefined : selectedDepartmentId)}
              resetKey={selectedDepartmentId}
              getId={t => t.id}
              getLabel={t => t.name}
              value={formData.teacher}
              onChange={id => setFormData({...formData, teacher: id})}
              selectedLabel={editingLabels.teacher}
              placeholder={!editingOffering && selectedDepartmentId === "" ? "-- Select a Department First --" : "-- Select Teacher --"}
              disabled={!editingOffering && selectedDepartmentId === ""}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Semester</label>
              <select required className="form-control" value={formData.semester} onChange={(e) => setFormData({...formData, semester: e.target.value as Semester})}>
                <option value="FALL">Fall</option>
                <option value="SPRING">Spring</option>
                <option value="SUMMER">Summer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <input type="number" required className="form-control" value={formData.academic_year} onChange={(e) => setFormData({...formData, academic_year: parseInt(e.target.value) || new Date().getFullYear()})} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Section</label>
            <PaginatedSelect
              // Scoped to Department + Semester Number + Academic Year together
              // (never just Department alone - business rule: selecting a
              // semester must narrow Sections to that exact Department+
              // Semester+Year combination, e.g. "Computer Science, Semester 1,
              // 2026" only shows that cohort's own A/B/C/D sections). The
              // backend does not require course.department == section.department
              // (see enrollment_service._validate_student_section, which only
              // compares student.section_id to course_offering.section_id), so
              // a course whose owning department differs from the section's
              // can still be offered - this form just doesn't expose a way to
              // pick a Course from outside the selected Department.
              fetchPage={(page, pageSize, signal) => getSectionReference(selectedDepartmentId === "" ? undefined : selectedDepartmentId, page, pageSize, signal, selectedSemesterNumber === "" ? undefined : selectedSemesterNumber, formData.academic_year)}
              resetKey={`${selectedDepartmentId}-${selectedSemesterNumber}-${formData.academic_year}`}
              getId={s => s.id}
              getLabel={s => s.department_name ? `${s.name} - ${s.department_name}` : s.name}
              value={formData.section}
              onChange={id => setFormData({...formData, section: id})}
              onClear={() => setFormData({...formData, section: ""})}
              clearLabel="-- No Section --"
              selectedLabel={editingLabels.section}
              placeholder={!editingOffering && selectedSemesterNumber === "" ? "-- Select a Semester First --" : "-- No Section --"}
              disabled={!editingOffering && selectedSemesterNumber === ""}
            />
          </div>

          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
            <label style={{ margin: 0 }}>Active</label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Course Offering"
        message="Are you sure you want to delete this course offering?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        confirmDisabled={isDeleting}
      />
    </>
  );
}
