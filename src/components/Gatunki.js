import { useState, useEffect } from "react";
import tlo from "../zdjecia/tło.png";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function Gatunki() {
  const [fraza, setFraza] = useState("");
  const [zaznaczonyGatunek, setZaznaczonyGatunek] = useState(null);
  const [bazaGatunkow, setBazaGatunkow] = useState([]);
  const [indeksPodswietlenia, setIndeksPodswietlenia] = useState(-1);
  const [ladowanie, setLadowanie] = useState(true);

  useEffect(() => {
    const pobierzGatunki = async () => {
      setLadowanie(true);
      const kolekcjaGatunkowRef = collection(db, "gatunki");
      const dane = await getDocs(kolekcjaGatunkowRef);
      const listaGatunkow = dane.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setBazaGatunkow(listaGatunkow);
      setLadowanie(false);
    };
    pobierzGatunki();
  }, []);

  const getKolorBelki = (poziom) => {
    switch (poziom) {
      case "początkujący":
        return "bg-green-500";
      case "średniozaawansowany":
        return "bg-yellow-500";
      case "zaawansowany":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const propozycje = fraza
    ? bazaGatunkow.filter(
        (pajak) =>
          (pajak.nazwaNaukowa &&
            pajak.nazwaNaukowa.toLowerCase().includes(fraza.toLowerCase())) ||
          (pajak.nazwaPotoczna &&
            pajak.nazwaPotoczna.toLowerCase().includes(fraza.toLowerCase()))
      )
    : [];

  const zatwierdzWybor = (gatunek) => {
    setZaznaczonyGatunek(gatunek);
    setFraza("");
    setIndeksPodswietlenia(-1);
  };

  const obslugaKlawiszy = (e) => {
    if (!propozycje.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndeksPodswietlenia((prev) => (prev + 1) % propozycje.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndeksPodswietlenia(
        (prev) => (prev - 1 + propozycje.length) % propozycje.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (indeksPodswietlenia >= 0 && propozycje[indeksPodswietlenia]) {
        zatwierdzWybor(propozycje[indeksPodswietlenia]);
      }
    } else if (e.key === "Escape") {
      setFraza("");
      setIndeksPodswietlenia(-1);
    }
  };

  if (ladowanie) {
    return (
      <div className="p-10 text-center text-white">
        Ładowanie bazy gatunków...
      </div>
    );
  }

  return (
    <div
      style={{ backgroundImage: `url(${tlo})` }}
      className="min-h-screen bg-cover bg-center p-4 sm:p-6"
    >
      <main className="mx-auto flex max-w-5xl flex-col items-center">
        {/* Panel wyszukiwania */}
        <div className="w-full max-w-3xl rounded-xl border bg-white/95 p-6 shadow-lg sm:p-8">
          <h1 className="mb-6 text-center text-2xl font-bold sm:text-3xl">
            Szukaj gatunku ptasznika
          </h1>

          <div className="relative">
            <input
              type="text"
              placeholder="Wpisz nazwę gatunku..."
              value={fraza}
              onChange={(e) => {
                setFraza(e.target.value);
                setZaznaczonyGatunek(null);
              }}
              onKeyDown={obslugaKlawiszy}
              className="w-full rounded border p-4 shadow outline-none ring-0"
            />

            {propozycje.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded border bg-white shadow-lg no-scrollbar">
                {propozycje.map((pajak, idx) => (
                  <li
                    key={pajak.id}
                    onClick={() => zatwierdzWybor(pajak)}
                    className={`cursor-pointer p-2 ${
                      idx === indeksPodswietlenia
                        ? "bg-gray-200"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {pajak.nazwaPotoczna} ({pajak.nazwaNaukowa})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Kafelek z wynikiem */}
        {zaznaczonyGatunek && (
          <div className="mt-8 w-full max-w-4xl">
            <div className="tile relative flex flex-col overflow-hidden rounded-xl bg-gray-800 text-white shadow-xl">
              {/* Belka koloru wg poziomu */}
              <div
                className={`h-2 w-full ${getKolorBelki(
                  zaznaczonyGatunek.dlaKogo
                )}`}
              />

              <div className="relative flex flex-col items-start gap-4 p-4 sm:gap-6 sm:p-6 md:flex-row">
                {/* Obrazek */}
                <div className="w-full md:w-auto md:justify-start flex justify-center">
                  <img
                    src={zaznaczonyGatunek.zdjecie}
                    alt={zaznaczonyGatunek.nazwaPotoczna}
                    loading="lazy"
                    className="w-full max-w-[260px] h-auto rounded-lg bg-black/20 object-cover"
                  />
                </div>

                {/* Treść */}
                <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="relative md:col-span-2">
                    {zaznaczonyGatunek.CITES && (
                      <div className="absolute right-0 top-0 rounded bg-orange-500 px-2 py-1 text-xs font-bold text-white shadow-md">
                        CITES
                      </div>
                    )}

                    <h2 className="mt-2 text-2xl font-bold leading-snug">
                      {zaznaczonyGatunek.nazwaPotoczna}
                    </h2>
                    <p className="mb-2 text-base italic text-gray-300">
                      {zaznaczonyGatunek.nazwaNaukowa}
                    </p>

                    <div className="mb-3 flex items-center gap-2 text-lg">
                      <div
                        title={`Siła jadu: ${zaznaczonyGatunek.silaJadu}`}
                        className="flex items-center gap-1"
                      >
                        {zaznaczonyGatunek.silaJadu === "słaby" && (
                          <span className="text-red-400">💧</span>
                        )}
                        {zaznaczonyGatunek.silaJadu === "średni" && (
                          <>
                            <span className="text-red-400">💧</span>
                            <span className="text-red-400">💧</span>
                          </>
                        )}
                        {zaznaczonyGatunek.silaJadu === "silny" && (
                          <>
                            <span className="text-red-400">💧</span>
                            <span className="text-red-400">💧</span>
                            <span className="text-red-400">💧</span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-gray-200 sm:text-base">
                      {zaznaczonyGatunek.opis}
                    </p>
                  </div>

                  <div className="border-gray-700 pt-3 md:col-span-1 md:border-l md:border-t-0 md:pl-6 md:pt-0 border-t">
                    <h3 className="mb-2 text-lg font-semibold text-gray-300">
                      Szczegóły
                    </h3>
                    <ul className="space-y-1 text-sm text-gray-300 sm:text-base">
                      <li>
                        <strong>Typ:</strong> {zaznaczonyGatunek.typ}
                      </li>
                      <li>
                        <strong>Rodzina:</strong> {zaznaczonyGatunek.rodzina}
                      </li>
                      <li>
                        <strong>Siła jadu:</strong> {zaznaczonyGatunek.silaJadu}
                      </li>
                      <li>
                        <strong>Temperament:</strong>{" "}
                        {zaznaczonyGatunek.temperament}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
