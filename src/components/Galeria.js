import { useState, useEffect, useRef } from "react";
import tlo from "../zdjecia/tło.png";

/**
 * Prosty helper do IndexedDB bez zewnętrznych bibliotek.
 * Baza: GaleriaDB, store: "zdjecia", klucz: id (number)
 * Rekord: { id, opis, blob, createdAt }
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("GaleriaDB", 1);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("zdjecia")) {
        db.createObjectStore("zdjecia", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("zdjecia", mode);
    const store = tx.objectStore("zdjecia");
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

function getAllPhotos() {
  return withStore("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const items = [];
      const req = store.openCursor(null, "prev");
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          items.push(cursor.value);
          cursor.continue();
        } else {
          resolve(items);
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

function addPhoto(item) {
  return withStore("readwrite", (store) => store.add(item));
}

function deletePhoto(id) {
  return withStore("readwrite", (store) => store.delete(id));
}

// pomocnicze: konwersja dataURL -> Blob (do migracji)
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

export default function Galeria() {
  const [zdjecia, setZdjecia] = useState([]); // [{id, opis, objectUrl, createdAt}]
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nowyOpis, setNowyOpis] = useState("");
  const [plikZdjecia, setPlikZdjecia] = useState(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [wysylanie, setWysylanie] = useState(false);

  // do sprzątania URL-i obiektów
  const activeUrlsRef = useRef(new Set());

  // MIGRACJA: jeśli istnieje localStorage.galeria (Base64), przenieś do IndexedDB i wyczyść localStorage
  async function migrateFromLocalStorageIfAny() {
    try {
      const zapisane = JSON.parse(localStorage.getItem("galeria")) || [];
      if (!Array.isArray(zapisane) || zapisane.length === 0) return;

      // przenieś każdy element
      for (const entry of zapisane) {
        if (!entry?.imageUrl || !entry?.opis) continue;
        let blob;
        // jeżeli imageUrl to dataURL, zamień bez fetch
        if (entry.imageUrl.startsWith("data:")) {
          blob = dataURLtoBlob(entry.imageUrl);
        } else {
          // w razie gdyby były URL-e, spróbuj pobrać
          try {
            const res = await fetch(entry.imageUrl);
            blob = await res.blob();
          } catch {
            // pomiń jeśli nie udało się pobrać
            continue;
          }
        }
        const rekord = {
          id: entry.id || Date.now() + Math.random(),
          opis: entry.opis,
          blob,
          createdAt: entry.createdAt || Date.now(),
        };
        try {
          await addPhoto(rekord);
        } catch {
          // jeżeli duplikat klucza, nadaj inny id
          rekord.id = Date.now() + Math.random();
          await addPhoto(rekord);
        }
      }
      localStorage.removeItem("galeria"); // czyścimy stary magazyn
    } catch {
      // nic – brak lub uszkodzony JSON
    }
  }

  // Ładowanie z IndexedDB
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLadowanie(true);
      try {
        await migrateFromLocalStorageIfAny();
        const items = await getAllPhotos();
        if (!mounted) return;

        // utwórz objectURL dla każdego bloba
        const mapped = items.map((it) => {
          const url = URL.createObjectURL(it.blob);
          activeUrlsRef.current.add(url);
          return {
            id: it.id,
            opis: it.opis,
            objectUrl: url,
            createdAt: it.createdAt,
          };
        });
        setZdjecia(mapped);
      } catch (err) {
        console.error("Błąd ładowania IndexedDB:", err);
        setZdjecia([]);
      } finally {
        setLadowanie(false);
      }
    })();
    return () => {
      mounted = false;
      // sprzątanie URL-i przy odmontowaniu
      activeUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      activeUrlsRef.current.clear();
    };
  }, []);

  const wybierzZdjecie = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPlikZdjecia(e.target.files[0]);
    }
  };

  // Dodawanie do IndexedDB (BLOB)
  const dodajZdjecie = async () => {
    if (!plikZdjecia) return alert("Proszę wybrać plik!");
    if (!nowyOpis.trim()) return alert("Proszę wpisać opis!");

    setWysylanie(true);
    try {
      // można dodać opcjonalne skalowanie/kompresję, ale na start zapisujemy oryginalny BLOB
      const rekord = {
        id: Date.now(),
        opis: nowyOpis.trim(),
        blob: plikZdjecia, // File to też Blob
        createdAt: Date.now(),
      };

      await addPhoto(rekord);

      // odśwież widok lokalnie (bez pełnego przeładowania z DB)
      const url = URL.createObjectURL(plikZdjecia);
      activeUrlsRef.current.add(url);
      setZdjecia((prev) => [
        {
          id: rekord.id,
          opis: rekord.opis,
          objectUrl: url,
          createdAt: rekord.createdAt,
        },
        ...prev,
      ]);

      // reset
      setIsModalOpen(false);
      setNowyOpis("");
      setPlikZdjecia(null);
    } catch (error) {
      console.error("Błąd zapisu do IndexedDB:", error);
      if (error?.name === "QuotaExceededError") {
        alert(
          "Przekroczono limit pamięci przeglądarki. Rozważ zmniejszenie zdjęcia lub zewnętrzny storage (np. Supabase/Cloudinary)."
        );
      } else {
        alert("Wystąpił błąd podczas zapisu zdjęcia.");
      }
    } finally {
      setWysylanie(false);
    }
  };

  const usunZdjecie = async (id) => {
    if (!window.confirm("Czy na pewno chcesz usunąć to zdjęcie?")) return;
    try {
      await deletePhoto(id);
      setZdjecia((prev) => {
        const pozostale = prev.filter((z) => z.id !== id);
        // posprzątaj objectURL usuwanego
        const usuwany = prev.find((z) => z.id === id);
        if (usuwany?.objectUrl) {
          URL.revokeObjectURL(usuwany.objectUrl);
          activeUrlsRef.current.delete(usuwany.objectUrl);
        }
        return pozostale;
      });
    } catch (err) {
      console.error("Błąd usuwania:", err);
      alert("Nie udało się usunąć zdjęcia.");
    }
  };

  if (ladowanie) {
    return (
      <div className="p-10 text-center text-white">Ładowanie galerii...</div>
    );
  }

  return (
    <div
      style={{ backgroundImage: `url(${tlo})` }}
      className="min-h-screen bg-cover bg-center p-4 sm:p-6"
    >
      <main className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl rounded-xl bg-white/80 p-6 shadow-lg sm:p-8">
          <h1 className="mb-6 text-center text-2xl font-bold sm:text-3xl">
            Dodaj zdjęcie do galerii
          </h1>

          <div className="mb-6 flex justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-2xl font-bold text-white shadow transition hover:bg-blue-600 active:scale-95"
              aria-label="Dodaj zdjęcie"
            >
              +
            </button>
          </div>

          {/* Siatka zdjęć – 1/2/3 kolumny */}
          {zdjecia.length === 0 ? (
            <p className="text-center text-gray-600">
              Nie dodano jeszcze żadnych zdjęć. Kliknij „+”, aby dodać pierwsze.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {zdjecia.map((foto) => (
                <div
                  key={foto.id}
                  className="relative overflow-hidden rounded-lg bg-white shadow transition hover:shadow-md"
                >
                  {/* przycisk usuń */}
                  <button
                    onClick={() => usunZdjecie(foto.id)}
                    className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 active:scale-95"
                    aria-label="Usuń zdjęcie"
                    title="Usuń"
                  >
                    ✕
                  </button>

                  {/* kontener na obrazek o stałych proporcjach */}
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={foto.objectUrl}
                      alt={foto.opis}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <p className="px-3 py-3 text-center text-sm font-medium sm:text-base">
                    {foto.opis}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal dodawania */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-center text-xl font-semibold">
              Dodaj zdjęcie
            </h2>

            <input
              type="file"
              accept="image/*"
              onChange={wybierzZdjecie}
              className="mb-4 w-full rounded border bg-white p-2 shadow"
              disabled={wysylanie}
            />

            <input
              type="text"
              placeholder="Wpisz opis zdjęcia..."
              value={nowyOpis}
              onChange={(e) => setNowyOpis(e.target.value)}
              className="mb-4 w-full rounded border bg-white p-2 shadow"
              disabled={wysylanie}
            />

            {wysylanie && (
              <p className="mb-4 text-center text-sm text-gray-600">
                Przetwarzanie…
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
                disabled={wysylanie}
              >
                Anuluj
              </button>
              <button
                onClick={dodajZdjecie}
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                disabled={wysylanie}
              >
                {wysylanie ? "Dodawanie..." : "Dodaj"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
