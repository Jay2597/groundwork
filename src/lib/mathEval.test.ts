import { describe, expect, test } from "vitest";
import { evalMath } from "./mathEval";

describe("evalMath", () => {
  test("plain numbers", () => {
    expect(evalMath("42")).toBe(42);
    expect(evalMath("3.5")).toBe(3.5);
  });
  test("addition and subtraction", () => {
    expect(evalMath("120 + 16")).toBe(136);
    expect(evalMath("100 - 40")).toBe(60);
    expect(evalMath("10 - 2 + 1")).toBe(9);
  });
  test("multiplication and division with precedence", () => {
    expect(evalMath("8 * 3")).toBe(24);
    expect(evalMath("100/2")).toBe(50);
    expect(evalMath("2 + 3 * 4")).toBe(14);
  });
  test("parentheses override precedence", () => {
    expect(evalMath("(2 + 3) * 4")).toBe(20);
  });
  test("unary minus", () => {
    expect(evalMath("-5")).toBe(-5);
    expect(evalMath("10 + -3")).toBe(7);
  });
  test("rejects invalid input", () => {
    expect(evalMath("")).toBeNull();
    expect(evalMath("abc")).toBeNull();
    expect(evalMath("2 +")).toBeNull();
    expect(evalMath("(2 + 3")).toBeNull();
  });
  test("division by zero is rejected", () => {
    expect(evalMath("5/0")).toBeNull();
  });
});
