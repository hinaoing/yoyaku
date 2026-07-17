import { FormFieldLoading, PageTitleLoading, SubmitButtonLoading } from "@/components/loading-card";

export default function TeacherApplicationLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-softPulse space-y-6">
      <PageTitleLoading withDescription />
      <div className="grid gap-5 rounded-xl border border-ink/10 bg-white p-6 shadow-soft">
        <FormFieldLoading />
        <FormFieldLoading kind="textarea" />
        <FormFieldLoading />
        <FormFieldLoading />
        <FormFieldLoading kind="textarea-sm" />
        <SubmitButtonLoading />
      </div>
    </div>
  );
}
