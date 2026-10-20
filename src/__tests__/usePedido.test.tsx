import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePedido } from "@/hooks/usePedido";
import { getUserPedido } from "@/utils/sessionManager";

const croqueta = { id: "p1", nombre: "Croquetas", precio_eur: 9, categoria: "ENTRANTES" };
const jamon = { id: "p2", nombre: "Jamón", precio_eur: 6, categoria: "SALAZONES", unidad: "100 g" };

describe("usePedido", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("añade una línea nueva y la persiste en el pedido de la sesión", () => {
    const { result } = renderHook(() => usePedido());
    expect(result.current.total).toBe(0);

    act(() => {
      result.current.anadir(croqueta);
    });

    expect(result.current.total).toBe(1);
    expect(result.current.cantidadDe(croqueta)).toBe(1);
    expect(getUserPedido()).toHaveLength(1);
  });

  it("sumar el mismo plato no duplica la línea, sube su cantidad", () => {
    const { result } = renderHook(() => usePedido());

    act(() => {
      result.current.anadir(croqueta);
      result.current.anadir(croqueta);
    });

    expect(result.current.total).toBe(1);
    expect(result.current.cantidadDe(croqueta)).toBe(2);
  });

  it("los platos por 100 g entran y suman de 100 en 100 (como en la portada)", () => {
    const { result } = renderHook(() => usePedido());

    act(() => {
      result.current.anadir(jamon);
      result.current.anadir(jamon);
    });

    expect(result.current.cantidadDe(jamon)).toBe(200);
  });

  it("se entera de lo que añade otro componente (evento pedidoUpdated)", () => {
    const a = renderHook(() => usePedido());
    const b = renderHook(() => usePedido());

    act(() => {
      a.result.current.anadir(croqueta);
    });

    expect(b.result.current.total).toBe(1);
  });
});
