import React, { useEffect, useState } from 'react';
import { resolvePhoto } from '../lib/storage';

// Exibe uma foto salva no app: caminho do Storage (photos/...) vira URL
// assinada; valores legados (data URL/http) são usados diretamente.
export function Photo({
  value,
  alt,
  className,
  style,
}: {
  value: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [url, setUrl] = useState<string | null>(() =>
    value && !value.startsWith('photos/') ? value : null,
  );

  useEffect(() => {
    let alive = true;
    resolvePhoto(value).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  if (!url) return null;
  return <img src={url} alt={alt} className={className} style={style} />;
}
