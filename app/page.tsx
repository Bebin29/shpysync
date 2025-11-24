export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">WAWISync</h1>
        <p className="text-lg mb-4">
          Synchronisation von Warenbeständen zwischen POS-System und Shopify
        </p>
        <div className="mt-8">
          <p className="text-sm text-gray-600">
            Projekt-Setup erfolgreich! 🎉
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Nächste Schritte: UI-Grundgerüst erstellen
          </p>
        </div>
      </div>
    </main>
  );
}

