import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { CommandPalette } from "./command-palette";

describe("CommandPalette", () => {
  it("does not render by default", () => {
    render(<CommandPalette />);
    expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
  });

  it("opens on Ctrl+K", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard("{Control>}k{/Control}");
    expect(screen.getByTestId("command-palette")).toBeInTheDocument();
  });
});