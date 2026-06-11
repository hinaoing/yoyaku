"use client";

import { Camera, Loader2, Save } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { MAX_AVATAR_BYTES } from "@/lib/account-profile-validation";

type AccountProfileFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  avatarUrl: string | null;
  displayLabel: string;
  displayName: string;
  email: string | null | undefined;
};

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function validateAvatarFile(file: File | null) {
  if (!file) {
    return "";
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "プロフィール画像は jpg、png、webp の画像を選択してください。";
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return `プロフィール画像は2MB以内にしてください。選択した画像は約${formatFileSize(file.size)}です。`;
  }

  return "";
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex w-fit items-center gap-2 rounded-lg bg-matcha px-5 py-3 font-medium text-white transition-all duration-200 hover:bg-matcha/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-matcha/40 disabled:active:scale-100"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
      {pending ? "保存中..." : "保存する"}
    </button>
  );
}

export function AccountProfileForm({
  action,
  avatarUrl,
  displayLabel,
  displayName,
  email
}: AccountProfileFormProps) {
  const [fileError, setFileError] = useState("");

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setFileError(validateAvatarFile(file));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const avatarInput = event.currentTarget.elements.namedItem("avatar");
    const file = avatarInput instanceof HTMLInputElement ? avatarInput.files?.[0] ?? null : null;
    const error = validateAvatarFile(file);
    setFileError(error);

    if (error) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={action}
      className="grid gap-6 rounded-xl border border-ink/10 bg-white p-6 shadow-soft"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-center gap-4">
        {avatarUrl ? (
          <img alt="" className="size-20 rounded-full border border-ink/10 object-cover" src={avatarUrl} />
        ) : (
          <div className="grid size-20 place-items-center rounded-full bg-matcha/10 text-2xl font-semibold text-matcha">
            {initials(displayLabel)}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-sumi">ログインメール</p>
          <p className="mt-1 text-sumi/70">{email}</p>
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-sumi">表示名</span>
        <input
          className="rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
          defaultValue={displayName}
          maxLength={80}
          name="fullName"
          placeholder={email ?? "表示名"}
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-sumi">プロフィール画像</span>
        <span className="flex items-center gap-2 rounded-lg border border-dashed border-ink/20 bg-paper/60 px-4 py-4 text-sm text-sumi/70">
          <Camera size={18} />
          jpg、png、webp、2MB以内
        </span>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="rounded-lg border border-ink/15 bg-white px-4 py-3 text-sm outline-none ring-matcha/30 transition-all duration-200 file:mr-4 file:rounded-md file:border-0 file:bg-matcha/10 file:px-3 file:py-2 file:text-matcha focus:border-matcha/50 focus:ring-4"
          name="avatar"
          onChange={handleAvatarChange}
          type="file"
        />
        {fileError ? (
          <p className="rounded-lg border border-sakura/25 bg-sakura/[0.06] px-3 py-2 text-sm text-sakura">
            {fileError}
          </p>
        ) : null}
      </label>

      <SubmitButton disabled={Boolean(fileError)} />
    </form>
  );
}
