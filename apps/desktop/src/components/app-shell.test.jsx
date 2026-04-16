import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { AppShell } from "@/components/app-shell";

describe("AppShell", () => {
  it("renders the app shell container", () => {
    render(<AppShell />);
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  });

  it("renders sidebar with navigation", () => {
    render(<AppShell />);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("nav-items")).toBeInTheDocument();
  });

  it("toggles sidebar collapse", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    const toggle = screen.getByTestId("toggle-sidebar");
    await user.click(toggle);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("switches active view on nav click", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByTestId("nav-import"));
    expect(await screen.findByTestId("import-view")).toBeInTheDocument();
  });

  it("shows backend status indicator", () => {
    render(<AppShell />);
    expect(screen.getByTestId("backend-status")).toBeInTheDocument();
  });
});