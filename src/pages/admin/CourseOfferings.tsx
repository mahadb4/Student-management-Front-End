import { useEffect, useRef, useState } from "react";
import { offeringService, courseService, getTeacherList, sectionService, getCourseOfferingList } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { CourseOfferingListItem, Course, TeacherListItem, Semester, Section } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function CourseOfferings() {
  const { showToast } = useToast();
  const [offerings, setOfferings] = useState<CourseOfferingListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownsLoaded = useRef(false);

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

  const loadDropdownData = () => {
    if (dropdownsLoaded.current) return;
    dropdownsLoaded.current = true;
    Promise.all([
      courseService.getAll(),
      getTeacherList(1, 500).then(res => res.results),
      sectionService.getAll()
    ]).then(([c, t, s]) => {
      setCourses(c);
      setTeachers(t);
      setSections(s);
    }).catch(err => console.error(err));
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
    loadDropdownData();
    if (offering) {
      setEditingOffering(offering);
      setFormData({
        course: offering.course?.id ?? "",
        teacher: offering.teacher?.id ?? "",
        semester: offering.semester,
        academic_year: offering.academic_year,
        section: offering.section?.id ?? "",
        is_active: offering.is_active
      });
    } else {
      setEditingOffering(null);
      setFormData({
        course: "", teacher: "", semester: "FALL",
        academic_year: new Date().getFullYear(), section: "", is_active: true
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
              render: (o) => o.course ? `${o.course.name} (${o.course.code})` : "-"
            },
            {
              key: "teacher",
              label: "Teacher",
              render: (o) => o.teacher ? o.teacher.name : "-"
            },
            { key: "semester", label: "Semester" },
            { key: "academic_year", label: "Year" },
            {
              key: "section",
              label: "Section",
              render: (o) => o.section?.name || "-"
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
            <label className="form-label">Course</label>
            <select required className="form-control" value={formData.course} onChange={(e) => setFormData({...formData, course: Number(e.target.value)})}>
              <option value="">-- Select Course --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Teacher</label>
            <select required className="form-control" value={formData.teacher} onChange={(e) => setFormData({...formData, teacher: Number(e.target.value)})}>
              <option value="">-- Select Teacher --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
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
            <select className="form-control" value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value === "" ? "" : Number(e.target.value)})}>
              <option value="">-- No Section --</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
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
