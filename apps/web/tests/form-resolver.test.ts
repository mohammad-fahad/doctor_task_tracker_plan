import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

describe("Zod form resolver", () => {
  it("returns field errors for invalid input under Zod 4", async () => {
    const resolver = zodResolver(schema);
    const options = { fields: {}, shouldUseNativeValidation: false } as Parameters<typeof resolver>[2];

    const result = await resolver({ email: "not-an-email", password: "" }, undefined, options);

    expect(result.errors.email?.message).toBe("Enter a valid email address");
    expect(result.errors.password?.message).toBe("Password is required");
    expect(result.values).toEqual({});
  });
});
