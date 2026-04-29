import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { useGlobalKeybindings } from "./useGlobalKeybindings";

function pressMetaK(opts: { meta?: boolean; ctrl?: boolean } = {}) {
  const ev = new KeyboardEvent("keydown", {
    key: "k",
    metaKey: !!opts.meta,
    ctrlKey: !!opts.ctrl,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(ev);
  return ev;
}

describe("useGlobalKeybindings", () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ open: false });
  });

  it("⌘K 를 누르면 commandPaletteStore 가 토글된다", () => {
    renderHook(() => useGlobalKeybindings());
    expect(useCommandPaletteStore.getState().open).toBe(false);
    act(() => {
      pressMetaK({ meta: true });
    });
    expect(useCommandPaletteStore.getState().open).toBe(true);
    act(() => {
      pressMetaK({ meta: true });
    });
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });

  it("Ctrl+K 도 같은 동작을 한다 (Windows)", () => {
    renderHook(() => useGlobalKeybindings());
    act(() => {
      pressMetaK({ ctrl: true });
    });
    expect(useCommandPaletteStore.getState().open).toBe(true);
  });

  it("아무 modifier 없이 K 만 누르면 무시한다", () => {
    renderHook(() => useGlobalKeybindings());
    act(() => {
      pressMetaK();
    });
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });

  it("⌘K 이벤트는 preventDefault 된다 (브라우저 기본 단축키 차단)", () => {
    renderHook(() => useGlobalKeybindings());
    let prevented = false;
    act(() => {
      const ev = pressMetaK({ meta: true });
      prevented = ev.defaultPrevented;
    });
    expect(prevented).toBe(true);
  });

  it("언마운트 시 리스너를 해제한다", () => {
    const { unmount } = renderHook(() => useGlobalKeybindings());
    unmount();
    act(() => {
      pressMetaK({ meta: true });
    });
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });
});
