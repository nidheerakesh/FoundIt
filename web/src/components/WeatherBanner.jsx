import { useState, useEffect } from 'react';
import { getWeatherContext } from '../lib/ai';

export default function WeatherBanner() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    getWeatherContext().then(setWeather);
  }, []);

  if (!weather || !weather.temperature) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 'var(--radius-full)',
      background: 'var(--surface-raised)', border: '1px solid var(--border)',
      fontSize: 'var(--text-xs)', color: 'var(--ink-secondary)',
      maxWidth: 'fit-content',
    }}>
      <span style={{ fontSize: '1.1rem' }}>{weather.icon}</span>
      <span style={{ fontWeight: 700 }}>{weather.temperature}°C</span>
      <span>·</span>
      <span>{weather.weather}</span>
      {weather.isRainy && (
        <>
          <span>·</span>
          <span style={{ color: 'var(--market)', fontWeight: 600 }}>Check covered areas</span>
        </>
      )}
    </div>
  );
}
