import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlgwxynokepgrbdfugfo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FI1Xjft72huXfup6LBmY6g_0XMFsKAs';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const typeLabels = {
  camper: '🚐 Кемпер',
  tent: '⛺ Палатка',
  all: '🏕️ Всички',
};
const zoneLabels = {
  природа: '🌿 Природа',
  градски: '🏙️ Градски',
  планински: '⛰️ Планини',
};

const createIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 12px ${color};"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const greenIcon = createIcon('#22c55e');
const yellowIcon = createIcon('#f59e0b');
const redIcon = createIcon('#ef4444');
const getIcon = (safety) =>
  safety >= 4.5 ? greenIcon : safety >= 3.5 ? yellowIcon : redIcon;

const StarRating = ({ value, size = 14, interactive = false, onChange }) => (
  <span
    style={{
      fontSize: size,
      letterSpacing: 1,
      cursor: interactive ? 'pointer' : 'default',
    }}
  >
    {[1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        onClick={() => interactive && onChange && onChange(i)}
        style={{ color: i <= Math.round(value) ? '#F5C842' : '#3a3a4a' }}
      >
        ★
      </span>
    ))}
  </span>
);

const SafetyBadge = ({ score }) => {
  const color = score >= 4.5 ? '#22c55e' : score >= 3.5 ? '#f59e0b' : '#ef4444';
  const label =
    score >= 4.5 ? 'Много безопасно' : score >= 3.5 ? 'Умерено' : 'Внимание';
  return (
    <span
      style={{
        background: color + '22',
        color,
        border: `1px solid ${color}55`,
        borderRadius: 20,
        padding: '3px 10px',
        fontSize: 12,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
};

const SafeStopLogo = ({ size = 42 }) => (
  <svg
    viewBox="0 0 42 42"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: size, height: size }}
  >
    <defs>
      <linearGradient
        id="shieldGrad"
        x1="0"
        y1="0"
        x2="42"
        y2="42"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </defs>
    <path
      d="M21 3L5 10V22C5 31 12 38 21 40C30 38 37 31 37 22V10L21 3Z"
      fill="url(#shieldGrad)"
    />
    <path
      d="M21 3L5 10V22C5 31 12 38 21 40C30 38 37 31 37 22V10L21 3Z"
      fill="none"
      stroke="rgba(255,255,255,0.25)"
      strokeWidth="0.8"
    />
    <circle cx="21" cy="18" r="5" fill="white" opacity="0.95" />
    <ellipse cx="21" cy="29" rx="3.5" ry="5" fill="white" opacity="0.6" />
    <path
      d="M18 18L20 20L24 16"
      stroke="#f97316"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function FlyToSpot({ spot }) {
  const map = useMap();
  if (spot) map.flyTo([spot.lat, spot.lng], 13, { duration: 1.2 });
  return null;
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

export default function App() {
  const isMobile = useIsMobile();
  const [spots, setSpots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [toast, setToast] = useState(null);
  const [nightMode, setNightMode] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [newSpot, setNewSpot] = useState({
    name: '',
    description: '',
    lat: '',
    lng: '',
    type: 'all',
    zone: 'природа',
    amenities: '',
  });
  const [newReview, setNewReview] = useState({ text: '', rating: 5 });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadSpots();
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setUser(session?.user || null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) setShowAuth(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (selected) {
      loadReviews(selected.id);
      if (isMobile) setDrawerOpen(true);
    } else {
      setDrawerOpen(false);
    }
  }, [selected]);

  const loadSpots = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false });
    setSpots(data || []);
    setLoading(false);
  };

  const loadReviews = async (spotId) => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('spot_id', spotId)
      .order('created_at', { ascending: false });
    setReviews(data || []);
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    showToast('👋 Излязохте успешно!');
  };

  const submitSpot = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!newSpot.name || !newSpot.lat || !newSpot.lng) {
      showToast('⚠️ Попълни всички задължителни полета!');
      return;
    }
    const { error } = await supabase.from('spots').insert([
      {
        name: newSpot.name,
        description: newSpot.description,
        lat: parseFloat(newSpot.lat),
        lng: parseFloat(newSpot.lng),
        type: newSpot.type,
        zone: newSpot.zone,
        safety: 0,
        legal: true,
        verified: false,
        amenities: newSpot.amenities
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        user_name: user.user_metadata?.full_name || user.email,
      },
    ]);
    if (error) {
      showToast('❌ Грешка при добавяне!');
      return;
    }
    showToast('✅ Мястото е добавено!');
    setShowAdd(false);
    setNewSpot({
      name: '',
      description: '',
      lat: '',
      lng: '',
      type: 'all',
      zone: 'природа',
      amenities: '',
    });
    loadSpots();
  };

  const submitReview = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!newReview.text) {
      showToast('⚠️ Напиши отзив!');
      return;
    }
    const { error } = await supabase.from('reviews').insert([
      {
        spot_id: selected.id,
        user_name: user.user_metadata?.full_name || user.email,
        text: newReview.text,
        rating: newReview.rating,
      },
    ]);
    if (error) {
      showToast('❌ Грешка!');
      return;
    }
    showToast('✅ Отзивът е добавен!');
    setNewReview({ text: '', rating: 5 });
    setShowReviewForm(false);
    loadReviews(selected.id);
  };

  const filtered = spots.filter((s) => {
    const matchType = filter === 'all' || s.type === filter || s.type === 'all';
    const matchZone = zoneFilter === 'all' || s.zone === zoneFilter;
    const matchSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchZone && matchSearch;
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const tileUrl = nightMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const bg = nightMode ? '#0a0b14' : '#f0f4f8';
  const headerBg = nightMode ? '#0d0f1e' : '#ffffff';
  const headerBorder = nightMode ? 'rgba(100,140,255,0.15)' : 'rgba(0,0,0,0.1)';
  const textColor = nightMode ? '#e8eaf6' : '#1a202c';
  const subTextColor = nightMode ? '#7c8ab8' : '#64748b';
  const panelBg = nightMode ? '#0d0f1e' : '#ffffff';
  const cardBg = nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const cardBorder = nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const inputStyle = {
    width: '100%',
    background: cardBg,
    border: `1px solid ${cardBorder}`,
    borderRadius: 12,
    padding: '12px 16px',
    color: textColor,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  };

  // ===== MOBILE LAYOUT =====
  if (isMobile) {
    return (
      <div
        style={{
          fontFamily: "'Segoe UI', sans-serif",
          background: bg,
          height: '100dvh',
          color: textColor,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Mobile Header */}
        <div
          style={{
            background: headerBg,
            borderBottom: `1px solid ${headerBorder}`,
            padding: '10px 16px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <SafeStopLogo size={36} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: textColor,
                lineHeight: 1.1,
              }}
            >
              SafeStop
            </div>
            <div
              style={{ fontSize: 9, color: subTextColor, letterSpacing: 0.5 }}
            >
              БЕЗОПАСЕН ПАРКИНГ
            </div>
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              padding: 6,
            }}
          >
            🔍
          </button>
          <button
            onClick={() => setNightMode(!nightMode)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              padding: 6,
            }}
          >
            {nightMode ? '☀️' : '🌙'}
          </button>
          {user ? (
            <img
              src={user.user_metadata?.avatar_url}
              alt=""
              onClick={signOut}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '2px solid #f97316',
                cursor: 'pointer',
              }}
            />
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              style={{
                background: 'linear-gradient(135deg, #f97316, #22c55e)',
                border: 'none',
                borderRadius: 20,
                padding: '6px 14px',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Влез
            </button>
          )}
        </div>

        {/* Search bar */}
        {showSearch && (
          <div
            style={{
              background: headerBg,
              padding: '8px 16px',
              borderBottom: `1px solid ${headerBorder}`,
              zIndex: 999,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Търси място..."
              autoFocus
              style={{ ...inputStyle, padding: '10px 14px', fontSize: 15 }}
            />
          </div>
        )}

        {/* Filters - horizontal scroll */}
        <div
          style={{
            background: nightMode ? 'rgba(13,15,30,0.95)' : '#f8fafc',
            borderBottom: `1px solid ${headerBorder}`,
            padding: '8px 12px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            zIndex: 998,
            flexShrink: 0,
          }}
        >
          {[
            ['all', 'Всички'],
            ['camper', '🚐 Кемпер'],
            ['tent', '⛺ Палатка'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                display: 'inline-block',
                marginRight: 6,
                background: filter === v ? 'rgba(249,115,22,0.2)' : cardBg,
                border:
                  filter === v
                    ? '1px solid #f97316'
                    : `1px solid ${cardBorder}`,
                borderRadius: 20,
                padding: '6px 14px',
                color: filter === v ? '#f97316' : subTextColor,
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {l}
            </button>
          ))}
          {[
            ['all', 'Всички'],
            ['природа', '🌿'],
            ['градски', '🏙️'],
            ['планински', '⛰️'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setZoneFilter(v)}
              style={{
                display: 'inline-block',
                marginRight: 6,
                background: zoneFilter === v ? 'rgba(34,197,94,0.2)' : cardBg,
                border:
                  zoneFilter === v
                    ? '1px solid #22c55e'
                    : `1px solid ${cardBorder}`,
                borderRadius: 20,
                padding: '6px 14px',
                color: zoneFilter === v ? '#22c55e' : subTextColor,
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Map - full screen */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: subTextColor,
                fontSize: 16,
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 40 }}>🧭</div>
              Зареждане на места...
            </div>
          ) : (
            <MapContainer
              center={[42.7, 25.0]}
              zoom={7}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer url={tileUrl} attribution="&copy; CARTO" />
              {selected && <FlyToSpot spot={selected} />}
              {filtered.map((spot) => (
                <Marker
                  key={spot.id}
                  position={[spot.lat, spot.lng]}
                  icon={getIcon(spot.safety || 0)}
                  eventHandlers={{
                    click: () => {
                      setSelected(spot);
                      setShowReviewForm(false);
                    },
                  }}
                >
                  <Popup>
                    <strong>{spot.name}</strong>
                    <br />
                    <SafetyBadge score={spot.safety || 0} />
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}

          {/* Spots count badge */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 1000,
              background: nightMode
                ? 'rgba(10,11,20,0.85)'
                : 'rgba(255,255,255,0.9)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              color: subTextColor,
              border: `1px solid ${cardBorder}`,
            }}
          >
            {filtered.length} места
          </div>

          {/* Legend */}
          <div
            style={{
              position: 'absolute',
              bottom: 90,
              left: 12,
              zIndex: 1000,
              background: nightMode
                ? 'rgba(10,11,20,0.85)'
                : 'rgba(255,255,255,0.9)',
              border: `1px solid ${cardBorder}`,
              borderRadius: 12,
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {[
              ['#22c55e', 'Безопасно'],
              ['#f59e0b', 'Умерено'],
              ['#ef4444', 'Внимание'],
            ].map(([c, l]) => (
              <div
                key={c}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: subTextColor,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: c,
                    flexShrink: 0,
                  }}
                />
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div
          style={{
            background: headerBg,
            borderTop: `1px solid ${headerBorder}`,
            display: 'flex',
            zIndex: 1000,
            flexShrink: 0,
          }}
        >
          {[
            ['map', '🗺️', 'Карта'],
            ['list', '📋', 'Списък'],
            ['add', '➕', 'Добави'],
            ['stats', '📊', 'Статистики'],
          ].map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'add') {
                  user ? setShowAdd(true) : setShowAuth(true);
                } else setActiveTab(key);
              }}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                padding: '10px 4px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                borderTop:
                  activeTab === key
                    ? '2px solid #f97316'
                    : '2px solid transparent',
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span
                style={{
                  fontSize: 10,
                  color: activeTab === key ? '#f97316' : subTextColor,
                  fontWeight: activeTab === key ? 700 : 400,
                }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom Drawer for spot details */}
        {selected && drawerOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              left: 0,
              right: 0,
              zIndex: 500,
              background: panelBg,
              borderRadius: '20px 20px 0 0',
              borderTop: `1px solid ${headerBorder}`,
              maxHeight: '70vh',
              overflowY: 'auto',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
            }}
          >
            {/* Handle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '10px 0 4px',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  background: cardBorder,
                  borderRadius: 99,
                }}
              />
            </div>

            <div style={{ padding: '0 16px 20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 12,
                }}
              >
                <div style={{ flex: 1, paddingRight: 10 }}>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: textColor,
                      marginBottom: 6,
                    }}
                  >
                    {selected.name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <SafetyBadge score={selected.safety || 0} />
                    {selected.verified && (
                      <span
                        style={{
                          fontSize: 11,
                          color: '#22d3ee',
                          background: 'rgba(6,182,212,0.1)',
                          borderRadius: 6,
                          padding: '2px 8px',
                        }}
                      >
                        ✓ Верифицирано
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelected(null);
                    setDrawerOpen(false);
                  }}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 20,
                    color: textColor,
                    cursor: 'pointer',
                    width: 32,
                    height: 32,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    flex: 1,
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 12,
                    padding: 12,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: subTextColor }}>
                    БЕЗОПАСНОСТ
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color:
                        (selected.safety || 0) >= 4.5
                          ? '#22c55e'
                          : (selected.safety || 0) >= 3.5
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  >
                    {(selected.safety || 0).toFixed(1)}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 12,
                    padding: 12,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: subTextColor }}>
                    ОТЗИВИ
                  </div>
                  <div
                    style={{ fontSize: 26, fontWeight: 900, color: '#60a5fa' }}
                  >
                    {reviews.length}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 12,
                    padding: 12,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: subTextColor }}>
                    СТАТУС
                  </div>
                  <div style={{ fontSize: 20, marginTop: 2 }}>
                    {selected.legal ? '✅' : '⚠️'}
                  </div>
                </div>
              </div>

              {selected.description && (
                <p
                  style={{
                    fontSize: 14,
                    color: nightMode ? '#a0aec0' : '#4a5568',
                    lineHeight: 1.6,
                    marginBottom: 14,
                  }}
                >
                  {selected.description}
                </p>
              )}

              {selected.amenities?.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginBottom: 14,
                  }}
                >
                  {selected.amenities.map((a, i) => (
                    <span
                      key={i}
                      style={{
                        background: cardBg,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 20,
                        padding: '5px 12px',
                        fontSize: 13,
                        color: textColor,
                      }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button
                  onClick={() => showToast('🗺️ Навигацията е стартирана!')}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #f97316, #22c55e)',
                    border: 'none',
                    borderRadius: 14,
                    padding: 14,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  🧭 Навигирай
                </button>
                <button
                  onClick={() => showToast('💾 Запазено!')}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 14,
                    padding: '14px 16px',
                    color: textColor,
                    fontSize: 20,
                    cursor: 'pointer',
                  }}
                >
                  🤍
                </button>
              </div>

              {/* Reviews */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{ fontSize: 13, color: subTextColor, fontWeight: 700 }}
                >
                  ОТЗИВИ ({reviews.length})
                </div>
                <button
                  onClick={() =>
                    user
                      ? setShowReviewForm(!showReviewForm)
                      : setShowAuth(true)
                  }
                  style={{
                    background: 'rgba(249,115,22,0.15)',
                    border: '1px solid rgba(249,115,22,0.3)',
                    borderRadius: 20,
                    padding: '5px 14px',
                    color: '#f97316',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {showReviewForm ? 'Отказ' : '+ Добави'}
                </button>
              </div>

              {showReviewForm && (
                <div
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <StarRating
                      value={newReview.rating}
                      size={28}
                      interactive
                      onChange={(r) =>
                        setNewReview({ ...newReview, rating: r })
                      }
                    />
                  </div>
                  <textarea
                    placeholder="Твоят отзив..."
                    value={newReview.text}
                    onChange={(e) =>
                      setNewReview({ ...newReview, text: e.target.value })
                    }
                    style={{
                      ...inputStyle,
                      height: 80,
                      resize: 'none',
                      marginBottom: 10,
                    }}
                  />
                  <button
                    onClick={submitReview}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #f97316, #22c55e)',
                      border: 'none',
                      borderRadius: 12,
                      padding: 12,
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 15,
                    }}
                  >
                    Изпрати
                  </button>
                </div>
              )}

              {reviews.map((r, i) => (
                <div
                  key={i}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: textColor,
                      }}
                    >
                      {r.user_name}
                    </span>
                    <span style={{ fontSize: 11, color: subTextColor }}>
                      {new Date(r.created_at).toLocaleDateString('bg-BG')}
                    </span>
                  </div>
                  <StarRating value={r.rating} size={13} />
                  <p
                    style={{
                      fontSize: 13,
                      color: subTextColor,
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    {r.text}
                  </p>
                </div>
              ))}

              {reviews.length === 0 && !showReviewForm && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '16px 0',
                    color: subTextColor,
                    fontSize: 14,
                  }}
                >
                  Няма отзиви още. Бъди първият! 😊
                </div>
              )}
            </div>
          </div>
        )}

        {/* List view overlay */}
        {activeTab === 'list' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 60,
              background: bg,
              zIndex: 200,
              overflowY: 'auto',
              padding: '16px',
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 18,
                color: textColor,
                marginBottom: 16,
              }}
            >
              Всички места ({filtered.length})
            </div>
            {filtered.map((spot) => (
              <div
                key={spot.id}
                onClick={() => {
                  setSelected(spot);
                  setActiveTab('map');
                }}
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: textColor,
                      flex: 1,
                      paddingRight: 8,
                    }}
                  >
                    {spot.name}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color:
                        (spot.safety || 0) >= 4.5
                          ? '#22c55e'
                          : (spot.safety || 0) >= 3.5
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  >
                    {(spot.safety || 0).toFixed(1)}
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: subTextColor,
                    marginBottom: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {spot.description}
                </p>
                <SafetyBadge score={spot.safety || 0} />
              </div>
            ))}
          </div>
        )}

        {/* Stats view overlay */}
        {activeTab === 'stats' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 60,
              background: bg,
              zIndex: 200,
              overflowY: 'auto',
              padding: '16px',
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 18,
                color: textColor,
                marginBottom: 16,
              }}
            >
              Статистики
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                ['🏕️', spots.length, 'Общо места'],
                ['✅', spots.filter((s) => s.legal).length, 'Легални'],
                [
                  '⭐',
                  spots.length > 0
                    ? (
                        spots.reduce((a, b) => a + (b.safety || 0), 0) /
                        spots.length
                      ).toFixed(1)
                    : '0',
                  'Ср. безопасност',
                ],
                ['✓', spots.filter((s) => s.verified).length, 'Верифицирани'],
              ].map(([icon, val, label]) => (
                <div
                  key={label}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 16,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      color: '#f97316',
                      marginBottom: 4,
                    }}
                  >
                    {val}
                  </div>
                  <div style={{ fontSize: 12, color: subTextColor }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auth Modal Mobile */}
        {showAuth && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'flex-end',
            }}
            onClick={() => setShowAuth(false)}
          >
            <div
              style={{
                background: panelBg,
                borderRadius: '24px 24px 0 0',
                padding: '24px 20px 36px',
                width: '100%',
                textAlign: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  background: cardBorder,
                  borderRadius: 99,
                  margin: '0 auto 20px',
                }}
              />
              <SafeStopLogo size={56} />
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 22,
                  color: textColor,
                  marginBottom: 8,
                  marginTop: 12,
                }}
              >
                Добре дошъл!
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: subTextColor,
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                Влез за да добавяш места и отзиви
              </div>
              <button
                onClick={signInWithGoogle}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '14px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1a202c',
                  marginBottom: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                Влез с Google
              </button>
              <button
                onClick={() => setShowAuth(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: subTextColor,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Продължи без акаунт
              </button>
            </div>
          </div>
        )}

        {/* Add spot modal mobile */}
        {showAdd && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'flex-end',
            }}
            onClick={() => setShowAdd(false)}
          >
            <div
              style={{
                background: panelBg,
                borderRadius: '24px 24px 0 0',
                padding: '20px 20px 36px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  background: cardBorder,
                  borderRadius: 99,
                  margin: '0 auto 16px',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{ fontWeight: 800, fontSize: 18, color: textColor }}
                >
                  + Добави място
                </div>
                <button
                  onClick={() => setShowAdd(false)}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 20,
                    color: textColor,
                    cursor: 'pointer',
                    width: 32,
                    height: 32,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
              {[
                ['Название *', 'name', 'Паркинг край реката...'],
                ['Описание', 'description', 'Опиши мястото...'],
                ['Ширина (lat) *', 'lat', '42.6981'],
                ['Дължина (lng) *', 'lng', '23.3217'],
                ['Удобства (със запетая)', 'amenities', '💧 Вода, 🔌 Ток'],
              ].map(([label, key, placeholder]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: subTextColor,
                      marginBottom: 6,
                      fontWeight: 700,
                    }}
                  >
                    {label.toUpperCase()}
                  </div>
                  <input
                    placeholder={placeholder}
                    value={newSpot[key]}
                    onChange={(e) =>
                      setNewSpot({ ...newSpot, [key]: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: subTextColor,
                    marginBottom: 6,
                    fontWeight: 700,
                  }}
                >
                  ТИП
                </div>
                <select
                  value={newSpot.type}
                  onChange={(e) =>
                    setNewSpot({ ...newSpot, type: e.target.value })
                  }
                  style={inputStyle}
                >
                  <option value="all">🏕️ Всички</option>
                  <option value="camper">🚐 Кемпер</option>
                  <option value="tent">⛺ Палатка</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: subTextColor,
                    marginBottom: 6,
                    fontWeight: 700,
                  }}
                >
                  ЗОНА
                </div>
                <select
                  value={newSpot.zone}
                  onChange={(e) =>
                    setNewSpot({ ...newSpot, zone: e.target.value })
                  }
                  style={inputStyle}
                >
                  <option value="природа">🌿 Природа</option>
                  <option value="градски">🏙️ Градски</option>
                  <option value="планински">⛰️ Планински</option>
                </select>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: subTextColor,
                  marginBottom: 16,
                  background: 'rgba(249,115,22,0.08)',
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                💡 За координати — Google Maps → кликни на точката → копирай
                числата
              </div>
              <button
                onClick={submitSpot}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #f97316, #22c55e)',
                  border: 'none',
                  borderRadius: 14,
                  padding: 14,
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ✅ Добави
              </button>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              background: nightMode
                ? 'rgba(13,15,30,0.95)'
                : 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(249,115,22,0.4)',
              borderRadius: 14,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              zIndex: 3000,
              color: textColor,
              whiteSpace: 'nowrap',
            }}
          >
            {toast}
          </div>
        )}
      </div>
    );
  }

  // ===== DESKTOP LAYOUT =====
  return (
    <div
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        background: bg,
        minHeight: '100vh',
        color: textColor,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          background: headerBg,
          borderBottom: `1px solid ${headerBorder}`,
          padding: '0 20px',
          zIndex: 1000,
          position: 'relative',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 0',
          }}
        >
          <SafeStopLogo size={42} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: textColor }}>
              SafeStop
            </div>
            <div
              style={{ fontSize: 10, color: subTextColor, letterSpacing: 1 }}
            >
              БЕЗОПАСЕН ПАРКИНГ НАВИГАТОР
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: nightMode
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.05)',
              border: `1px solid ${cardBorder}`,
              borderRadius: 10,
              padding: '8px 14px',
              gap: 8,
              flex: '0 1 220px',
            }}
          >
            <span style={{ opacity: 0.5 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Търси място..."
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: textColor,
                fontSize: 13,
                width: '100%',
              }}
            />
          </div>
          <button
            onClick={() => setNightMode(!nightMode)}
            style={{
              background: nightMode
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.08)',
              border: `1px solid ${cardBorder}`,
              borderRadius: 10,
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: 16,
              color: textColor,
            }}
          >
            {nightMode ? '☀️' : '🌙'}
          </button>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src={user.user_metadata?.avatar_url}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '2px solid #f97316',
                }}
              />
              <div
                style={{
                  fontSize: 12,
                  color: textColor,
                  maxWidth: 100,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.user_metadata?.full_name?.split(' ')[0] || 'Потребител'}
              </div>
              <button
                onClick={signOut}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: subTextColor,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Изход
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: `1px solid ${cardBorder}`,
                borderRadius: 10,
                padding: '8px 14px',
                color: textColor,
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              👤 Влез
            </button>
          )}
          <button
            onClick={() => {
              if (!user) {
                setShowAuth(true);
              } else {
                setShowAdd(true);
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #f97316, #22c55e)',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Добави място
          </button>
        </div>
        <div
          style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 4 }}
        >
          {[
            ['map', '🗺️ Карта'],
            ['list', '📋 Списък'],
            ['stats', '📊 Статистики'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                background:
                  activeTab === key ? 'rgba(249,115,22,0.15)' : 'none',
                border: 'none',
                borderBottom:
                  activeTab === key
                    ? '2px solid #f97316'
                    : '2px solid transparent',
                color: activeTab === key ? '#f97316' : subTextColor,
                padding: '10px 18px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div
        style={{
          background: nightMode ? 'rgba(13,15,30,0.95)' : '#f8fafc',
          borderBottom: `1px solid ${headerBorder}`,
          padding: '8px 20px',
          zIndex: 999,
          position: 'relative',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: subTextColor }}>ТИП:</span>
          {[
            ['all', 'Всички'],
            ['camper', '🚐 Кемпер'],
            ['tent', '⛺ Палатка'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                background: filter === v ? 'rgba(249,115,22,0.2)' : cardBg,
                border:
                  filter === v
                    ? '1px solid #f97316'
                    : `1px solid ${cardBorder}`,
                borderRadius: 8,
                padding: '4px 12px',
                color: filter === v ? '#f97316' : subTextColor,
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {l}
            </button>
          ))}
          <span style={{ fontSize: 11, color: subTextColor, marginLeft: 8 }}>
            ЗОНА:
          </span>
          {[
            ['all', 'Всички'],
            ['природа', '🌿 Природа'],
            ['градски', '🏙️ Град'],
            ['планински', '⛰️ Планини'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setZoneFilter(v)}
              style={{
                background: zoneFilter === v ? 'rgba(34,197,94,0.2)' : cardBg,
                border:
                  zoneFilter === v
                    ? '1px solid #22c55e'
                    : `1px solid ${cardBorder}`,
                borderRadius: 8,
                padding: '4px 12px',
                color: zoneFilter === v ? '#22d3ee' : subTextColor,
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {l}
            </button>
          ))}
          <span
            style={{ marginLeft: 'auto', fontSize: 12, color: subTextColor }}
          >
            {filtered.length} места
          </span>
        </div>
      </div>

      <main style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'map' && (
          <div
            style={{
              display: 'flex',
              height: 'calc(100vh - 130px)',
              position: 'relative',
            }}
          >
            <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
              {loading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: subTextColor,
                    fontSize: 16,
                  }}
                >
                  🔄 Зареждане...
                </div>
              ) : (
                <MapContainer
                  center={[42.7, 25.0]}
                  zoom={7}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url={tileUrl} attribution="&copy; CARTO" />
                  {selected && <FlyToSpot spot={selected} />}
                  {filtered.map((spot) => (
                    <Marker
                      key={spot.id}
                      position={[spot.lat, spot.lng]}
                      icon={getIcon(spot.safety || 0)}
                      eventHandlers={{
                        click: () => {
                          setSelected(spot);
                          setShowReviewForm(false);
                        },
                      }}
                    >
                      <Popup>
                        <strong>{spot.name}</strong>
                        <br />
                        <SafetyBadge score={spot.safety || 0} />
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: 20,
                  left: 20,
                  zIndex: 1000,
                  background: nightMode
                    ? 'rgba(10,11,20,0.9)'
                    : 'rgba(255,255,255,0.9)',
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 12,
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                {[
                  ['#22c55e', 'Много безопасно (4.5+)'],
                  ['#f59e0b', 'Умерено (3.5-4.4)'],
                  ['#ef4444', 'Внимание (<3.5)'],
                ].map(([c, l]) => (
                  <div
                    key={c}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 11,
                      color: subTextColor,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: c,
                      }}
                    />
                    {l}
                  </div>
                ))}
              </div>
            </div>

            {selected && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 340,
                  overflowY: 'auto',
                  background: panelBg,
                  borderLeft: `1px solid ${headerBorder}`,
                  zIndex: 1000,
                  boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: 10 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          marginBottom: 6,
                          color: textColor,
                        }}
                      >
                        {selected.name}
                      </div>
                      <div
                        style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: subTextColor,
                            background: cardBg,
                            borderRadius: 6,
                            padding: '2px 8px',
                          }}
                        >
                          {typeLabels[selected.type] || selected.type}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: subTextColor,
                            background: cardBg,
                            borderRadius: 6,
                            padding: '2px 8px',
                          }}
                        >
                          {zoneLabels[selected.zone] || selected.zone}
                        </span>
                        {selected.verified && (
                          <span
                            style={{
                              fontSize: 11,
                              color: '#22d3ee',
                              background: 'rgba(6,182,212,0.1)',
                              borderRadius: 6,
                              padding: '2px 8px',
                            }}
                          >
                            ✓ Верифицирано
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelected(null);
                        setShowReviewForm(false);
                      }}
                      style={{
                        background: nightMode
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.08)',
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 8,
                        color: textColor,
                        cursor: 'pointer',
                        width: 32,
                        height: 32,
                        fontSize: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div
                    style={{
                      background: 'rgba(34,197,94,0.08)',
                      border: '1px solid rgba(34,197,94,0.2)',
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 14,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: subTextColor,
                          marginBottom: 2,
                        }}
                      >
                        ИНДЕКС НА БЕЗОПАСНОСТ
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 900,
                          color:
                            (selected.safety || 0) >= 4.5
                              ? '#22c55e'
                              : (selected.safety || 0) >= 3.5
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      >
                        {(selected.safety || 0).toFixed(1)}
                        <span style={{ fontSize: 14, opacity: 0.5 }}>/5</span>
                      </div>
                      <SafetyBadge score={selected.safety || 0} />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: subTextColor }}>
                        {reviews.length} отзива
                      </div>
                      <StarRating value={selected.safety || 0} size={16} />
                      <div
                        style={{
                          fontSize: 10,
                          color: subTextColor,
                          marginTop: 4,
                        }}
                      >
                        {selected.legal ? '✅ Легално' : '⚠️ Неясен статус'}
                      </div>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: nightMode ? '#a0aec0' : '#4a5568',
                      lineHeight: 1.6,
                      marginBottom: 14,
                    }}
                  >
                    {selected.description}
                  </p>
                  {selected.amenities?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: subTextColor,
                          marginBottom: 8,
                          fontWeight: 700,
                        }}
                      >
                        УДОБСТВА
                      </div>
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
                      >
                        {selected.amenities.map((a, i) => (
                          <span
                            key={i}
                            style={{
                              background: cardBg,
                              border: `1px solid ${cardBorder}`,
                              borderRadius: 8,
                              padding: '4px 10px',
                              fontSize: 12,
                              color: textColor,
                            }}
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: subTextColor,
                        fontWeight: 700,
                      }}
                    >
                      ОТЗИВИ ({reviews.length})
                    </div>
                    <button
                      onClick={() =>
                        user
                          ? setShowReviewForm(!showReviewForm)
                          : setShowAuth(true)
                      }
                      style={{
                        background: 'rgba(249,115,22,0.15)',
                        border: '1px solid rgba(249,115,22,0.3)',
                        borderRadius: 8,
                        padding: '4px 10px',
                        color: '#f97316',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {showReviewForm ? 'Отказ' : '+ Добави отзив'}
                    </button>
                  </div>
                  {showReviewForm && (
                    <div
                      style={{
                        background: cardBg,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ marginBottom: 10 }}>
                        <StarRating
                          value={newReview.rating}
                          size={24}
                          interactive
                          onChange={(r) =>
                            setNewReview({ ...newReview, rating: r })
                          }
                        />
                      </div>
                      <textarea
                        placeholder="Твоят отзив..."
                        value={newReview.text}
                        onChange={(e) =>
                          setNewReview({ ...newReview, text: e.target.value })
                        }
                        style={{
                          ...inputStyle,
                          height: 80,
                          resize: 'none',
                          marginBottom: 10,
                        }}
                      />
                      <button
                        onClick={submitReview}
                        style={{
                          width: '100%',
                          background:
                            'linear-gradient(135deg, #f97316, #22c55e)',
                          border: 'none',
                          borderRadius: 10,
                          padding: 10,
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Изпрати отзив
                      </button>
                    </div>
                  )}
                  {reviews.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        background: cardBg,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: textColor,
                          }}
                        >
                          {r.user_name}
                        </span>
                        <span style={{ fontSize: 11, color: subTextColor }}>
                          {new Date(r.created_at).toLocaleDateString('bg-BG')}
                        </span>
                      </div>
                      <StarRating value={r.rating} size={12} />
                      <p
                        style={{
                          fontSize: 12,
                          color: subTextColor,
                          marginTop: 4,
                          lineHeight: 1.5,
                        }}
                      >
                        {r.text}
                      </p>
                    </div>
                  ))}
                  {reviews.length === 0 && !showReviewForm && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '20px 0',
                        color: subTextColor,
                        fontSize: 13,
                      }}
                    >
                      Няма отзиви все още. Бъди първият! 😊
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                      onClick={() => showToast('🗺️ Навигацията е стартирана!')}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #f97316, #22c55e)',
                        border: 'none',
                        borderRadius: 10,
                        padding: 11,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      🧭 Навигирай
                    </button>
                    <button
                      onClick={() => showToast('💾 Запазено в любими!')}
                      style={{
                        background: cardBg,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 10,
                        padding: '11px 14px',
                        color: textColor,
                        fontSize: 18,
                        cursor: 'pointer',
                      }}
                    >
                      🤍
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'list' && (
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: 20,
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 130px)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}
            >
              {filtered.map((spot) => (
                <div
                  key={spot.id}
                  onClick={() => {
                    setSelected(spot);
                    setActiveTab('map');
                  }}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 16,
                    padding: 18,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(249,115,22,0.07)';
                    e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = cardBg;
                    e.currentTarget.style.borderColor = cardBorder;
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 15,
                        flex: 1,
                        paddingRight: 8,
                        color: textColor,
                      }}
                    >
                      {spot.name}
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color:
                          (spot.safety || 0) >= 4.5
                            ? '#22c55e'
                            : (spot.safety || 0) >= 3.5
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {(spot.safety || 0).toFixed(1)}
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: subTextColor,
                      marginBottom: 10,
                      lineHeight: 1.5,
                    }}
                  >
                    {spot.description}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <SafetyBadge score={spot.safety || 0} />
                    <span style={{ fontSize: 11, color: subTextColor }}>
                      {typeLabels[spot.type] || spot.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div
            style={{
              maxWidth: 900,
              margin: '0 auto',
              padding: '30px 20px',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 130px)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginBottom: 24,
              }}
            >
              {[
                ['🏕️', spots.length, 'Общо места'],
                ['✅', spots.filter((s) => s.legal).length, 'Легални'],
                [
                  '⭐',
                  spots.length > 0
                    ? (
                        spots.reduce((a, b) => a + (b.safety || 0), 0) /
                        spots.length
                      ).toFixed(1)
                    : '0',
                  'Ср. безопасност',
                ],
                ['✓', spots.filter((s) => s.verified).length, 'Верифицирани'],
                [
                  '🌿',
                  spots.filter((s) => s.zone === 'природа').length,
                  'В природата',
                ],
                [
                  '🏙️',
                  spots.filter((s) => s.zone === 'градски').length,
                  'Градски',
                ],
              ].map(([icon, val, label]) => (
                <div
                  key={label}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 16,
                    padding: 20,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 900,
                      color: '#f97316',
                      marginBottom: 4,
                    }}
                  >
                    {val}
                  </div>
                  <div style={{ fontSize: 12, color: subTextColor }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showAuth && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowAuth(false)}
        >
          <div
            style={{
              background: panelBg,
              border: `1px solid ${headerBorder}`,
              borderRadius: 24,
              padding: 36,
              width: 380,
              maxWidth: '90vw',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SafeStopLogo size={56} />
            <div
              style={{
                fontWeight: 800,
                fontSize: 22,
                color: textColor,
                marginBottom: 8,
                marginTop: 12,
              }}
            >
              Добре дошъл в SafeStop!
            </div>
            <div
              style={{
                fontSize: 14,
                color: subTextColor,
                marginBottom: 28,
                lineHeight: 1.6,
              }}
            >
              Влез за да добавяш места, пишеш отзиви и запазваш любими!
            </div>
            <button
              onClick={signInWithGoogle}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                fontSize: 15,
                fontWeight: 600,
                color: '#1a202c',
                marginBottom: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              Влез с Google
            </button>
            <button
              onClick={() => setShowAuth(false)}
              style={{
                background: 'none',
                border: 'none',
                color: subTextColor,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Продължи без акаунт
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowAdd(false)}
        >
          <div
            style={{
              background: panelBg,
              border: `1px solid ${headerBorder}`,
              borderRadius: 20,
              padding: 28,
              width: 420,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18, color: textColor }}>
                + Добави ново място
              </div>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  color: textColor,
                  cursor: 'pointer',
                  width: 32,
                  height: 32,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
            {[
              ['Название *', 'name', 'Паркинг край реката...'],
              ['Описание', 'description', 'Опиши мястото...'],
              ['Ширина (lat) *', 'lat', '42.6981'],
              ['Дължина (lng) *', 'lng', '23.3217'],
              [
                'Удобства (разделени със запетая)',
                'amenities',
                '💧 Вода, 🔌 Ток',
              ],
            ].map(([label, key, placeholder]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: subTextColor,
                    marginBottom: 6,
                    fontWeight: 700,
                  }}
                >
                  {label.toUpperCase()}
                </div>
                <input
                  placeholder={placeholder}
                  value={newSpot[key]}
                  onChange={(e) =>
                    setNewSpot({ ...newSpot, [key]: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  color: subTextColor,
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                ТИП
              </div>
              <select
                value={newSpot.type}
                onChange={(e) =>
                  setNewSpot({ ...newSpot, type: e.target.value })
                }
                style={inputStyle}
              >
                <option value="all">🏕️ Всички</option>
                <option value="camper">🚐 Кемпер</option>
                <option value="tent">⛺ Палатка</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  color: subTextColor,
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                ЗОНА
              </div>
              <select
                value={newSpot.zone}
                onChange={(e) =>
                  setNewSpot({ ...newSpot, zone: e.target.value })
                }
                style={inputStyle}
              >
                <option value="природа">🌿 Природа</option>
                <option value="градски">🏙️ Градски</option>
                <option value="планински">⛰️ Планински</option>
              </select>
            </div>
            <div
              style={{
                fontSize: 11,
                color: subTextColor,
                marginBottom: 16,
                background: 'rgba(249,115,22,0.08)',
                borderRadius: 8,
                padding: 10,
              }}
            >
              💡 За координати — Google Maps → кликни на точката → копирай
              числата
            </div>
            <button
              onClick={submitSpot}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #f97316, #22c55e)',
                border: 'none',
                borderRadius: 10,
                padding: 12,
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ✅ Добави мястото
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            background: nightMode
              ? 'rgba(13,15,30,0.95)'
              : 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(249,115,22,0.4)',
            borderRadius: 12,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 3000,
            color: textColor,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
