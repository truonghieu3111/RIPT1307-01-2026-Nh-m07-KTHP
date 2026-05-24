import { Tag } from 'antd';
import type { TrustRank } from '@/types';

interface TrustRankBadgeProps {
  rank: TrustRank;
  score?: number;
}

const RANK_CONFIG: Record<TrustRank, { color: string; bg: string; label: string }> = {
  diamond: { color: '#075985', bg: '#E0F2FE', label: '★ Kim cương' },
  gold: { color: '#8B6A1F', bg: '#F5EBD0', label: '★ Hạng Vàng' },
  silver: { color: '#4A5568', bg: '#ECEEF2', label: '★ Hạng Bạc' },
  bronze: { color: '#8C4A36', bg: '#F7E8DF', label: '★ Hạng Đồng' },
  stone: { color: '#6B6F6C', bg: '#EFE9DD', label: '★ Hạng Đá' }
};

export default function TrustRankBadge({ rank, score }: TrustRankBadgeProps) {
  const config = RANK_CONFIG[rank] || RANK_CONFIG.stone;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Tag
        style={{
          color: config.color,
          background: config.bg,
          border: 'none',
          borderRadius: 100,
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 10px',
          margin: 0
        }}
      >
        {config.label}
      </Tag>
      {score !== undefined && (
        <span style={{ fontSize: 13, color: '#6B6F6C' }}>
          {score} điểm uy tín
        </span>
      )}
    </div>
  );
}
