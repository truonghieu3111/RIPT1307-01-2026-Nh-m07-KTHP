import { Statistic, Card } from 'antd';

interface StatsCardProps {
  title: string;
  value: number;
  suffix?: string;
  meta?: string;
  featured?: boolean;
}

export default function StatsCard({ title, value, suffix, meta, featured }: StatsCardProps) {
  return (
    <Card
      style={{
        borderRadius: 14,
        border: featured ? '1px solid #2D4A3E' : '1px solid #E5DECB',
        background: featured ? '#2D4A3E' : '#FFFFFF',
        boxShadow: '0 1px 2px rgba(45, 74, 62, 0.04)'
      }}
      styles={{ body: { padding: 22 } }}
      variant="borderless"
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: featured ? 'rgba(255,255,255,0.7)' : '#6B6F6C',
          marginBottom: 10
        }}
      >
        {title}
      </div>
      <Statistic
        value={value}
        suffix={suffix}
        valueStyle={{
          fontFamily: 'Georgia, serif',
          fontSize: 36,
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: featured ? '#FFFFFF' : '#1A1F1B'
        }}
      />
      {meta && (
        <div
          style={{
            fontSize: 12,
            color: featured ? 'rgba(255,255,255,0.7)' : '#6B6F6C',
            marginTop: 8
          }}
        >
          {meta}
        </div>
      )}
    </Card>
  );
}
