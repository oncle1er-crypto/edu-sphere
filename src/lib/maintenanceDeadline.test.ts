import { describe, expect, it } from "vitest";
import { maintenanceDeadlineStatus } from "./maintenanceDeadline";

describe("maintenanceDeadlineStatus", () => {
  const now = new Date(2026, 7, 27, 18, 0);

  it("distingue une échéance dépassée d'une échéance imminente", () => {
    expect(maintenanceDeadlineStatus("2026-08-26", now)).toBe("overdue");
    expect(maintenanceDeadlineStatus("2026-08-27", now)).toBe("due_soon");
    expect(maintenanceDeadlineStatus("2026-09-26", now)).toBe("due_soon");
    expect(maintenanceDeadlineStatus("2026-09-27", now)).toBe("scheduled");
  });

  it("gère l'absence d'échéance", () => {
    expect(maintenanceDeadlineStatus(null, now)).toBe("none");
  });
});
