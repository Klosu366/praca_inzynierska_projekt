import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

import { db, storage } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

import tlo from "../zdjecia/tło.png";
import pajaczekIkona from "../zdjecia/pajaczek.png";

const Mapa = () => {
  const [region, setRegion] = useState("");
  const [map, setMap] = useState(null);
  const mapRef = useRef(null);
  const [ptaszniki, setPtaszniki] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [miniMapInstance, setMiniMapInstance] = useState(null);
  const miniMapRef = useRef(null);

  const clusterGroupRef = useRef(null);

  const [nowyPtasznik, setNowyPtasznik] = useState({
    name: "",
    region: "",
    imgFile: null,
    lat: null,
    lng: null,
    locationText: "",
  });

  const domyslneZdjecie =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Tarantula.jpg/220px-Tarantula.jpg";

  // Pobierz dane
  useEffect(() => {
    const pobierzDane = async () => {
      const querySnapshot = await getDocs(collection(db, "lokalizacje"));
      const listaPajakow = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPtaszniki(listaPajakow);
    };
    pobierzDane().catch((err) => console.error("Błąd pobierania danych", err));
  }, []);

  // Inicjalizacja mapy
  useEffect(() => {
    if (!map && mapRef.current) {
      const glownaMapa = L.map(mapRef.current).setView([0, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(glownaMapa);

      clusterGroupRef.current = L.markerClusterGroup();
      glownaMapa.addLayer(clusterGroupRef.current);

      setMap(glownaMapa);

      // po montażu przelicz płótno
      setTimeout(() => glownaMapa.invalidateSize(), 100);
    }
  }, [map]);

  // Respons: aktualizuj rozmiar mapy przy resize/orientationchange
  useEffect(() => {
    if (!map) return;
    const onResize = () => map.invalidateSize();
    const onOrientation = () => setTimeout(() => map.invalidateSize(), 200);

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientation);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, [map]);

  // Respons: obserwuj realne zmiany rozmiaru kontenera (mobilne paski/klawiatura)
  useEffect(() => {
    if (!map || !mapRef.current) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapRef.current);
    return () => ro.disconnect();
  }, [map]);

  // Markery + filtr regionu
  useEffect(() => {
    if (!clusterGroupRef.current) return;

    clusterGroupRef.current.clearLayers();

    const spiderIcon = L.icon({
      iconUrl: pajaczekIkona,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    const markeryDoDodania = [];

    ptaszniki.forEach((ptasznik) => {
      if (ptasznik.lat && ptasznik.lng) {
        if (!region || ptasznik.region === region) {
          const marker = L.marker([ptasznik.lat, ptasznik.lng], {
            icon: spiderIcon,
          }).bindPopup(
            `<b>${ptasznik.name}</b><br>Region: ${ptasznik.region}<br>
               <img src="${ptasznik.img || domyslneZdjecie}" alt="${
              ptasznik.name
            }" style="width:100px;" />`
          );
          markeryDoDodania.push(marker);
        }
      }
    });

    clusterGroupRef.current.addLayers(markeryDoDodania);

    // lekkie opóźnienie – stabilniejsze przeliczenie płótna
    if (map) setTimeout(() => map.invalidateSize(), 50);
  }, [ptaszniki, region, map]);

  // Mini-mapa (modal)
  useEffect(() => {
    if (isModalOpen && miniMapRef.current && !miniMapInstance) {
      const miniMapa = L.map(miniMapRef.current).setView([0, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
        miniMapa
      );
      miniMapa.on("click", (e) =>
        setNowyPtasznik((prev) => ({
          ...prev,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        }))
      );
      setTimeout(() => miniMapa.invalidateSize(), 100);
      setMiniMapInstance(miniMapa);
    }
    if (!isModalOpen && miniMapInstance) {
      miniMapInstance.remove();
      setMiniMapInstance(null);
    }
  }, [isModalOpen, miniMapInstance]);

  const handleInput = (e) => {
    setNowyPtasznik((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNowyPtasznik((prev) => ({ ...prev, imgFile: file }));
    }
  };

  const szukajLokalizacji = async () => {
    if (!nowyPtasznik.locationText.trim()) return;
    try {
      const res = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: { q: nowyPtasznik.locationText, format: "json" },
        }
      );
      if (res.data.length > 0) {
        const { lat, lon } = res.data[0];
        setNowyPtasznik((prev) => ({
          ...prev,
          lat: parseFloat(lat),
          lng: parseFloat(lon),
        }));
        if (miniMapInstance) {
          miniMapInstance.setView([lat, lon], 5);
          L.marker([lat, lon]).addTo(miniMapInstance);
          setTimeout(() => miniMapInstance.invalidateSize(), 50);
        }
      } else {
        alert("Nic nie znalazłem.");
      }
    } catch (err) {
      alert("Wystąpił błąd przy szukaniu.");
    }
  };

  const dodajPtasznika = async () => {
    const { name, region, lat, lng, imgFile } = nowyPtasznik;
    if (!name || !region || lat === null || lng === null) {
      alert("Wypełnij wszystkie pola i kliknij miejsce na mapie!");
      return;
    }
    let imageUrl = "";
    if (imgFile) {
      const imageRef = ref(storage, `pajaki/${uuidv4()}_${imgFile.name}`);
      try {
        const snapshot = await uploadBytes(imageRef, imgFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error("Błąd wysyłania obrazka:", error);
        alert("Nie udało się wysłać obrazka.");
        return;
      }
    }
    const ptasznikDoZapisu = { name, region, lat, lng, img: imageUrl };
    try {
      const docRef = await addDoc(
        collection(db, "lokalizacje"),
        ptasznikDoZapisu
      );
      setPtaszniki((starePtaszniki) => [
        ...starePtaszniki,
        { id: docRef.id, ...ptasznikDoZapisu },
      ]);
      setNowyPtasznik({
        name: "",
        region: "",
        imgFile: null,
        lat: null,
        lng: null,
        locationText: "",
      });
      setIsModalOpen(false);
    } catch (e) {
      console.error("Błąd przy zapisie do Firestore: ", e);
      alert("Nie udało się zapisać pająka, zobacz konsolę.");
    }
  };

  return (
    <div
      style={{
        backgroundImage: `url(${tlo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "gray",
      }}
      className="min-h-screen flex flex-col items-center justify-start pt-10"
    >
      <h1 className="text-white text-2xl font-bold mb-4">Tarantula World</h1>

      <div className="p-4 bg-white bg-opacity-90 rounded-lg shadow-md mb-4 text-center">
        <label>Filtruj po regionie:</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="p-2 mt-2 w-full max-w-xs rounded border border-gray-300"
        >
          <option value="">Wszystkie</option>
          <option value="Ameryka Południowa">Ameryka Południowa</option>
          <option value="Ameryka Północna">Ameryka Północna</option>
          <option value="Afryka">Afryka</option>
          <option value="Azja">Azja</option>
        </select>
      </div>

      <div className="flex justify-center mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 transition"
        >
          Dodaj nowy gatunek
        </button>
      </div>

      <div className="w-full max-w-4xl px-4 mb-10">
        <div
          ref={mapRef}
          id="map"
          className="rounded-lg shadow-md w-full h-[320px] sm:h-[420px] lg:h-[500px]"
          style={{ zIndex: 1 }}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Dodaj nowy gatunek
            </h2>

            <input
              type="text"
              name="name"
              placeholder="Nazwa gatunku"
              value={nowyPtasznik.name}
              onChange={handleInput}
              className="w-full p-2 mb-4 border rounded"
            />

            <select
              name="region"
              value={nowyPtasznik.region}
              onChange={handleInput}
              className="w-full p-2 mb-4 border rounded"
            >
              <option value="">Wybierz region</option>
              <option value="Ameryka Południowa">Ameryka Południowa</option>
              <option value="Ameryka Północna">Ameryka Północna</option>
              <option value="Afryka">Afryka</option>
              <option value="Azja">Azja</option>
            </select>

            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="w-full p-2 mb-4 border rounded"
            />

            <div className="mb-4">
              <input
                type="text"
                name="locationText"
                placeholder="np. Brazylia, São Paulo"
                value={nowyPtasznik.locationText}
                onChange={handleInput}
                className="w-full p-2 mb-2 border rounded"
              />
              <button
                onClick={szukajLokalizacji}
                className="mb-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Szukaj lokalizacji
              </button>
              <p className="text-sm text-gray-600 mb-2">
                Kliknij na mapę lub wpisz lokalizację:{" "}
                {nowyPtasznik.lat
                  ? `Lat: ${nowyPtasznik.lat.toFixed(
                      2
                    )}, Lng: ${nowyPtasznik.lng.toFixed(2)}`
                  : "Brak"}
              </p>
              <div
                ref={miniMapRef}
                className="w-full h-[200px] rounded border"
                style={{ zIndex: 1 }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={dodajPtasznika}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Dodaj
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mapa;
