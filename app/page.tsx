// 暫時性首頁：Phase 3 將替換為地圖主頁面（強制登入牆於 Phase 9 加入）
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold text-primary">
        🚴 FormoSA Ride 環島通
      </h1>
      <p className="info-primary text-center">
        台灣自行車環島完整資訊平台 — 建置中
        <br />
        Taiwan Bicycle Tour Guide — Under Construction
      </p>
    </main>
  );
}
