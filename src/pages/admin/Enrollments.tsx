import { useEffect, useRef, useState } from "react";
import { enrollmentService, getStudentReference, offeringService, getCourseReference, getSectionReference, getEnrollmentList } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { EnrollmentListItem, StudentReference, CourseOffering, CourseReference, EnrollmentStatus, SectionReference } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function Enrollments() {
  const { showToast } = useToast();
  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [students, setStudents] = useState<StudentReference[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<CourseReference[]>([]);
  const [sections, setSections] = useState<SectionReference[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownDataLoaded = useRef(false);

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

  const loadDropdownData = () => {
    if (dropdownDataLoaded.current) return;
    dropdownDataLoaded.current = true;
    Promise.all([
      getStudentReference(),
      offeringService.getAll(),
      getCourseReference(),
      getSectionReference()
    ]).then(([s, o, c, sec]) => {
      setStudents(s);
      setOfferings(o);
      setCourses(c);
      setSections(sec);
    }).catch(err => {
      console.error(err);
    });
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
    loadDropdownData();
    if (enrollment) {
      setEditingEnrollment(enrollment);
      setFormData({
        student: enrollment.student.id,
        course_offering: enrollment.course_offering.id,
        status: enrollment.status
      });
    } else {
      setEditingEnrollment(null);
      setFormData({
        student: "", course_offering: "", status: "ACTIVE"
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
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

  const getOfferingDisplay = (offeringId: number) => {
    const o = offerings.find(x => x.id === offeringId);
    if (!o) return offeringId.toString();
    const c = courses.find(x => x.id === o.course);
    const courseName = c ? c.name : "Unknown Course";
    const sectionName = sections.find(s => s.id === o.section)?.name || "No Section";
    return `${courseName} - ${sectionName} (${o.semester} ${o.academic_year})`;
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
              render: (e) => `${e.student.name} (${e.student.student_email})`
            },
            {
              key: "course_offering",
              label: "Course Offering",
              render: (e) => `${e.course_offering.course.name} - ${e.course_offering.section?.name || "No Section"} (${e.course_offering.semester} ${e.course_offering.academic_year})`
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
            <select required className="form-control" value={formData.student} onChange={(e) => setFormData({...formData, student: Number(e.target.value)})}>
              <option value="">-- Select Student --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.student_email})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Course Offering</label>
            <select required className="form-control" value={formData.course_offering} onChange={(e) => setFormData({...formData, course_offering: Number(e.target.value)})}>
              <option value="">-- Select Offering --</option>
              {offerings.map(o => <option key={o.id} value={o.id}>{getOfferingDisplay(o.id)}</option>)}
            </select>
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
