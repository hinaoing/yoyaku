export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AccountProfileInput = {
  avatarFile: File | null;
  fullName: string;
};

export type AccountProfileValidationResult =
  | {
      ok: true;
      value: AccountProfileInput;
    }
  | {
      ok: false;
      message: string;
    };

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function avatarFileExtension(file: File) {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export function validateAccountProfileForm(formData: FormData): AccountProfileValidationResult {
  const fullName = clean(formData.get("fullName"));
  const avatar = formData.get("avatar");
  const avatarFile = avatar instanceof File && avatar.size > 0 ? avatar : null;

  if (fullName.length > 80) {
    return { ok: false, message: "表示名は80文字以内で入力してください。" };
  }

  if (avatarFile) {
    if (!AVATAR_MIME_TYPES.includes(avatarFile.type as (typeof AVATAR_MIME_TYPES)[number])) {
      return { ok: false, message: "プロフィール画像は jpg、png、webp の画像を選択してください。" };
    }

    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { ok: false, message: "プロフィール画像は2MB以内にしてください。" };
    }
  }

  return {
    ok: true,
    value: {
      avatarFile,
      fullName
    }
  };
}
