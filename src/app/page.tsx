import type { Metadata } from "next";
import styles from "./page.module.css";
import { AntiCheatMonitor } from "@/components/anti-cheat-monitor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "S-JEP スピーキング模擬試験",
  description:
    "スピーキング模擬試験向けのカメラ認証と不正防止モニタリング画面です。",
};

async function getServerTime() {
  return {
    iso: new Date().toISOString(),
  };
}

export default async function Home() {
  const serverTime = await getServerTime();

  return (
    <div className={styles.page}>
      <AntiCheatMonitor serverTime={serverTime.iso} />
    </div>
  );
}
