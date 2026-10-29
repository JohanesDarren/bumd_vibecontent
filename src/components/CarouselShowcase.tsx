import React from 'react';

// Real QR code SVG component for authentic flyer reproduction
const PosterQrCode: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    {/* Corner Position Detection Patterns */}
    <rect x="0" y="0" width="30" height="30" fill="currentColor" rx="2" />
    <rect x="5" y="5" width="20" height="20" fill="white" />
    <rect x="10" y="10" width="10" height="10" fill="currentColor" />

    <rect x="70" y="0" width="30" height="30" fill="currentColor" rx="2" />
    <rect x="75" y="5" width="20" height="20" fill="white" />
    <rect x="80" y="10" width="10" height="10" fill="currentColor" />

    <rect x="0" y="70" width="30" height="30" fill="currentColor" rx="2" />
    <rect x="5" y="75" width="20" height="20" fill="white" />
    <rect x="10" y="80" width="10" height="10" fill="currentColor" />

    {/* Data Matrix Modules */}
    <rect x="35" y="5" width="8" height="8" fill="currentColor" />
    <rect x="48" y="12" width="6" height="6" fill="currentColor" />
    <rect x="58" y="5" width="7" height="7" fill="currentColor" />

    <rect x="35" y="25" width="12" height="6" fill="currentColor" />
    <rect x="52" y="22" width="8" height="8" fill="currentColor" />
    <rect x="40" y="40" width="20" height="20" fill="currentColor" />
    <rect x="45" y="45" width="10" height="10" fill="white" />

    <rect x="5" y="38" width="6" height="12" fill="currentColor" />
    <rect x="18" y="45" width="8" height="6" fill="currentColor" />
    <rect x="72" y="38" width="8" height="8" fill="currentColor" />
    <rect x="85" y="48" width="10" height="6" fill="currentColor" />

    <rect x="36" y="72" width="8" height="14" fill="currentColor" />
    <rect x="48" y="68" width="14" height="6" fill="currentColor" />
    <rect x="68" y="75" width="12" height="18" fill="currentColor" />
    <rect x="84" y="82" width="12" height="12" fill="currentColor" />
    <rect x="52" y="84" width="8" height="8" fill="currentColor" />
  </svg>
);

// Card 1: Dark Moody & Neon Orange (Inspired by Mezbah Doa)
const CardDarkOrange: React.FC = () => (
  <div className="relative w-full aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden bg-black text-white shadow-md border border-neutral-800 flex flex-col justify-between p-5 select-none pointer-events-none">
    <img
      src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=700&q=80"
      alt="Malam Inspirasi"
      className="absolute inset-0 w-full h-full object-cover opacity-45 grayscale contrast-125"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 pointer-events-none" />

    {/* Header */}
    <div className="relative z-10 flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-widest text-neutral-400">
        <span className="text-orange-500 font-bold">≡</span> ALIVE 2026
      </div>
    </div>

    {/* Big Bold Typography */}
    <div className="relative z-10 my-auto text-left py-2">
      <h2 className="text-3xl sm:text-[36px] font-black tracking-tight leading-[0.92] text-[#ff5722] uppercase">
        Malam<br />Inspirasi
      </h2>
      <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-neutral-200 tracking-wider">
        <span>GRAND BALLROOM</span>
        <span className="text-orange-500">|</span>
        <span>19:00 WIB</span>
        <span className="text-orange-500">|</span>
        <span>HALL A</span>
      </div>
    </div>

    {/* Bottom Quote in Italics */}
    <div className="relative z-10 pt-2 border-t border-neutral-800">
      <p className="text-[10px] text-neutral-400 italic leading-snug">
        &ldquo;Harus dijaga supaya api inovasi tetap menyala, janganlah dibiarkan padam.&rdquo;
      </p>
    </div>
  </div>
);

