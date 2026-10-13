describe("B", function () {
  before(function () {
    throw new Error("hook exploded");
  });
  it("never runs", function () {});
  it("never runs either", function () {});
});

describe("C", function () {
  it("passes", function () {});
});
