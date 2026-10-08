import React from 'react';
import { BookOpen, Building2, LifeBuoy, Megaphone } from 'lucide-react';
import type { SchedulePillar, SchedulePlatform } from '../types';
import { PILLARS } from '../services/scheduling';
import { normalizeHexColor } from '../services/visualScene';

const PILLAR_ICONS: Record<SchedulePillar, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  edukasi: BookOpen,
  layanan: LifeBuoy,
  korporat: Building2
};

const PLATFORM_NAMES: Record<SchedulePlatform, string> = {
  instagram: 'Instagram', facebook: 'Facebook', twitter: 'X', linkedin: 'LinkedIn', youtube: 'YouTube'
};

interface ScheduleCoverProps {
  title: string;
  platform: SchedulePlatform;
  pillar?: SchedulePillar | null;
  primaryColor?: string;
  accentColor?: string;
  orgCode: string;
  /** thumb: calendar card icon · tile: grid square · hero: detail header. */
  size: 'thumb' | 'tile' | 'hero';
}

/** Branded fallback cover, rendered locally when a schedule has no image at all. */
export const ScheduleCover: React.FC<ScheduleCoverProps> = ({ title, platform, pillar, primaryColor, accentColor, orgCode, size }) => {
  const primary = normalizeHexColor(primaryColor) || '#0369a1';
  const accent = normalizeHexColor(accentColor) || '#06b6d4';
  const pillarColor = pillar ? PILLARS[pillar].color : accent;
  const Icon = pillar ? PILLAR_ICONS[pillar] : Megaphone;

  const background = [
    `radial-gradient(circle at 85% 15%, ${pillarColor}66 0, transparent 45%)`,
    `radial-gradient(circle at 10% 90%, ${accent}55 0, transparent 40%)`,
    `linear-gradient(135deg, ${primary}, ${accent})`
  ].join(', ');

  if (size === 'thumb') {
    return (
      <div style={{ width: '100%', height: '100%', background, display: 'grid', placeItems: 'center', color: '#fff' }} aria-hidden>
        <Icon size={12} strokeWidth={2.4} />
      </div>
    );
  }

  if (size === 'tile') {
    return (
      <div style={{ width: '100%', height: '100%', background, color: '#fff', position: 'relative', overflow: 'hidden', padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <span style={{ position: 'absolute', right: '-6px', top: '-6px', opacity: 0.25 }}><Icon size={44} strokeWidth={1.5} /></span>
        <span style={{ fontSize: '0.55rem', fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{title}</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background, color: '#fff', position: 'relative', overflow: 'hidden', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <span style={{ position: 'absolute', right: '-24px', bottom: '-28px', opacity: 0.18 }}><Icon size={170} strokeWidth={1.25} /></span>
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: pillarColor }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.18)', padding: '3px 10px', borderRadius: '999px', display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
          <Icon size={12} /> {pillar ? PILLARS[pillar].label : 'Konten'}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.06em', opacity: 0.9 }}>{orgCode}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '0 1px 3px rgba(0,0,0,0.25)', maxWidth: '85%' }}>{title}</div>
        <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '6px' }}>{PLATFORM_NAMES[platform]} · Sampul otomatis</div>
      </div>
    </div>
  );
};
