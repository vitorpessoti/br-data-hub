import { isValidEmail } from "./validate-email.util";

describe("# validate-email.util", () => {
  it.each([
    "user@example.com",
    "user.name+tag@example.co.uk",
    " user@example.com ",
  ])("should accept %s as valid", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    ["missing @", "userexample.com"],
    ["missing domain", "user@"],
    ["missing local part", "@example.com"],
    ["missing tld", "user@example"],
    ["contains spaces", "user @example.com"],
    ["empty string", ""],
    ["not a string (number)", 123],
    ["not a string (null)", null],
    ["not a string (undefined)", undefined],
  ])("should reject when %s", (_, email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
