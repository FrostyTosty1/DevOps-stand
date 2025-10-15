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

  // Pending flags to avoid double-clicks and show progress
  const [adding, setAdding] = useState(false); // for Add form
  const [pendingToggle, setPendingToggle] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());
  const [pendingSave, setPendingSave] = useState<Set<string>>(new Set());

  // Small helper: run async action while adding/removing id to a Set state
  function withId<T extends string>(
    setState: React.Dispatch<React.SetStateAction<Set<T>>>,
    id: T,
    fn: () => Promise<void>
  ) {
    setState(prev => new Set(prev).add(id));
    return fn().finally(() => {
      setState(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

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
    if (!title || adding) return; // ignore empty input or while pending
    setAdding(true);
    try {
      const created = await createTask(title);
      // Prepend newly created task to the list (no full refetch needed)
      setTasks((prev) => [created, ...prev]);
      setNewTitle(""); // clear input
    } catch (err) {
      console.error(err);
      alert("Failed to create task");
    } finally {
      setAdding(false);
    }
  }

  // Toggle 'done' flag via PATCH /api/tasks/:id
  async function handleToggle(task: Task) {
    if (pendingToggle.has(task.id)) return; // already in-flight
    await withId(setPendingToggle, task.id, async () => {
      try {
        const updated = await toggleTaskDone(task.id, !task.done);
        // Update item in place
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      } catch (err) {
        console.error(err);
        alert("Failed to update task status");
      }
    });
  }

  // Delete a task via DELETE /api/tasks/:id
  async function handleDelete(task: Task) {
    if (pendingDelete.has(task.id)) return;
    // simple confirm to avoid accidental deletes
    if (!confirm(`Delete task "${task.title}"?`)) return;
    await withId(setPendingDelete, task.id, async () => {
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
    });
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
    if (!title || pendingSave.has(task.id)) return; // ignore empty/whitespace-only or while pending
    await withId(setPendingSave, task.id, async () => {
      try {
        const updated = await updateTaskTitle(task.id, title);
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        setEditingId(null);
        setEditingTitle("");
      } catch (err) {
        console.error(err);
        alert("Failed to update title");
      }
    });
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
          disabled={adding || !newTitle.trim()}
          className={`rounded-md px-4 py-2 text-white transition focus:outline-none focus:ring-2 ${
            adding
              ? "bg-blue-300 cursor-wait"
              : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-300"
          }`}
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="text-gray-600">No tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const isEditing = editingId === t.id;
            const isToggling = pendingToggle.has(t.id);
            const isDeleting = pendingDelete.has(t.id);
            const isSaving = pendingSave.has(t.id);

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
                        disabled={isSaving}
                        className={`rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 ${
                          isSaving
                            ? "bg-blue-300 text-white cursor-wait"
                            : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300"
                        }`}
                        title="Save title"
                      >
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className={`rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 ${
                          isSaving
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-300"
                        }`}
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
                    disabled={isToggling}
                    className={`rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 ${
                      isToggling
                        ? "bg-gray-200 text-gray-400 cursor-wait"
                        : t.done
                        ? "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-300"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300"
                    }`}
                    title={t.done ? "Undo" : "Mark as done"}
                  >
                    {isToggling ? "Saving…" : t.done ? "Undo" : "Done"}
                  </button>

                  <button
                    onClick={() => handleDelete(t)}
                    disabled={isDeleting}
                    className={`rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 ${
                      isDeleting
                        ? "bg-red-300 text-white cursor-wait"
                        : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-300"
                    }`}
                    title="Delete task"
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
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
