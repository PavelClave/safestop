import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const SPOTS = [
  {
    id: 1,
    name: "Паркинг 'Лесопарк Витоша'",
    lat: 42.6219,
    lng: 23.2714,
    type: "camper",
    safety: 4.8,
    legal: true,
    verified: true,
    reviews: 34,
    description: "Тихо място в подножието на Витоша. Охрана през нощта, тоалетни наблизо. Идеален за кемпери.",
    amenities: ["💧 Вода", "🚿 Душове", "🔌 Ток", "🗑️ Кофи"],
    zone: "природа",
    lastChecked: "2 дни назад",
    userPhotos: 12,
    comments: [
      { user: "Иван К.", text: "Чудесно и спокойно. Бяхме 3 нощи без проблем!", rating: 5, date: "март 2025" },
      { user: "Мария Т.", text: "Препоръчвам! Чисто и безопасно.", rating: 5, date: "февр. 2025" },
    ]
  },
  {
    id: 2,
    name: "Паркинг 'Централна гара'",
    lat: 42.7139,
    lng: 23.3224,
    type: "all",
    safety: 3.9,
    legal: true,
    verified: true,
    reviews: 89,
    description: "Охраняем паркинг до централна гара. 24/7 видеонаблюдение. Платен - 5лв/нощ.",
    amenities: ["📹 Камери", "💡 Осветление", "🛡️ Охрана"],
    zone: "градски",
    lastChecked: "вчера",
    userPhotos: 28,
    comments: [
      { user: "Петър В.", text: "Платен, но много сигурен. Препоръчвам за каравани.", rating: 4, date: "март 2025" },
      { user: "Снежана Р.", text: "Малко шумно от влаковете, но безопасно.", rating: 3, date: "яну. 2025" },
    ]
  },
  {
    id: 3,
    name: "Полянка 'Искрец'",
    lat: 42.9812,
    lng: 23.1245,
    type: "tent",
    safety: 4.6,
    legal: true,
    verified: false,
    reviews: 17,
    description: "Красива поляна край реката. Подходяща за палатки. Без инфраструктура, но тихо и уединено.",
    amenities: ["🏞️ Природа", "🌊 Река наблизо"],
    zone: "природа",
    lastChecked: "1 седм. назад",
    userPhotos: 8,
    comments: [
      { user: "Добрин М.", text: "Прекрасно място! Няма удобства, но пък природата е невероятна.", rating: 5, date: "авг. 2024" },
    ]
  },
  {
    id: 4,
    name: "Автопаркинг 'Орлов мост'",
    lat: 42.6882,
    lng: 23.3512,
    type: "camper",
    safety: 3.2,
    legal: true,
    verified: true,
    reviews: 52,
    description: "Удобно местоположение в центъра. Шумно, но добре осветено. Само за паркиране - без лагеруване.",
    amenities: ["💡 Осветление", "🚌 Транспорт"],
    zone: "градски",
    lastChecked: "3 дни назад",
    userPhotos: 5,
    comments: [
      { user: "Калоян Д.", text: "Удобно за прекарване на нощта в кемпера. Шумно до полунощ.", rating: 3, date: "февр. 2025" },
    ]
  },
  {
    id: 5,
    name: "Хижа 'Алеко' - паркинг",
    lat: 42.5691,
    lng: 23.2956,
    type: "all",
    safety: 4.9,
    legal: true,
    verified: true,
    reviews: 63,
    description: "Планински паркинг на 1800м. Невероятни гледки. Зиме - проверявайте дали пътят е проходим.",
    amenities: ["🏔️ Планини", "🍕 Ресторант", "❄️ Зимно"],
    zone: "планински",
    lastChecked: "вчера",
    userPhotos: 41,
    comments: [
      { user: "Елена Г.", text: "Любимото ни място! Спирали сме 10 пъти с каравана.", rating: 5, date: "март 2025" },
      { user: "Стоян Б.", text: "Внимавайте зиме - пътят може да е затворен!", rating: 4, date: "дек. 2024" },
    ]
  },
];

const typeLabels = { camper: "🚐 Кемпер", tent: "⛺ Палатка", all: "🏕️ Всички" };
const zoneLabels = { природа: "🌿 Природа", градски: "🏙️ Градски", планински: "⛰️ Планини" };

const createIcon = (color) => L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 10px ${color};"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const greenIcon = createIcon("#22c55e");
const yellowIcon = createIcon("#f59e0b");
const redIcon = createIcon("#ef4444");
const getIcon = (safety) => safety >= 4.5 ? greenIcon : safety >= 3.5 ? yellowIcon : redIcon;

