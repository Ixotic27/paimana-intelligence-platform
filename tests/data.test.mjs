import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { derive, monthIndex, fmt } from "../src/data.ts";
import { portfolioCsv } from "../src/export.ts";

const data = JSON.parse(
  readFileSync(
    new URL("../public/data/portfolio.json", import.meta.url),
    "utf8",
  ),
);
const july = derive(data, "2026-07");

test("real July priorities remain additive, bounded and reproducible", () => {
  assert.equal(july.length, 1775);
  assert.equal(july.filter((p) => p.band === "High").length, 353);
  for (const p of july) {
    assert.ok(Number.isFinite(p.score) && p.score >= 0 && p.score <= 100);
    assert.equal(
      p.score,
      p.factors.reduce((sum, f) => sum + f.points, 0),
    );
    assert.ok(p.history.every((h) => h.month <= p.month));
  }
});

test("invalid dates and costs suppress a displayed score", () => {
  for (const invalid of [
    "2026-00",
    "2026-13",
    "not-a-date",
    "2026-7",
    "2026-07-01",
  ])
    assert.equal(monthIndex(invalid), null);
  assert.equal(fmt(NaN), "—");
  for (const change of [
    { start: "not-a-date" },
    { original_end: "2026-13" },
    { progress: NaN },
    { progress: 101 },
    { original_cost: Infinity },
    { revised_cost: -1 },
  ]) {
    const row = { ...data.snapshots[0], ...change };
    assert.equal(
      derive({ ...data, snapshots: [row] }, row.month)[0].band,
      "Insufficient data",
    );
  }
});

test("a missing month is not interpreted as consecutive stagnant reporting", () => {
  const sample = data.snapshots.find(
    (p) => p.id === "705368" && p.month === "2026-07",
  );
  const earlier = { ...sample, month: "2026-05" };
  const p = derive({ ...data, snapshots: [earlier, sample] }, "2026-07")[0];
  assert.equal(p.delta, null);
  assert.ok(!p.factors.some((f) => f.label === "No reported monthly progress"));
});

test("a progress correction prompts verification and never claims reversed work", () => {
  const p = july.find((p) => p.id === "705368");
  assert.ok(p.delta < 0);
  assert.ok(
    p.factors.some(
      (f) =>
        f.label === "Reported progress decreased" &&
        f.action.includes("corrected"),
    ),
  );
});

test("CSV respects score abstention and escapes quotes and formula prefixes", () => {
  const sample = {
    ...july[0],
    eligible: false,
    score: 44,
    band: "Insufficient data",
    name: '  =HYPERLINK("x")',
  };
  const csv = portfolioCsv([sample]);
  assert.ok(csv.includes('"\'  =HYPERLINK(""x"")"'));
  assert.ok(csv.includes(',"","Insufficient data",'));
  assert.ok(!csv.includes('"44"'));
  assert.equal(portfolioCsv([]).split("\r\n").length, 1);
});
