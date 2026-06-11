import { describe, expect, it } from "vitest";
import { MAX_AVATAR_BYTES, validateAccountProfileForm } from "@/lib/account-profile-validation";

function form(values: { avatar?: File; fullName?: string }) {
  const formData = new FormData();
  formData.set("fullName", values.fullName ?? "");

  if (values.avatar) {
    formData.set("avatar", values.avatar);
  }

  return formData;
}

describe("validateAccountProfileForm", () => {
  it("accepts a valid display name and avatar", () => {
    const result = validateAccountProfileForm(
      form({
        avatar: new File(["avatar"], "avatar.png", { type: "image/png" }),
        fullName: "山田太郎"
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({
          fullName: "山田太郎"
        })
      })
    );
  });

  it("rejects display names over 80 characters", () => {
    const result = validateAccountProfileForm(form({ fullName: "あ".repeat(81) }));

    expect(result).toEqual(expect.objectContaining({ ok: false }));
  });

  it("rejects unsupported avatar file types", () => {
    const result = validateAccountProfileForm(
      form({
        avatar: new File(["avatar"], "avatar.gif", { type: "image/gif" })
      })
    );

    expect(result).toEqual(expect.objectContaining({ ok: false }));
  });

  it("rejects avatar files over 2MB", () => {
    const result = validateAccountProfileForm(
      form({
        avatar: new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], "avatar.jpg", { type: "image/jpeg" })
      })
    );

    expect(result).toEqual(expect.objectContaining({ ok: false }));
  });
});
