import { Button, Card } from 'antd';
import type { Device } from '@/types';

interface EquipmentCardProps {
  device: Device;
  onBorrow?: (device: Device) => void;
}

const TIER_COLORS: Record<string, { bg: string; color: string }> = {
  S: { bg: '#FFFFFF', color: '#C99A3F' },
  A: { bg: '#FFFFFF', color: '#B05A4D' },
  B: { bg: '#FFFFFF', color: '#5C7BA8' },
  C: { bg: '#FFFFFF', color: '#4F8B5F' }
};

export default function EquipmentCard({ device, onBorrow }: EquipmentCardProps) {
  const tierConfig = TIER_COLORS[device.tier || 'C'];
  const isOutOfStock = device.availableQuantity === 0;
  const outOfStockStyle = isOutOfStock
    ? { opacity: 0.65 }
    : undefined;

  return (
    <Card
      hoverable
      style={{
        borderRadius: 14,
        border: '1px solid #E5DECB',
        overflow: 'hidden',
        transition: 'all 0.2s',
        ...outOfStockStyle
      }}
      styles={{ body: { padding: 0 } }}
      onClick={() => !isOutOfStock && onBorrow?.(device)}
    >
      {/* Top section: icon + tier badge */}
      <div
        style={{
          height: 140,
          background: '#EFE9DD',
          display: 'grid',
          placeItems: 'center',
          fontSize: 48,
          position: 'relative'
        }}
      >
        {device.icon || '📦'}

        {/* Tier badge */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            borderRadius: 8,
            background: tierConfig.bg,
            boxShadow: '0 1px 2px rgba(45, 74, 62, 0.04)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'Georgia, serif',
            color: tierConfig.color,
            border: `1px solid ${tierConfig.color}22`
          }}
        >
          {device.tier || 'C'}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 4,
            color: '#1A1F1B'
          }}
        >
          {device.name}
        </div>

        <div
          style={{
            fontSize: 12,
            color: '#6B6F6C',
            marginBottom: 12,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {device.description}
        </div>

        {/* Footer: stock + action */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            borderTop: '1px solid #EFEADA'
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: isOutOfStock ? '#B05A4D' : '#6B6F6C'
            }}
          >
            <strong style={{ color: '#1A1F1B', fontWeight: 600 }}>
              {device.availableQuantity}
            </strong>
            {' / '}
            {device.totalQuantity}
            {isOutOfStock ? ' hết' : ' còn'}
          </span>

          {isOutOfStock ? (
            <Button size="small" disabled style={{ borderRadius: 6 }}>
              Hết hàng
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              style={{
                borderRadius: 6,
                background: '#2D4A3E',
                borderColor: '#2D4A3E'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onBorrow?.(device);
              }}
            >
              Mượn
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