const StarRating = ({ value, size = 14 }) => (
  <span style={{ fontSize: size, letterSpacing: 1 }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ color: i <= Math.round(value) ? "#F5C842" : "#3a3a4a" }}>★</span>
    ))}
  </span>
);

const SafetyBadge = ({ score }) => {
  const color = score >= 4.5 ? "#22c55e" : score >= 3.5 ? "#f59e0b" : "#ef4444";
  const label = score >= 4.5 ? "Много безопасно" : score >= 3.5 ? "Умерено" : "Внимание";
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
      display: "inline-flex", alignItems: "center", gap: 4
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
};

function FlyToSpot({ spot }) {
  const map = useMap();
  if (spot) map.flyTo([spot.lat, spot.lng], 13, { duration: 1.2 });
  return null;
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState("map");
  const [toast, setToast] = useState(null);
  const [nightMode, setNightMode] = useState(true);

  const filtered = SPOTS.filter(s => {
    const matchType = filter === "all" || s.type === filter || s.type === "all";
    const matchZone = zoneFilter === "all" || s.zone === zoneFilter;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return matchType && matchZone && matchSearch;
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const closeSelected = () => setSelected(null);

  const tileUrl = nightMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const bg = nightMode ? "#0a0b14" : "#f0f4f8";
  const headerBg = nightMode ? "#0d0f1e" : "#ffffff";
  const headerBorder = nightMode ? "rgba(100,140,255,0.15)" : "rgba(0,0,0,0.1)";
  const textColor = nightMode ? "#e8eaf6" : "#1a202c";
  const subTextColor = nightMode ? "#7c8ab8" : "#64748b";
  const panelBg = nightMode ? "#0d0f1e" : "#ffffff";
  const cardBg = nightMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const cardBorder = nightMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const filterBg = nightMode ? "rgba(13,15,30,0.95)" : "#f8fafc";

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: bg, minHeight: "100vh", color: textColor, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}`, padding: "0 20px", zIndex: 1000, position: "relative" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, padding: "12px 0" }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", borderRadius: 12, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🧭</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: textColor }}>SafeStop</div>
            <div style={{ fontSize: 10, color: subTextColor, letterSpacing: 1 }}>БЕЗОПАСЕН ПАРКИНГ НАВИГАТОР</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", background: nightMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "8px 14px", gap: 8, flex: "0 1 260px" }}>
            <span style={{ opacity: 0.5 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Търси място..." style={{ background: "none", border: "none", outline: "none", color: textColor, fontSize: 13, width: "100%" }} />
          </div>

          {/* Day/Night toggle */}
          <button onClick={() => setNightMode(!nightMode)} style={{
            background: nightMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            border: `1px solid ${cardBorder}`, borderRadius: 10,
            padding: "8px 14px", cursor: "pointer", fontSize: 18, color: textColor
          }}>
            {nightMode ? "☀️" : "🌙"}
          </button>

          <button onClick={() => setShowAdd(true)} style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", border: "none", borderRadius: 10, padding: "9px 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            + Добави място
          </button>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 4 }}>
          {[["map", "🗺️ Карта"], ["list", "📋 Списък"], ["stats", "📊 Статистики"]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              background: activeTab === key ? "rgba(59,130,246,0.15)" : "none",
              border: "none", borderBottom: activeTab === key ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === key ? "#60a5fa" : subTextColor,
              padding: "10px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}>{label}</button>
          ))}
        </div>
      </header>

      {/* Filters */}
      <div style={{ background: filterBg, borderBottom: `1px solid ${headerBorder}`, padding: "8px 20px", zIndex: 999, position: "relative" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: subTextColor }}>ТИП:</span>
          {[["all","Всички"], ["camper","🚐 Кемпер"], ["tent","⛺ Палатка"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              background: filter === v ? "rgba(59,130,246,0.2)" : cardBg,
              border: filter === v ? "1px solid rgba(59,130,246,0.5)" : `1px solid ${cardBorder}`,
              borderRadius: 8, padding: "4px 12px", color: filter === v ? "#60a5fa" : subTextColor,
              fontSize: 12, cursor: "pointer", fontWeight: 600,
            }}>{l}</button>
          ))}
          <span style={{ fontSize: 11, color: subTextColor, marginLeft: 8 }}>ЗОНА:</span>
          {[["all","Всички"], ["природа","🌿 Природа"], ["градски","🏙️ Град"], ["планински","⛰️ Планини"]].map(([v, l]) => (
            <button key={v} onClick={() => setZoneFilter(v)} style={{
              background: zoneFilter === v ? "rgba(6,182,212,0.2)" : cardBg,
              border: zoneFilter === v ? "1px solid rgba(6,182,212,0.5)" : `1px solid ${cardBorder}`,
              borderRadius: 8, padding: "4px 12px", color: zoneFilter === v ? "#22d3ee" : subTextColor,
              fontSize: 12, cursor: "pointer", fontWeight: 600,
            }}>{l}</button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 12, color: subTextColor }}>{filtered.length} места</span>
        </div>
      </div>

      {/* Main */}
      <main style={{ flex: 1, overflow: "hidden" }}>

        {/* MAP TAB */}
        {activeTab === "map" && (
          <div style={{ display: "flex", height: "calc(100vh - 130px)", position: "relative" }}>
            <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
              <MapContainer center={[42.7, 23.3]} zoom={9} style={{ height: "100%", width: "100%" }} zoomControl={true}>
                <TileLayer url={tileUrl} attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
                {selected && <FlyToSpot spot={selected} />}
                {filtered.map(spot => (
                  <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={getIcon(spot.safety)}
                    eventHandlers={{ click: () => setSelected(spot) }}>
                    <Popup>
                      <div style={{ minWidth: 160 }}>
                        <strong>{spot.name}</strong><br />
                        <SafetyBadge score={spot.safety} />
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Legend */}
              <div style={{ position: "absolute", bottom: 20, left: 20, zIndex: 1000, background: nightMode ? "rgba(10,11,20,0.9)" : "rgba(255,255,255,0.9)", border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
                {[["#22c55e", "Много безопасно (4.5+)"], ["#f59e0b", "Умерено (3.5-4.4)"], ["#ef4444", "Внимание (<3.5)"]].map(([c, l]) => (
                  <div key={c} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: subTextColor }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}` }} />
                    {l}
                  </div>
                ))}
              </div>
            </div>

            {/* Side panel */}
            {selected && (
              <div style={{
                position: "absolute", right: 0, top: 0, bottom: 0,
                width: 340, overflowY: "auto",
                background: panelBg,
                borderLeft: `1px solid ${headerBorder}`,
                zIndex: 1000,
                boxShadow: "-4px 0 20px rgba(0,0,0,0.2)",
              }}>
                <div style={{ padding: 20 }}>
                  {/* Close button - fixed at top */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ flex: 1, paddingRight: 10 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, color: textColor }}>{selected.name}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: subTextColor, background: cardBg, borderRadius: 6, padding: "2px 8px" }}>{typeLabels[selected.type]}</span>
                        <span style={{ fontSize: 11, color: subTextColor, background: cardBg, borderRadius: 6, padding: "2px 8px" }}>{zoneLabels[selected.zone]}</span>
                        {selected.verified && <span style={{ fontSize: 11, color: "#22d3ee", background: "rgba(6,182,212,0.1)", borderRadius: 6, padding: "2px 8px" }}>✓ Верифицирано</span>}
                      </div>
                    </div>
                    <button
                      onClick={closeSelected}
                      style={{
                        background: nightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 8, color: textColor, cursor: "pointer",
                        width: 32, height: 32, fontSize: 16,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>✕</button>
                  </div>

                  <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, color: subTextColor, marginBottom: 2 }}>ИНДЕКС НА БЕЗОПАСНОСТ</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: selected.safety >= 4.5 ? "#22c55e" : selected.safety >= 3.5 ? "#f59e0b" : "#ef4444" }}>
                        {selected.safety.toFixed(1)}<span style={{ fontSize: 14, opacity: 0.5 }}>/5</span>
                      </div>
                      <SafetyBadge score={selected.safety} />
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: subTextColor }}>{selected.reviews} отзива</div>
                      <StarRating value={selected.safety} size={16} />
                      <div style={{ fontSize: 10, color: subTextColor, marginTop: 4 }}>{selected.legal ? "✅ Легално" : "⚠️ Неясен статус"}</div>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: nightMode ? "#a0aec0" : "#4a5568", lineHeight: 1.6, marginBottom: 14 }}>{selected.description}</p>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: subTextColor, marginBottom: 8, fontWeight: 700 }}>УДОБСТВА</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selected.amenities.map(a => (
                        <span key={a} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 8, padding: "4px 10px", fontSize: 12, color: textColor }}>{a}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: subTextColor, marginBottom: 14 }}>
                    🕐 Последно проверено: {selected.lastChecked} · 📸 {selected.userPhotos} снимки
                  </div>

                  <div style={{ fontSize: 11, color: subTextColor, fontWeight: 700, marginBottom: 8 }}>ОТЗИВИ</div>
                  {selected.comments.map((c, i) => (
                    <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: textColor }}>{c.user}</span>
                        <span style={{ fontSize: 11, color: subTextColor }}>{c.date}</span>
                      </div>
                      <StarRating value={c.rating} size={12} />
                      <p style={{ fontSize: 12, color: subTextColor, marginTop: 4, lineHeight: 1.5 }}>{c.text}</p>
                    </div>
                  ))}

                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button onClick={() => showToast("🗺️ Навигацията е стартирана!")} style={{ flex: 1, background: "linear-gradient(135deg, #3b82f6, #06b6d4)", border: "none", borderRadius: 10, padding: 11, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>🧭 Навигирай</button>
                    <button onClick={() => showToast("💾 Запазено в любими!")} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "11px 14px", color: textColor, fontSize: 18, cursor: "pointer" }}>🤍</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LIST TAB */}
        {activeTab === "list" && (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20, overflowY: "auto", maxHeight: "calc(100vh - 130px)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {filtered.map(spot => (
                <div key={spot.id} onClick={() => { setSelected(spot); setActiveTab("map"); }}
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 18, cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.07)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = cardBg; e.currentTarget.style.borderColor = cardBorder; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, flex: 1, paddingRight: 8, color: textColor }}>{spot.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: spot.safety >= 4.5 ? "#22c55e" : spot.safety >= 3.5 ? "#f59e0b" : "#ef4444" }}>{spot.safety.toFixed(1)}</div>
                  </div>
                  <p style={{ fontSize: 12, color: subTextColor, marginBottom: 10, lineHeight: 1.5 }}>{spot.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 11, background: cardBg, borderRadius: 6, padding: "2px 8px", color: subTextColor }}>{typeLabels[spot.type]}</span>
                      <span style={{ fontSize: 11, background: cardBg, borderRadius: 6, padding: "2px 8px", color: subTextColor }}>{zoneLabels[spot.zone]}</span>
                    </div>
                    <span style={{ fontSize: 11, color: subTextColor }}>⭐ {spot.reviews} отзива</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === "stats" && (
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "30px 20px", overflowY: "auto", maxHeight: "calc(100vh - 130px)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {[
                ["🏕️", SPOTS.length, "Общо места"],
                ["✅", SPOTS.filter(s => s.legal).length, "Легални"],
                ["⭐", (SPOTS.reduce((a, b) => a + b.safety, 0) / SPOTS.length).toFixed(1), "Ср. безопасност"],
                ["📝", SPOTS.reduce((a, b) => a + b.reviews, 0), "Общо отзива"],
                ["✓", SPOTS.filter(s => s.verified).length, "Верифицирани"],
                ["📸", SPOTS.reduce((a, b) => a + b.userPhotos, 0), "Снимки"],
              ].map(([icon, val, label]) => (
                <div key={label} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#60a5fa", marginBottom: 4 }}>{val}</div>
                  <div style={{ fontSize: 12, color: subTextColor }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14, color: textColor }}>Места по безопасност</div>
              {[...SPOTS].sort((a, b) => b.safety - a.safety).map(spot => (
                <div key={spot.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13, color: textColor }}>
                    <span>{spot.name}</span>
                    <span style={{ color: spot.safety >= 4.5 ? "#22c55e" : spot.safety >= 3.5 ? "#f59e0b" : "#ef4444", fontWeight: 700 }}>{spot.safety.toFixed(1)}</span>
                  </div>
                  <div style={{ background: nightMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 99, height: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(spot.safety / 5) * 100}%`, background: spot.safety >= 4.5 ? "#22c55e" : spot.safety >= 3.5 ? "#f59e0b" : "#ef4444", borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add spot modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAdd(false)}>
          <div style={{ background: panelBg, border: `1px solid ${headerBorder}`, borderRadius: 20, padding: 28, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: textColor }}>+ Добави ново място</div>
              <button onClick={() => setShowAdd(false)} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textColor, cursor: "pointer", width: 32, height: 32, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {["Название на мястото", "Описание", "Координати (GPS)"].map(label => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: subTextColor, marginBottom: 6, fontWeight: 700 }}>{label.toUpperCase()}</div>
                <input placeholder={label} style={{ width: "100%", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "10px 14px", color: textColor, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowAdd(false); showToast("✅ Мястото е изпратено за проверка!"); }} style={{ flex: 1, background: "linear-gradient(135deg, #3b82f6, #06b6d4)", border: "none", borderRadius: 10, padding: 12, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Изпрати за проверка</button>
              <button onClick={() => setShowAdd(false)} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "12px 16px", color: textColor, cursor: "pointer" }}>Отказ</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: nightMode ? "rgba(13,15,30,0.95)" : "rgba(255,255,255,0.95)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", zIndex: 3000, color: textColor }}>{toast}</div>
      )}
    </div>
  );
}
