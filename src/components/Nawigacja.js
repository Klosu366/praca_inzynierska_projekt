import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "../zdjecia/logo.png";

export default function Nawigacja() {
  const [open, setOpen] = useState(false);

  // Ustaw realną wysokość nagłówka -> --nav-h (dla sekcji/mapy pod spodem)
  useEffect(() => {
    const setVar = () => {
      const h = document.getElementById("site-header")?.offsetHeight || 64;
      document.documentElement.style.setProperty("--nav-h", `${h}px`);
    };
    setVar();
    window.addEventListener("resize", setVar);
    return () => window.removeEventListener("resize", setVar);
  }, []);

  const navItems = [
    { label: "Strona główna", to: "/" },
    { label: "Galeria", to: "/galeria" },
    { label: "Gatunki", to: "/gatunki" },
    { label: "Mapa", to: "/mapa" },
  ];

  return (
    <header
      id="site-header"
      className="sticky top-0 z-50 text-white px-6 py-4 flex items-center justify-between relative shadow"
      style={{
        backgroundImage: "linear-gradient(to right, #0f172a, #000000)",
        backgroundColor: "#000000cc",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Logo */}
      <div className="absolute left-6 flex items-center gap-2">
        <img
          src={logo}
          alt="Logo"
          className="w-10 h-10 object-contain animate-pulse"
        />
      </div>

      {/* Tytuł */}
      <div className="mx-auto text-center">
        <h1 className="text-xl md:text-2xl font-bold tracking-wider">
          Tarantula World
        </h1>
      </div>

      {/* Linki — ukryte na mobile, widoczne od md */}
      <nav className="absolute right-6 gap-4 text-sm md:text-base hidden md:flex">
        {navItems.map(({ label, to }) => (
          <Link
            key={to}
            to={to}
            className="relative group transition duration-300"
            onClick={() => setOpen(false)}
          >
            <span className="group-hover:text-green-400 transition-colors duration-300">
              {label}
            </span>
            <span className="absolute left-0 -bottom-1 w-0 h-0.5 bg-green-400 transition-all duration-300 group-hover:w-full"></span>
          </Link>
        ))}
      </nav>

      {/* Hamburger — tylko na mobile */}
      <button
        className="absolute right-6 md:hidden text-2xl"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Panel mobilny */}
      {open && (
        <div className="absolute top-full left-0 w-full md:hidden bg-[#0f172a] bg-opacity-95 border-t border-slate-700">
          <div className="flex flex-col items-center gap-3 py-4">
            {navItems.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="text-base text-white hover:text-green-400 transition-colors"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
