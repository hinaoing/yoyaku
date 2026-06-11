import { describe, expect, it } from "vitest";
import { validateTeacherApplicationForm } from "@/lib/teacher-application-validation";

function form(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("validateTeacherApplicationForm", () => {
  it("accepts a valid teacher application", () => {
    const result = validateTeacherApplicationForm(
      form({
        bio: "日本語会話の練習をサポートします。",
        contactEmail: "Teacher@Example.com",
        displayName: "山田先生",
        meetingUrl: "https://example.com/lesson",
        message: "よろしくお願いします。"
      })
    );

    expect(result).toEqual({
      ok: true,
      value: {
        bio: "日本語会話の練習をサポートします。",
        contactEmail: "teacher@example.com",
        displayName: "山田先生",
        meetingUrl: "https://example.com/lesson",
        message: "よろしくお願いします。"
      }
    });
  });

  it("rejects missing display name", () => {
    const result = validateTeacherApplicationForm(
      form({
        contactEmail: "teacher@example.com",
        displayName: "",
        meetingUrl: ""
      })
    );

    expect(result).toEqual(expect.objectContaining({ ok: false }));
  });

  it("rejects unsupported lesson URL protocols", () => {
    const result = validateTeacherApplicationForm(
      form({
        contactEmail: "teacher@example.com",
        displayName: "山田先生",
        meetingUrl: "ftp://example.com/lesson"
      })
    );

    expect(result).toEqual(expect.objectContaining({ ok: false }));
  });
});
