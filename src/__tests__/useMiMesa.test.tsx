import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useMiMesa } from "@/hooks/useMiMesa";
import { getMesaConfig } from "@/utils/sessionManager";

describe("useMiMesa", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("arranca con 2 comensales y a partes iguales", () => {
    const { result } = renderHook(() => useMiMesa());
    expect(result.current.comensales).toBe(2);
    expect(result.current.modo).toBe("igual");
  });

  it("persiste los comensales en sessionStorage y los recupera al volver a montar", async () => {
    const { result, unmount } = renderHook(() => useMiMesa());
    act(() => result.current.setComensales(5));
    expect(result.current.comensales).toBe(5);
    await waitFor(() => expect(getMesaConfig()).toMatchObject({ comensales: 5 }));
    unmount();

    const otra = renderHook(() => useMiMesa());
    await waitFor(() => expect(otra.result.current.comensales).toBe(5));
  });

  it("acota el stepper a 1–30", () => {
    const { result } = renderHook(() => useMiMesa());
    act(() => result.current.setComensales(0));
    expect(result.current.comensales).toBe(1);
    act(() => result.current.setComensales(31));
    expect(result.current.comensales).toBe(30);
  });

  it("guarda modo, nombres y asignaciones, y las olvida al vaciar", async () => {
    const { result } = renderHook(() => useMiMesa());
    act(() => {
      result.current.setModo("cadaUno");
      result.current.setNombre(1, "Luis");
      result.current.asignar("id:p1", 1);
    });
    expect(result.current.modo).toBe("cadaUno");
    expect(result.current.nombres).toEqual(["", "Luis"]);
    expect(result.current.asignaciones).toEqual({ "id:p1": 1 });

    act(() => result.current.asignar("id:p1", null));
    expect(result.current.asignaciones).toEqual({});

    act(() => result.current.asignar("id:p2", 0));
    act(() => result.current.olvidarAsignaciones());
    expect(result.current.asignaciones).toEqual({});
    await waitFor(() => expect(getMesaConfig()).toMatchObject({ modo: "cadaUno", nombres: ["", "Luis"] }));
  });

  it("dos instancias se mantienen sincronizadas (evento miMesaUpdated)", async () => {
    const a = renderHook(() => useMiMesa());
    const b = renderHook(() => useMiMesa());
    act(() => a.result.current.setComensales(7));
    await waitFor(() => expect(b.result.current.comensales).toBe(7));
  });
});
