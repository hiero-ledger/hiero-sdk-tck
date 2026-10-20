import assert from "node:assert/strict";

describe("A", function () {
  it("passes", function () {});
  it("fails", function () {
    assert.equal(1, 2);
  });
  it.skip("is pending", function () {});
});
