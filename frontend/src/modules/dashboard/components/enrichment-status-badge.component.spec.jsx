import { render, screen } from "@testing-library/react";
import EnrichmentStatusBadge from "./enrichment-status-badge.component";

describe("# EnrichmentStatusBadge", () => {
  it.each([
    ["pending", "Pendente", "warning"],
    ["processing", "Processando", "blue-light"],
    ["completed", "Concluído", "success"],
    ["failed", "Falhou", "error"],
  ])("should show %s as %s", (status, label, color) => {
    render(<EnrichmentStatusBadge status={status} />);

    expect(screen.getByText(label).className).toContain(`bg-${color}-50`);
  });

  it("should show an unknown status with the first letter in uppercase", () => {
    render(<EnrichmentStatusBadge status="archived" />);

    expect(screen.getByText("Archived").className).toContain("bg-gray-100");
  });

  it("should show a dash without status", () => {
    render(<EnrichmentStatusBadge />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
