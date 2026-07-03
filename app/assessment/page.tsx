"use client";

// /assessment : 回答画面（F-01: 20問・5段階・進捗・戻る・sessionStorage）
import { useRouter } from "next/navigation";
import AssessmentForm from "@/components/AssessmentForm";
import { ASSESSMENT_STRINGS as S } from "@/lib/strings";

export default function AssessmentPage() {
  const router = useRouter();
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">{S.title}</h1>
      <AssessmentForm
        onComplete={() => {
          // 回答は AssessmentForm が sessionStorage に保存済み。
          // 送信（RPC submit_assessment）と結果表示は /result 側で行う
          router.push("/result");
        }}
      />
    </section>
  );
}
