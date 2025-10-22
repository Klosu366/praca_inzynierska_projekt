// Plik: App.js
import { Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Galeria from "./components/Galeria";
import Gatunki from "./components/Gatunki";
import Mapa from "./components/Mapa";
import Nawigacja from "./components/Nawigacja";

function App() {
  return (
    <>
      <Nawigacja />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/galeria" element={<Galeria />} />
        <Route path="/gatunki" element={<Gatunki />} />
        <Route path="/mapa" element={<Mapa />} />
      </Routes>
    </>
  );
}

export default App;
