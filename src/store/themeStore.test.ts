import { useThemeStore } from "./themeStore";

describe("themeStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ mode: "system" });
  });

  it("cycles system → light → dark → system", () => {
    const { cycle } = useThemeStore.getState();
    expect(useThemeStore.getState().mode).toBe("system");
    cycle();
    expect(useThemeStore.getState().mode).toBe("light");
    cycle();
    expect(useThemeStore.getState().mode).toBe("dark");
    cycle();
    expect(useThemeStore.getState().mode).toBe("system");
  });

  it("persists mode to localStorage", () => {
    useThemeStore.getState().setMode("dark");
    expect(localStorage.getItem("newtion-theme")).toContain("dark");
  });
});
