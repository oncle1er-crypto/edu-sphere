export type MaintenanceDeadlineStatus = "none" | "overdue" | "due_soon" | "scheduled";

export function maintenanceDeadlineStatus(
  dueDate: string | null,
  reference = new Date()
): MaintenanceDeadlineStatus {
  if (!dueDate) return "none";
  const [year, month, day] = dueDate.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "overdue";
  if (days <= 30) return "due_soon";
  return "scheduled";
}
