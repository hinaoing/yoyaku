import { FormFieldLoading, PageTitleLoading, SubmitButtonLoading } from "@/components/loading-card";

export default function TeacherSettingsLoading() {
  return (
    <div className="animate-softPulse space-y-6">
      <PageTitleLoading />
      <div className="grid gap-5 rounded-xl border border-ink/10 bg-white p-6 shadow-soft">
        <FormFieldLoading />
        <FormFieldLoading kind="textarea" />
        <FormFieldLoading />
        <SubmitButtonLoading />
      </div>
    </div>
  );
}
