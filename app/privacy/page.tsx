import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Yoyaku",
  description: "Yoyaku のプライバシーポリシー"
};

const sections = [
  {
    title: "1. 取得する情報",
    body: [
      "本サービスは、ユーザーのメールアドレス、氏名または表示名、講師プロフィール、予約日時、キャンセル履歴、レッスンURL、ログイン・操作に関する技術情報を取得することがあります。",
      "本サービスは、ログイン、予約確認、キャンセル通知、レッスン開始前の通知等のためにメールを送信することがあります。"
    ]
  },
  {
    title: "2. 利用目的",
    body: [
      "取得した情報は、アカウント認証、予約管理、講師と生徒への予約・キャンセル・リマインド通知、問い合わせ対応、不正利用防止、サービス改善、法令遵守のために利用します。",
      "個人情報を、あらかじめ公表または通知した利用目的の範囲を超えて利用する場合は、法令で認められる場合を除き、本人の同意を取得します。"
    ]
  },
  {
    title: "3. 第三者提供",
    body: [
      "本サービスは、法令に基づく場合、本人の同意がある場合、または予約の成立・履行に必要な範囲で講師または生徒に情報を表示する場合を除き、個人情報を第三者に提供しません。",
      "予約管理に必要な範囲で、講師には生徒の連絡先情報や予約情報が、生徒には講師名、プロフィール、レッスンURL等が表示されることがあります。"
    ]
  },
  {
    title: "4. 外部サービスの利用",
    body: [
      "本サービスは、認証、データ保存、メール送信、ボット対策、ホスティング等のため、Supabase、Resend、Cloudflare Turnstile、Vercel等の外部サービスを利用することがあります。",
      "これらの外部サービスには、サービス提供に必要な範囲で情報が送信または保存される場合があります。"
    ]
  },
  {
    title: "5. 安全管理",
    body: ["本サービスは、個人情報への不正アクセス、漏えい、滅失、毀損等を防止するため、アクセス制御、認証、通信の保護その他合理的な安全管理措置を講じます。"]
  },
  {
    title: "6. 保存期間",
    body: ["取得した情報は、利用目的の達成に必要な期間、または法令上必要な期間保存します。不要となった情報は、合理的な方法で削除または匿名化します。"]
  },
  {
    title: "7. 開示・訂正・利用停止等",
    body: [
      "ユーザーは、法令に基づき、自己の保有個人データについて、開示、訂正、追加、削除、利用停止、消去、第三者提供の停止等を求めることができます。",
      "これらの請求を希望する場合は、本サービス上で案内する問い合わせ先または運営者が別途指定する方法によりご連絡ください。本人確認のうえ、法令に従って対応します。"
    ]
  },
  {
    title: "8. Cookie等",
    body: ["本サービスは、ログイン状態の維持、セキュリティ、不正利用防止、利便性向上のため、Cookieまたは類似技術を利用することがあります。"]
  },
  {
    title: "9. 未成年の利用",
    body: ["未成年者が本サービスを利用する場合、必要に応じて親権者等の法定代理人の同意を得るものとします。"]
  },
  {
    title: "10. 改定",
    body: ["本ポリシーは、法令の変更、サービス内容の変更その他必要に応じて改定されることがあります。重要な変更がある場合は、本サービス上で告知します。"]
  },
  {
    title: "11. 問い合わせ",
    body: ["個人情報の取扱いに関する問い合わせは、本サービス上で案内する連絡手段、または運営者が別途指定する方法により受け付けます。"]
  }
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 rounded-xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
      <header className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-matcha">Yoyaku</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">プライバシーポリシー</h1>
        <p className="text-sm text-sumi/60">制定日: 2026年6月10日</p>
      </header>
      <div className="space-y-7 text-sm leading-7 text-sumi/80">
        {sections.map((section) => (
          <section className="space-y-2" key={section.title}>
            <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