// Card 2: Artisan Culinary & Pastry (Inspired by Besek / Artisan Food Menu)
const CardArtisanPastry: React.FC = () => (
  <div className="relative w-full aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#241812] text-white shadow-md border border-[#3d2c22] flex flex-col justify-between p-4 select-none pointer-events-none">
    <img
      src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=700&q=80"
      alt="Artisan Pastry"
      className="absolute inset-0 w-full h-full object-cover opacity-80"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20 pointer-events-none" />

    {/* Header */}
    <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-amber-300">
      <span>NUSANTARA MENU</span>
    </div>

    {/* Typewriter Floating Food Labels */}
    <div className="relative z-10 space-y-1">
      <div className="inline-block px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-amber-100 border border-amber-500/20">
        • Roti Sourdough Kuno
      </div>
      <br />
      <div className="inline-block px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-amber-200 border border-amber-500/20">
        • Croissant Madu Kelapa
      </div>
      <h3 className="text-sm font-bold text-white mt-1 pt-1 tracking-tight">
        Pilihan Patisserie & Kudapan Tradisional
      </h3>
    </div>
  </div>
);

// Card 3: Modern Swiss Sports Poster with Lime Glow (Inspired by Connect Sport Day)
const CardSportConnect: React.FC = () => (
  <div className="relative w-full aspect-[9/14] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#121415] text-white shadow-md border border-neutral-800 flex flex-col justify-between p-5 select-none pointer-events-none">
    <img
      src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=700&q=80"
      alt="Connect Sport Day"
      className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale contrast-150"
    />
    {/* Electric lime fluorescent spray accents */}
    <div className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-[#84cc16]/25 blur-3xl pointer-events-none" />
    <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-[#a3e635]/20 blur-3xl pointer-events-none" />

    {/* Top Header */}
    <div className="relative z-10 flex items-center justify-between">
      <span className="text-[11px] font-black tracking-widest text-neutral-300 uppercase">
        LEGACY METRO
      </span>
    </div>

    {/* Big Title: Grotesque Sans + Italic Serif Contrast */}
    <div className="relative z-10 text-left my-auto">
      <h2 className="text-3xl sm:text-[34px] font-black tracking-tight leading-[0.95] text-white">
        Connect<br />
        <span className="font-serif italic font-normal text-slate-100">Sport Day</span>
      </h2>

      {/* 2-Column Schedule Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-left text-neutral-300">
        <div>
          <span className="block text-[10px] font-mono text-neutral-400 uppercase">BADMINTON</span>
          <span className="text-xs font-bold text-white">13:00–15:00</span>
        </div>
        <div>
          <span className="block text-[10px] font-mono text-neutral-400 uppercase">VENUE</span>
          <span className="text-xs font-bold text-white">CROSSCOURT</span>
        </div>
      </div>
    </div>

    {/* QR Registration Section */}
    <div className="relative z-10 pt-3 border-t border-neutral-800 flex items-center justify-between">
      <div className="text-left">
        <span className="block font-serif italic text-xs text-neutral-300">Register Now</span>
        <span className="block text-[10px] font-bold text-[#a3e635] mt-0.5 uppercase tracking-wider">
          FEE: FREE • LIMITED 24
        </span>
      </div>
      <div className="p-1 rounded bg-white text-black shadow-xs">
        <PosterQrCode className="w-8 h-8 text-black" />
      </div>
    </div>
  </div>
);

// Card 4: Dynamic Action Championship (Inspired by NBA Finals #2026)
const CardChampionshipRed: React.FC = () => (
  <div className="relative w-full aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0c0d10] text-white shadow-md border border-neutral-800 flex flex-col justify-between p-5 select-none pointer-events-none">
    <img
      src="https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=700&q=80"
      alt="City Run Championship"
      className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale contrast-150"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />

    {/* Header */}
    <div className="relative z-10 flex items-center justify-between">
      <span className="text-xs font-black tracking-widest text-neutral-400 uppercase">
        REGIONAL RACE
      </span>
    </div>

    {/* Bold Distressed Headline */}
    <div className="relative z-10 my-auto text-left">
      <h2 className="text-4xl sm:text-[42px] font-black tracking-tighter leading-[0.88] text-white uppercase italic">
        CITY RUN<br />
        <span className="text-rose-500">CHAMPION</span>
      </h2>
      <p className="text-xs font-bold text-neutral-300 mt-2 tracking-wide uppercase">
        10K & HALF MARATHON • MONAS TO SUDIRMAN
      </p>
    </div>

    {/* Footer Info */}
    <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-neutral-400">
      <span>START 05:30 WIB</span>
      <span className="text-rose-400 font-bold">TOTAL HADIAH 150JT</span>
    </div>
  </div>
);

// Card 5: Emerald Green & Botanical Eco City (Public Services & Clean Energy)
const CardEcoGreen: React.FC = () => (
  <div className="relative w-full aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-[#042013] text-white shadow-md border border-emerald-900/60 flex flex-col justify-between p-4 sm:p-5 select-none pointer-events-none">
    <img
      src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=700&q=80"
      alt="Kota Hijau"
      className="absolute inset-0 w-full h-full object-cover opacity-50"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#02180d] via-[#042013]/70 to-transparent pointer-events-none" />

    <div className="relative z-10 flex items-center justify-between">
      <span className="text-[11px] font-mono text-emerald-300 font-bold tracking-wider">NET ZERO 2026</span>
    </div>

    <div className="relative z-10 text-left">
      <h3 className="text-xl sm:text-2xl font-black text-emerald-400 leading-tight uppercase">
        Kota Bersih<br />& Transportasi Listrik
      </h3>
      <p className="text-[11px] text-emerald-100 font-medium mt-1.5">
        Armada Bus Listrik Ramah Lingkungan untuk Seluruh Koridor Warga.
      </p>
    </div>

    <div className="relative z-10 flex items-center justify-between text-[10px] text-emerald-300 font-mono pt-2 border-t border-emerald-900/50">
      <span>0% EMISI KARBON</span>
      <span className="text-white font-bold">TARIF SUBSIDI</span>
    </div>
  </div>
);

// Card 6: Royal Purple & Indigo Smart City (Digital Citizen Portal)
const CardSmartCityPurple: React.FC = () => (
  <div className="relative w-full aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#130722] text-white shadow-md border border-purple-900/50 flex flex-col justify-between p-4 select-none pointer-events-none">
    <img
      src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=700&q=80"
      alt="Smart City Portal"
      className="absolute inset-0 w-full h-full object-cover opacity-40"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#130722] via-[#130722]/60 to-transparent pointer-events-none" />

    <div className="relative z-10 flex items-center justify-between">
      <span className="text-[11px] font-mono text-purple-300 font-bold tracking-wider">SMART CITY SATU PINTU</span>
    </div>

    <div className="relative z-10 text-left">
      <h3 className="text-lg font-black text-white leading-tight">
        Portal Layanan Terpadu Warga
      </h3>
      <p className="text-[11px] text-purple-200 mt-1">
        Layanan Kependudukan, Pajak Daerah & Call Center 112 dalam Satu Aplikasi.
      </p>
    </div>

    <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-purple-300 pt-1.5 border-t border-purple-900/40">
      <span>TERINTEGRASI NASIONAL</span>
      <span className="text-white font-bold">VERIFIKASI CEPAT</span>
    </div>
  </div>
);

// Card 7: Sunset Amber & Luxury Boutique Hotel (Grande Heritage)
const CardHotelSunset: React.FC = () => (
  <div className="relative w-full aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#1e1509] text-white shadow-md border border-amber-900/40 flex flex-col justify-between p-5 select-none pointer-events-none">
    <img
      src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80"
      alt="Grande Heritage Resort"
      className="absolute inset-0 w-full h-full object-cover opacity-75"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 pointer-events-none" />

    <div className="relative z-10 flex items-center justify-between">
      <span className="text-[10px] font-mono tracking-widest text-amber-200 uppercase">
        GRANDE HERITAGE
      </span>
    </div>

    <div className="relative z-10 text-left my-auto">
      <span className="text-xs font-mono text-amber-300 block mb-1">PROMO MENGINAP</span>
      <h3 className="font-serif text-2xl sm:text-3xl text-white font-normal leading-tight">
        Staycation Istimewa di Jantung Kota
      </h3>
      <p className="text-xs text-amber-100/90 font-medium mt-2">
        Mulai Rp 1.250.000 / Malam • Termasuk Sarapan & Spa
      </p>
    </div>

    <div className="relative z-10 pt-2 border-t border-amber-800/40 flex items-center justify-between text-[10px] font-mono text-amber-300">
      <span>RESERVASI RESMI</span>
      <span className="text-white font-bold">BUMD HOSPITALITY</span>
    </div>
  </div>
);

// Card 8: Cyan Teal Clinical Health (RSUD Layanan Prima)
const CardHospitalTeal: React.FC = () => (
  <div className="relative w-full aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-[#061e24] text-white shadow-md border border-cyan-900/50 flex flex-col justify-between p-4 select-none pointer-events-none">
    <img
      src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=700&q=80"
      alt="RSUD Layanan Prima"
      className="absolute inset-0 w-full h-full object-cover opacity-55"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#04171c] via-[#061e24]/70 to-transparent pointer-events-none" />

    <div className="relative z-10 flex items-center justify-between">
      <span className="text-[11px] font-mono text-cyan-300 font-bold tracking-wider">RSUD REGIONAL</span>
    </div>

    <div className="relative z-10 text-left">
      <h3 className="text-lg font-black text-cyan-300 leading-tight uppercase">
        Layanan Kesehatan Prima & Cepat
      </h3>
      <p className="text-[11px] text-cyan-100 mt-1">
        Pusat Diagnostik Terpadu, Poliklinik Spesialis, dan Ambulans Tanggap Darurat.
      </p>
    </div>

    <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-cyan-300 pt-1.5 border-t border-cyan-900/50">
      <span>CALL CENTER: 119</span>
      <span className="text-white font-bold">AKREDITASI PARIPURNA</span>
    </div>
  </div>
);

// Card 9: Vibrant Rose & Coral (Pekan Seni & Pasar Kreatif)
const CardCreativeRose: React.FC = () => (
  <div className="relative w-full aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#240a14] text-white shadow-md border border-rose-900/50 flex flex-col justify-between p-4 select-none pointer-events-none">
    <img
      src="https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=700&q=80"
      alt="Pasar Kreatif Seni"
      className="absolute inset-0 w-full h-full object-cover opacity-65"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#240a14] via-[#240a14]/60 to-transparent pointer-events-none" />

    <div className="relative z-10 flex items-center justify-between">
      <span className="text-[11px] font-mono text-rose-200 font-bold tracking-wider">PEKAN SENI DAERAH</span>
    </div>

    <div className="relative z-10 text-left">
      <h3 className="text-lg font-black text-rose-200 leading-tight">
        Pasar Kreatif Seni & Budaya
      </h3>
      <p className="text-[11px] text-rose-100 mt-1">
        Bazar Kerajinan Lokal, Panggung Musik Tradisi, dan Galeri Seni Rupa.
      </p>
    </div>

    <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-rose-300 pt-1.5 border-t border-rose-900/50">
      <span>TAMAN BUDAYA</span>
      <span className="text-white font-bold">TERBUKA UNTUK UMUM</span>
    </div>
  </div>
);

export const CarouselShowcase: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative h-full w-full overflow-hidden select-none pointer-events-none ${className}`}>
      {/* Top & Bottom seamless gradient masks for infinite floating feel */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 sm:h-28 bg-gradient-to-b from-white via-white/80 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 sm:h-28 bg-gradient-to-t from-white via-white/80 to-transparent z-10" />

      {/* 3 lines / columns of vertical scrolling carousel sliding over and over non-stop */}
      <div className="grid grid-cols-3 gap-3.5 sm:gap-5 h-full px-2 sm:px-4 py-2">
        {/* Column 1: sliding UP */}
        <div className="flex-1 min-w-0 overflow-hidden h-full">
          <div className="flex flex-col gap-4 sm:gap-5 animate-slide-up-slow">
            <CardDarkOrange />
            <CardArtisanPastry />
            <CardChampionshipRed />
            {/* Duplicate for seamless infinite loop */}
            <CardDarkOrange />
            <CardArtisanPastry />
            <CardChampionshipRed />
          </div>
        </div>

        {/* Column 2: sliding DOWN */}
        <div className="flex-1 min-w-0 overflow-hidden h-full">
          <div className="flex flex-col gap-4 sm:gap-5 animate-slide-down-slow">
            <CardSportConnect />
            <CardEcoGreen />
            <CardHotelSunset />
            {/* Duplicate for seamless infinite loop */}
            <CardSportConnect />
            <CardEcoGreen />
            <CardHotelSunset />
          </div>
        </div>

        {/* Column 3: sliding UP */}
        <div className="flex-1 min-w-0 overflow-hidden h-full">
          <div className="flex flex-col gap-4 sm:gap-5 animate-slide-up-medium">
            <CardSmartCityPurple />
            <CardHospitalTeal />
            <CardCreativeRose />
            {/* Duplicate for seamless infinite loop */}
            <CardSmartCityPurple />
            <CardHospitalTeal />
            <CardCreativeRose />
          </div>
        </div>
      </div>
    </div>
  );
};
