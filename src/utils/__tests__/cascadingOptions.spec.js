import { describe, it, expect } from "vitest";
import { choiceOptions, hasOptions, optionsForParent, parentAnswer, staleDependentAnswers } from "../cascadingOptions";

// #24: Block offers only the chosen District's blocks. omniquery/services/cascading_options.py
// checks the same rules on the server.

const BLOCKS = { Baran: ["Baran", "Chhipabarod"], Churu: ["Ratangarh", "Sujangarh"] };
const district = { question_code: "district", options: ["Baran", "Churu"] };
const block = { question_code: "block", depends_on_field: "district", options: BLOCKS };
const village = {
  question_code: "village",
  depends_on_field: "block",
  options: { Ratangarh: ["Bhojasar"], Baran: ["Kishanganj"], Chhipabarod: ["Atru"] },
};

describe("cascading options (#24)", () => {
  it("offers a dependent question nothing until its parent is answered", () => {
    expect(optionsForParent(BLOCKS, "Churu")).toEqual(["Ratangarh", "Sujangarh"]);
    for (const blank of [undefined, null, ""]) expect(optionsForParent(BLOCKS, blank)).toEqual([]);
    expect(optionsForParent(BLOCKS, "Jaipur")).toEqual([]);
    expect(optionsForParent({ 1: ["a"] }, 1)).toEqual(["a"]);
    expect(optionsForParent(["x"], undefined)).toEqual(["x"]);
    expect(optionsForParent(undefined, "Baran")).toEqual([]);
  });

  it("counts grouped options as options", () => {
    expect(hasOptions(BLOCKS)).toBe(true);
    expect(hasOptions(["x"])).toBe(true);
    for (const none of [{}, [], null, undefined, "x"]) expect(hasOptions(none)).toBe(false);
  });

  it("reads the parent's answer", () => {
    expect(parentAnswer(block, { district: "Baran" })).toBe("Baran");
    expect(parentAnswer(district, { district: "Baran" })).toBeUndefined();
    expect(parentAnswer(block, undefined)).toBeUndefined();
  });

  it("keeps the authored value and shows the translated label", () => {
    const hindi = { ...block, options_translated: { Baran: ["बारां", "छीपाबड़ौद"], Churu: ["रतनगढ़", ""] } };
    expect(choiceOptions(hindi, "Baran")).toEqual([
      { value: "Baran", label: "बारां" },
      { value: "Chhipabarod", label: "छीपाबड़ौद" },
    ]);
    expect(choiceOptions(hindi, "Churu")[1]).toEqual({ value: "Sujangarh", label: "Sujangarh" });
    expect(choiceOptions({ options: [{ value: 1, label: "One" }, { label: "Two" }] })).toEqual([
      { value: 1, label: "One" },
      { value: "Two", label: "Two" },
    ]);
  });

  it("clears a block from another district, and what hangs under it", () => {
    // toStrictEqual: toEqual reads a missing key as undefined, so it could not tell village was left
    const questions = [district, block, village];
    expect(staleDependentAnswers(questions, { district: "Churu", block: "Baran", village: "Kishanganj" }, "district"))
      .toStrictEqual({ block: undefined, village: undefined });
    expect(staleDependentAnswers(questions, { district: "Baran", block: "Baran", village: "Kishanganj" }, "district"),
      "a block still offered is kept").toStrictEqual({});
    expect(staleDependentAnswers(questions, { district: "Churu", village: "Atru" }, "district")).toStrictEqual({});
    expect(staleDependentAnswers(questions, { block: "Ratangarh", village: "Atru" }, "block")).toStrictEqual({ village: undefined });
  });

  it("keeps only the choices of a multiple answer that are still offered", () => {
    const multi = { ...block, field_type: "Multiple Choice" };
    expect(staleDependentAnswers([district, multi], { district: "Churu", block: ["Ratangarh", "Baran"] }, "district"))
      .toStrictEqual({ block: ["Ratangarh"] });
    expect(staleDependentAnswers([district, multi], { district: "Churu", block: ["Baran"] }, "district"))
      .toStrictEqual({ block: undefined });
    expect(staleDependentAnswers([district, multi], { district: "Churu", block: ["Sujangarh"] }, "district")).toStrictEqual({});
  });
});
