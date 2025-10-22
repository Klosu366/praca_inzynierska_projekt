import tlo from "../zdjecia/tło.png";

export default function Home() {
  return (
    <div
      className="min-h-screen bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: `url(${tlo})`, backgroundColor: "gray" }}
    >
      {/* jeden pełnoekranowy wrapper wystarczy */}
      <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
        <div className="grid w-full max-w-4xl gap-8 sm:gap-10 lg:gap-12 md:grid-cols-2">
          <article className="rounded-xl border bg-white p-6 shadow-md">
            <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
              O Ptasznikach
            </h3>
            <p className="leading-relaxed text-gray-700">
              Ptaszniki to rodzina pająków, znana również jako tarantule. Są
              jednymi z największych pająków na świecie, osiągającymi nawet 25
              cm długości. Zamieszkują regiony tropikalne i subtropikalne całego
              świata.
            </p>
          </article>

          <article className="rounded-xl border bg-white p-6 shadow-md">
            <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
              Ciekawostki
            </h3>
            <p className="leading-relaxed text-gray-700">
              Choć wyglądają groźnie, ptaszniki rzadko są niebezpieczne dla
              ludzi. Ich jad zazwyczaj nie zagraża zdrowiu człowieka. Są chętnie
              hodowane ze względu na swoją urodę i różnorodność.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
