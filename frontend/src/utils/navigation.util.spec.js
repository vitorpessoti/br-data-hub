import { redirectTo } from "./navigation.util";

describe("# navigation.util", () => {
  it("should load the given path with a full page navigation", () => {
    const location = { assign: jest.fn() };

    redirectTo("/signin", location);

    expect(location.assign).toHaveBeenCalledWith("/signin");
  });
});
