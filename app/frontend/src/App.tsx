import { useEffect, useState } from "react";
import { fetchTasks, createTask, toggleTaskDone, deleteTask, updateTaskTitle, type Task } from "./api"; // + updateTaskTitle

// Top-level component: fetch and render tasks from the backend.
export default function App() {
  // UI state: loading, error, and fetched tasks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState(""); // input state for new task

  // Inline edit state for a single task
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    // Load tasks on first render
    fetchTasks()
      .then(setTasks)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Handle form submit: create a task via POST /api/tasks
  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return; // ignore empty input
    try {
      const created = await createTask(title);
      // Prepend newly created task to the list (no full refetch needed)
      setTasks((prev) => [created, ...prev]);
      setNewTitle(""); // clear input
    } catch (err) {
      console.error(err);
      alert("Failed to create task");
    }
  }

  // Toggle 'done' flag via PATCH /api/tasks/:id
  async function handleToggle(task: Task) {
    try {
      const updated = await toggleTaskDone(task.id, !task.done);
      // Update item in place
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error(err);
      alert("Failed to update task status");
    }
  }

  // Delete a task via DELETE /api/tasks/:id
  async function handleDelete(task: Task) {
    // simple confirm to avoid accidental deletes
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      // Remove item from list
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      // If the deleted task was being edited, reset edit state
      if (editingId === task.id) {
        setEditingId(null);
        setEditingTitle("");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete task");
    }
  }

  // Start inline editing for a task
  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
  }

  // Cancel inline editing
  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }

  // Save new title via PATCH /api/tasks/:id
  async function saveEdit(task: Task) {
    const title = editingTitle.trim();
    if (!title) return; // ignore empty/whitespace-only
    try {
      const updated = await updateTaskTitle(task.id, title);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      setEditingId(null);
      setEditingTitle("");
    } catch (err) {
      console.error(err);
      alert("Failed to update title");
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (error) return <div style={{ padding: 16, color: "red" }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ marginBottom: 12 }}>TinyTasks — Tasks</h1>

      {/* Minimal input + button form to create a task */}
      <form onSubmit={handleAddTask} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="New task title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
          }}
        />
        <button
          type="submit"
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </form>

      {tasks.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {tasks.map((t) => {
            const isEditing = editingId === t.id;

            return (
              <li
                key={t.id}
                style={{
                  padding: "10px 12px",
                  marginBottom: 8,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  background: t.done ? "#f0fdf4" : "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(t);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      style={{
                        padding: "6px 8px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        minWidth: 220,
                      }}
                      placeholder="Edit title"
                    />
                  ) : (
                    <strong>{t.title}</strong>
                  )}
                  <span style={{ marginLeft: 8, color: "#6b7280", fontSize: 12 }}>
                    {t.done ? "done" : "open"}
                  </span>
                </span>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(t)}
                        style={{
                          background: "#2563eb",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                        title="Save title"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{
                          background: "#e5e7eb",
                          color: "#111827",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                        title="Cancel editing"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(t)}
                      style={{
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                      title="Edit title"
                    >
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() => handleToggle(t)}
                    style={{
                      background: t.done ? "#e5e7eb" : "#10b981",
                      color: t.done ? "#111827" : "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                    title={t.done ? "Undo" : "Mark as done"}
                  >
                    {t.done ? "Undo" : "Done"}
                  </button>

                  <button
                    onClick={() => handleDelete(t)}
                    style={{
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                    title="Delete task"
                  >
                    Delete
                  </button>

                  <span style={{ color: "#9ca3af", fontSize: 12 }}>
                    {new Date(t.created_at).toLocaleString()}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
