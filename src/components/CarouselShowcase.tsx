import React from 'react';

interface ShowcaseCardItem {
  id: string;
  image: string;
  aspectRatio: string;
  objectPosition?: string;
  alt: string;
}

// Column 1: Mix of clean products and public announcement posters
const COLUMN_1_ITEMS: ShowcaseCardItem[] = [
  {
    id: 'c1-1',
    image: '/showcase/opt/prod_jacket.webp',
    aspectRatio: 'aspect-square',
    objectPosition: 'object-center',
    alt: 'Outerwear Jacket Product',
  },
  {
    id: 'c1-2',
    image: '/showcase/opt/poster_hotel_natural.webp',
    aspectRatio: 'aspect-[3/4]',
    objectPosition: 'object-top',
    alt: 'Grande Heritage Hotel Poster',
  },
  {
    id: 'c1-3',
    image: '/showcase/opt/prod_sneaker.webp',
    aspectRatio: 'aspect-[4/3]',
    objectPosition: 'object-center',
    alt: 'Sneaker Kicks Product',
  },
  {
    id: 'c1-4',
    image: '/showcase/opt/poster_eco_natural.webp',
    aspectRatio: 'aspect-square',
    objectPosition: 'object-bottom',
    alt: 'Kota Hijau Eco Transit Poster',
  },
];

// Column 2: Mix of event flyers, products, and hospital announcements
const COLUMN_2_ITEMS: ShowcaseCardItem[] = [
  {
    id: 'c2-1',
    image: '/showcase/opt/ref_sport_connect.webp',
    aspectRatio: 'aspect-[3/4]',
    objectPosition: 'object-top',
    alt: 'Connect Sport Day Poster',
  },
  {
    id: 'c2-2',
    image: '/showcase/opt/prod_watch.webp',
    aspectRatio: 'aspect-square',
    objectPosition: 'object-center',
    alt: 'Minimalist Watch Product',
  },
  {
    id: 'c2-3',
    image: '/showcase/opt/poster_hospital_natural.webp',
    aspectRatio: 'aspect-[4/3]',
    objectPosition: 'object-center',
    alt: 'RSUD Layanan Medis Prima Poster',
  },
  {
    id: 'c2-4',
    image: '/showcase/opt/prod_tech.webp',
    aspectRatio: 'aspect-[3/4]',
    objectPosition: 'object-center',
    alt: 'Studio Headphones Product',
  },
];

// Column 3: Mix of clean bakery products, water utility, and smart city
const COLUMN_3_ITEMS: ShowcaseCardItem[] = [
  {
    id: 'c3-1',
    image: '/showcase/opt/prod_bread.webp',
    aspectRatio: 'aspect-[4/3]',
    objectPosition: 'object-center',
    alt: 'Artisan Croissant Bakery Product',
  },
  {
    id: 'c3-2',
    image: '/showcase/opt/poster_water_natural.webp',
    aspectRatio: 'aspect-[3/4]',
    objectPosition: 'object-top',
    alt: 'Perumda Tirta Clean Water Announcement',
  },
  {
    id: 'c3-3',
    image: '/showcase/opt/prod_perfume.webp',
    aspectRatio: 'aspect-square',
    objectPosition: 'object-center',
    alt: 'Luxury Fragrance Perfume Product',
  },
  {
    id: 'c3-4',
    image: '/showcase/opt/poster_smartcity_natural.webp',
    aspectRatio: 'aspect-[4/3]',
    objectPosition: 'object-bottom',
    alt: 'Smart City Digital Portal Banner',
  },
];

/**
 * A single showcase card.
 *
 * The columns drift continuously, so a card that is off-screen now will be
 * visible within seconds. `loading="lazy"` therefore caused visible pop-in
 * during the scroll; every image is fetched eagerly at high priority instead.
 * The files themselves are small WebP (11–69 KB), so eager loading is cheap.
 */
const ShowcaseCard: React.FC<{ item: ShowcaseCardItem; priority?: boolean }> = ({ item, priority }) => {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-100 border border-slate-200/80 shadow-xs select-none pointer-events-none">
      <div className={`w-full ${item.aspectRatio} relative overflow-hidden bg-slate-100`}>
        <img
          src={item.image}
          alt={item.alt}
          width={720}
          height={900}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className={`w-full h-full object-cover ${item.objectPosition || 'object-center'}`}
        />
      </div>
    </div>
  );
};

const CarouselColumn: React.FC<{ items: ShowcaseCardItem[]; animationClass: string }> = ({
  items,
  animationClass,
}) => {
  // Duplicate array to achieve a seamless, continuous infinite loop
  const doubledItems = [...items, ...items];

  return (
    <div className="flex-1 min-w-0 overflow-hidden h-full">
      <div className={`flex flex-col gap-4 sm:gap-5 ${animationClass}`}>
        {doubledItems.map((item, index) => (
          <ShowcaseCard key={`${item.id}-${index}`} item={item} priority={index < 2} />
        ))}
      </div>
    </div>
  );
};

export const CarouselShowcase: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative h-full w-full overflow-hidden select-none pointer-events-none ${className}`}>
      {/* Top & Bottom seamless gradient masks for infinite floating feel */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 sm:h-28 bg-gradient-to-b from-white via-white/80 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 sm:h-28 bg-gradient-to-t from-white via-white/80 to-transparent z-10" />

      {/* 3 lines / columns of vertical scrolling carousel sliding over and over non-stop */}
      <div className="grid grid-cols-3 gap-3.5 sm:gap-5 h-full px-2 sm:px-4 py-2">
        {/* Column 1: sliding UP */}
        <CarouselColumn items={COLUMN_1_ITEMS} animationClass="animate-slide-up-slow" />

        {/* Column 2: sliding DOWN */}
        <CarouselColumn items={COLUMN_2_ITEMS} animationClass="animate-slide-down-slow" />

        {/* Column 3: sliding UP */}
        <CarouselColumn items={COLUMN_3_ITEMS} animationClass="animate-slide-up-medium" />
      </div>
    </div>
  );
};
