import test from "node:test";
import assert from "node:assert/strict";
import { parseExpense, wordsToNumbers } from "../lib/parse.js";
import { parseReceiptText } from "../lib/receipt.js";
import { assignItemsForTest } from "./helpers.js";

const M = [{ id: "a", name: "Aarav Sharma" }, { id: "p", name: "Priya Nair" }, { id: "z", name: "Zoe Martin" }, { id: "s", name: "Sam Lee" }, { id: "r", name: "Ravi Doobur" }];

test("number words", () => {
  assert.equal(wordsToNumbers("four thousand five hundred for the villa"), "4500 for the villa");
  assert.equal(wordsToNumbers("forty five dollars"), "45 dollars");
});

test("equal split with named people", () => {
  const r = parseExpense("I paid Rs 1200 for dinner, split equally with Priya and Zoe", M, "a");
  assert.equal(r.amount, 120000);
  assert.equal(r.paidBy, "a");
  assert.deepEqual(r.participants.sort(), ["a", "p", "z"]);
  assert.equal(r.method, "equal");
  assert.equal(r.description, "Dinner");
});

test("everyone except", () => {
  const r = parseExpense("Zoe paid 900 for the taxi, everyone except Sam", M, "a");
  assert.equal(r.paidBy, "z");
  assert.ok(!r.participants.includes("s"));
  assert.equal(r.participants.length, 4);
});

test("percentages from speech", () => {
  const r = parseExpense("Priya paid four thousand five hundred for the villa, Priya 50%, Zoe 25%, me 25%", M, "a");
  assert.equal(r.amount, 450000);
  assert.equal(r.method, "percent");
  assert.deepEqual(r.details.percents, { p: 50, z: 25, a: 25 });
});

test("shares and exact", () => {
  assert.equal(parseExpense("Groceries 800 paid by Ravi, shares Ravi 2 Sam 1 me 1", M, "a").method, "shares");
  const e = parseExpense("Hotel 3000, I paid, Sam 1000 Zoe 2000", M, "a");
  assert.equal(e.method, "exact");
  assert.deepEqual(e.details.amounts, { s: 100000, z: 200000 });
});

test("receipt text", () => {
  const r = parseReceiptText("CAFE LATITUDE\nChicken Burger 450.00\nMargherita Pizza 520.00\nNachos 300.00\nSubtotal 1270.00\nService 10% 127.00\nTOTAL 1397.00\nThank you");
  assert.equal(r.items.length, 3);
  assert.equal(r.total, 139700);
  assert.equal(r.extras, 12700);
  assert.ok(r.reconciles);
  assert.equal(r.merchant, "CAFE LATITUDE");
});

test("who had what", () => {
  const items = [{ name: "Chicken Burger", amount: 45000 }, { name: "Margherita Pizza", amount: 52000 }, { name: "Nachos", amount: 30000 }];
  const { items: out } = assignItemsForTest("Zoe had the burger, Sam and I shared the pizza, everyone had nachos", items, M, "a");
  assert.deepEqual(out[0].people, ["z"]);
  assert.deepEqual(out[1].people.sort(), ["a", "s"]);
  assert.equal(out[2].people.length, 5);
});
