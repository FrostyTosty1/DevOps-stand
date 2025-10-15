import { useEffect, useState } from "react";
import {
  fetchTasks,
  createTask,
  toggleTaskDone,
  deleteTask,
  updateTaskTitle,
  type Task,
} from "./api";

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

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 font-sans">
      <h1 className="mb-3 text-2xl font-semibold text-red-500">TinyTasks — Tasks</h1>

      {/* Minimal input + button form to create a task */}
      <form onSubmit={handleAddTask} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="New task title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Add
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="text-gray-600">No tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const isEditing = editingId === t.id;

            return (
              <li
                key={t.id}
                className={`flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-3 transition ${
                  t.done ? "bg-emerald-50" : "bg-white"
                }`}
              >
                <span className="min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(t);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="min-w-[220px] rounded-md border border-gray-300 px-2 py-1 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Edit title"
                    />
                  ) : (
                    <strong className="truncate">{t.title}</strong>
                  )}
                  <span className="ml-2 text-xs text-gray-500">{t.done ? "done" : "open"}</span>
                </span>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(t)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        title="Save title"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-md bg-gray-200 px-3 py-1.5 text-gray-900 transition hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        title="Cancel editing"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(t)}
                      className="rounded-md bg-amber-500 px-3 py-1.5 text-white transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      title="Edit title"
                    >
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() => handleToggle(t)}
                    className={`rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 ${
                      t.done
                        ? "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-300"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300"
                    }`}
                    title={t.done ? "Undo" : "Mark as done"}
                  >
                    {t.done ? "Undo" : "Done"}
                  </button>

                  <button
                    onClick={() => handleDelete(t)}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                    title="Delete task"
                  >
                    Delete
                  </button>

                  <span className="hidden text-xs text-gray-400 sm:inline">
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
