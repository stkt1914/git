export default function Home() {
  return (
    <main className="flex min-h-screen items-center px-6 py-16">
      <section className="mx-auto w-full max-w-3xl border-l-4 border-amber-600 pl-6 sm:pl-10">
        <p className="mb-3 text-sm font-semibold tracking-normal text-amber-700">
          ENGINEERING FOUNDATION
        </p>
        <h1 className="text-4xl font-semibold tracking-normal text-stone-950 sm:text-6xl">
          智览时政
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-700">
          前端工程已初始化。新闻聚合与分析界面将在后续阶段接入。
        </p>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-stone-300 pt-5 text-sm text-stone-600">
          <span>Next.js</span>
          <span>TypeScript</span>
          <span>Tailwind CSS</span>
        </div>
      </section>
    </main>
  );
}
