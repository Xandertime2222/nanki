import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders with default variant", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("handles click events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByText("Click"));
    expect(onClick).toHaveBeenCalled();
  });

  it("applies variant styles", () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    expect(container.firstChild.className).toContain("destructive");
  });

  it("applies size styles", () => {
    const { container } = render(<Button size="sm">Small</Button>);
    expect(container.firstChild.className).toContain("h-8");
  });

  it("disables when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText("Disabled")).toBeDisabled();
  });
});