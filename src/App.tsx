// Temporary token sanity-check page. Replaced by AppShell + router in Task 14.
export default function App() {
  return (
    <div className="min-h-screen bg-page text-ink p-8">
      <h1 className="text-2xl font-bold">Newtion</h1>
      <p className="text-muted-ink">Tailwind tokens online.</p>
      <div className="mt-4 rounded-card bg-card shadow-elevation p-6">
        <span className="text-brand font-semibold">Brand teal</span> /{" "}
        <span className="text-cta font-semibold">CTA orange</span>
      </div>
    </div>
  );
}
