import type { TeacherApplicationStatus } from "@/lib/types";

export type TeacherApplicationInput = {
  bio: string;
  contactEmail: string;
  displayName: string;
  meetingUrl: string;
  message: string;
};

export type TeacherApplicationValidationResult =
  | {
      ok: true;
      value: TeacherApplicationInput;
    }
  | {
      ok: false;
      message: string;
    };

export const TEACHER_APPLICATION_STATUS_LABELS: Record<TeacherApplicationStatus, string> = {
  approved: "承認済み",
  pending: "審査中",
  rejected: "却下"
};

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateTeacherApplicationForm(formData: FormData): TeacherApplicationValidationResult {
  const displayName = clean(formData.get("displayName"));
  const bio = clean(formData.get("bio"));
  const meetingUrl = clean(formData.get("meetingUrl"));
  const contactEmail = clean(formData.get("contactEmail")).toLowerCase();
  const message = clean(formData.get("message"));

  if (!displayName || displayName.length > 80) {
    return { ok: false, message: "表示名は1〜80文字で入力してください。" };
  }

  if (bio.length > 1000) {
    return { ok: false, message: "プロフィールは1000文字以内で入力してください。" };
  }

  if (!isHttpUrl(meetingUrl)) {
    return { ok: false, message: "レッスンURLは http または https のURLを入力してください。" };
  }

  if (!contactEmail || !contactEmail.includes("@")) {
    return { ok: false, message: "連絡先メールアドレスを入力してください。" };
  }

  if (message.length > 1000) {
    return { ok: false, message: "申請メッセージは1000文字以内で入力してください。" };
  }

  return {
    ok: true,
    value: {
      bio,
      contactEmail,
      displayName,
      meetingUrl,
      message
    }
  };
}
