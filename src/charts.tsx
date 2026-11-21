// Small dependency-free SVG charts

export function MiniChart({ data, kind, color }: { data: { label: string; value: number }[]; kind: 'bar' | 'line'; color: string }) {
  const W = 600, H = 190, L = 34, B = 24, T = 10, R = 8;
  const max = Math.max(1, ...data.map(d => d.value));
  const nice = Math.max(4, Math.ceil(max / 4) * 4);
  const iw = W - L - R, ih = H - T - B, n = data.length;
  if (!n) return <div className="text-sm text-slate-500 py-8 text-center">No data yet</div>;
  const x = (i: number) => L + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const bw = Math.max(2, iw / Math.max(n, 1) - 2);
  const y = (v: number) => T + ih - (v / nice) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(nice * f));
  const labelIdx = n <= 1 ? [0] : n <= 12 ? data.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
      {ticks.map(t => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e7e5e4" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#78716c">{t}</text>
        </g>
      ))}
      {kind === 'bar'
        ? data.map((d, i) => (
            <rect key={i} x={L + (i * iw) / n + 1} y={y(d.value)} width={bw} height={Math.max(0, T + ih - y(d.value))} fill={color} rx="2">
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
          ))
        : (
          <>
            <polyline fill="none" stroke={color} strokeWidth="2.5" points={data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')} />
            {n <= 31 && data.map((d, i) => (
              <circle key={i} cx={x(i)} cy={y(d.value)} r="3" fill={color}><title>{`${d.label}: ${d.value}`}</title></circle>
            ))}
          </>
        )}
      {labelIdx.map(i => (
        <text key={i} x={kind === 'bar' ? L + (i * iw) / n + bw / 2 : x(i)} y={H - 6} textAnchor={n <= 12 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize={n <= 12 ? 9 : 10} fill="#78716c">{data[i]?.label}</text>
      ))}
    </svg>
  );
}

export function GroupedBars({ data, aName, bName }: { data: { label: string; a: number; b: number }[]; aName: string; bName: string }) {
  const W = 600, H = 190, L = 34, B = 24, T = 10, R = 8;
  const max = Math.max(1, ...data.map(d => Math.max(d.a, d.b)));
  const nice = Math.max(4, Math.ceil(max / 4) * 4);
  const iw = W - L - R, ih = H - T - B, n = data.length;
  if (!n) return <div className="text-sm text-slate-500 py-8 text-center">No data yet</div>;
  const gw = iw / Math.max(n, 1), bw = Math.max(2, (gw - 6) / 2);
  const y = (v: number) => T + ih - (v / nice) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(nice * f));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        {ticks.map(t => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e7e5e4" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#78716c">{t}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={i}>
            <rect x={L + i * gw + 3} y={y(d.a)} width={bw} height={Math.max(0, T + ih - y(d.a))} fill="#22c55e" rx="2"><title>{`${d.label} ${aName}: ${d.a}`}</title></rect>
            <rect x={L + i * gw + 3 + bw} y={y(d.b)} width={bw} height={Math.max(0, T + ih - y(d.b))} fill="#f59e0b" rx="2"><title>{`${d.label} ${bName}: ${d.b}`}</title></rect>
            <text x={L + i * gw + gw / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="#78716c">{d.label}</text>
          </g>
        ))}
      </svg>
      <div className="flex gap-4 text-sm mt-1">
        <span className="flex items-center gap-2"><i className="inline-block w-3 h-3 rounded-sm bg-green-500" />{aName}</span>
        <span className="flex items-center gap-2"><i className="inline-block w-3 h-3 rounded-sm bg-amber-500" />{bName}</span>
      </div>
    </div>
  );
}
