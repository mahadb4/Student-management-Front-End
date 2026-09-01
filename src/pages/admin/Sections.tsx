import { useEffect, useState } from "react";
import { sectionService, getSectionList, getDepartmentReference } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { PaginatedSelect } from "../../components/common/PaginatedSelect";
import type { SectionListItem } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function Sections() {
  const { showToast } = useToast();
  const [sections, setSections] = useState<SectionListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionListItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SectionListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    department: "" as number | "",
    semester_number: 1,
    academic_year: new Date().getFullYear(),
    is_active: true
  });

  const loadData = (signal?: AbortSignal) => {
    setLoading(true);
    getSectionList(currentPage, pageSize, signal, debouncedSearch).then(sRes => {
      setSections(sRes.results);
      setTotalCount(sRes.total_count);
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

  const handleOpenModal = (section?: SectionListItem) => {
    if (section) {
      setEditingSection(section);
      setFormData({
        name: section.name,
        department: section.department_id ?? "",
        semester_number: section.semester_number,
        academic_year: section.academic_year,
        is_active: section.is_active
      });
    } else {
      setEditingSection(null);
      setFormData({
        name: "", department: "", semester_number: 1,
        academic_year: new Date().getFullYear(), is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (formData.department === "") {
      showToast("Please select a department.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        department: Number(formData.department)
      };

      if (editingSection) {
        await sectionService.update(editingSection.id, payload);
        showToast("Section updated successfully.", "success");
      } else {
        await sectionService.create(payload);
        showToast("Section created successfully.", "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save section.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      await sectionService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast("Section deleted successfully.", "success");
      loadData();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to delete section.", "error");
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
          <h2>Sections</h2>
          <p>Manage academic sections</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Section
        </button>
      </div>

      <div className="content-card" style={{ marginBottom: "24px", padding: "16px" }}>
        <input
          type="text"
          placeholder="Search by name or department..."
          className="form-control"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
        />
      </div>

      <div className="content-card">
        <EntityTable<SectionListItem>
          data={sections}
          loading={loading}
          resourceName="sections"
          columns={[
            { key: "name", label: "Name" },
            {
              key: "department",
              label: "Department",
              render: (s) => s.department_name || "-"
            },
            { key: "semester_number", label: "Semester" },
            { key: "academic_year", label: "Year" },
            {
              key: "is_active",
              label: "Status",
              render: (s) => <span className={`badge ${s.is_active ? 'badge-success' : 'badge-warning'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
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

      <Modal isOpen={isModalOpen} title={editingSection ? "Edit Section" : "Add Section"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input required className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <PaginatedSelect
              fetchPage={(page, pageSize, signal) => getDepartmentReference(page, pageSize, signal)}
              getId={d => d.id}
              getLabel={d => d.name}
              value={formData.department}
              onChange={id => setFormData({...formData, department: id})}
              selectedLabel={editingSection?.department_name || undefined}
              placeholder="-- Select Department --"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Semester Number</label>
              <input required type="number" min={1} className="form-control" value={formData.semester_number} onChange={(e) => setFormData({...formData, semester_number: parseInt(e.target.value) || 1})} />
            </div>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <input required type="number" className="form-control" value={formData.academic_year} onChange={(e) => setFormData({...formData, academic_year: parseInt(e.target.value) || new Date().getFullYear()})} />
            </div>
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
        title="Delete Section"
        message={`Are you sure you want to delete ${deleteConfirm?.name}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        confirmDisabled={isDeleting}
      />
    </>
  );
}
