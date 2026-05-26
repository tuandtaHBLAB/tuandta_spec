import { notFound } from "next/navigation";
import styles from "@/components/features/exam/Exam.module.css";
import { AntiCheatMonitor } from "@/components/features/exam";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

async function getServerTime() {
  return {
    iso: new Date().toISOString(),
  };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const serverTime = await getServerTime();

  return (
    <div className={styles.page}>
      <AntiCheatMonitor locale={lang} serverTime={serverTime.iso} />
    </div>
  );
}
