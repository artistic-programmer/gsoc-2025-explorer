import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { Empty, tooltipStyle, useColors } from './ui';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Horizontal bar chart. Clicking a bar calls onSelect(key); selected bars are emphasised. */
export function HBar({
  data,
  onSelect,
  selected = [],
  valueLabel = 'Organizations',
  maxLabel = 24,
}: {
  data: BarDatum[];
  onSelect?: (key: string) => void;
  selected?: string[];
  valueLabel?: string;
  maxLabel?: number;
}) {
  const c = useColors();
  if (!data.length) return <Empty>No data for the current filters.</Empty>;
  const longest = Math.min(maxLabel, Math.max(...data.map((d) => d.label.length)));
  const width = Math.max(70, Math.round(longest * 6.4) + 8);
  const hasSel = selected.length > 0;
  return (
    <div style={{ height: data.length * 24 + 24 }} className="text-slate-500 dark:text-slate-400">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }} barCategoryGap={4}>
          <CartesianGrid horizontal={false} stroke={c.grid} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: c.axis }} stroke={c.grid} />
          <YAxis type="category" dataKey="label" width={width} interval={0} tick={{ fill: c.axis }} tickFormatter={(v: string) => clip(v, maxLabel)} stroke={c.grid} />
          <Tooltip cursor={{ fill: c.grid, opacity: 0.5 }} contentStyle={tooltipStyle} formatter={(v: number) => [v, valueLabel]} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} cursor={onSelect ? 'pointer' : undefined} onClick={(d: BarDatum) => onSelect?.(d.key)} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={!hasSel || selected.includes(d.key) ? c.accent : c.soft} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VBar({ data, onSelect, selected = [], valueLabel = 'Organizations' }: { data: BarDatum[]; onSelect?: (key: string) => void; selected?: string[]; valueLabel?: string }) {
  const c = useColors();
  if (!data.length) return <Empty>No data for the current filters.</Empty>;
  const hasSel = selected.length > 0;
  return (
    <div className="h-64 text-slate-500">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey="label" interval={0} angle={-30} textAnchor="end" height={70} tick={{ fill: c.axis }} tickFormatter={(v: string) => clip(v, 18)} stroke={c.grid} />
          <YAxis allowDecimals={false} tick={{ fill: c.axis }} stroke={c.grid} />
          <Tooltip cursor={{ fill: c.grid, opacity: 0.5 }} contentStyle={tooltipStyle} formatter={(v: number) => [v, valueLabel]} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} cursor={onSelect ? 'pointer' : undefined} onClick={(d: BarDatum) => onSelect?.(d.key)} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={!hasSel || selected.includes(d.key) ? c.accent : c.soft} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, onSelect, selected = [] }: { data: BarDatum[]; onSelect?: (key: string) => void; selected?: string[] }) {
  const c = useColors();
  if (!data.length) return <Empty>No data for the current filters.</Empty>;
  const hasSel = selected.length > 0;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="52%" outerRadius="82%" paddingAngle={1} isAnimationActive={false} onClick={(d: BarDatum) => onSelect?.(d.key)} cursor={onSelect ? 'pointer' : undefined}>
            {data.map((d, i) => (
              <Cell key={d.key} fill={c.palette[i % c.palette.length]} fillOpacity={!hasSel || selected.includes(d.key) ? 1 : 0.35} stroke="none" />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [v, n]} />
          <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedBar({
  rows,
  seriesKeys,
  seriesLabels,
  xKey = 'label',
  height = 300,
}: {
  rows: Record<string, string | number>[];
  seriesKeys: string[];
  seriesLabels: Record<string, string>;
  xKey?: string;
  height?: number;
}) {
  const c = useColors();
  if (!rows.length || !seriesKeys.length) return <Empty>Nothing to compare for the current filters.</Empty>;
  return (
    <div style={{ height }} className="text-slate-500">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey={xKey} interval={0} angle={-30} textAnchor="end" height={70} tick={{ fill: c.axis }} tickFormatter={(v: string) => clip(v, 18)} stroke={c.grid} />
          <YAxis allowDecimals={false} tick={{ fill: c.axis }} stroke={c.grid} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: c.grid, opacity: 0.5 }} />
          <Legend verticalAlign="top" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          {seriesKeys.map((k, i) => (
            <Bar key={k} dataKey={k} name={seriesLabels[k] ?? k} stackId="a" fill={c.palette[i % c.palette.length]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function XYScatter({ data, xName, yName }: { data: { x: number; y: number; z: number; names?: string }[]; xName: string; yName: string }) {
  const c = useColors();
  if (!data.length) return <Empty>No data for the current filters.</Empty>;
  return (
    <div className="h-64 text-slate-500">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ left: 0, right: 16, top: 8, bottom: 16 }}>
          <CartesianGrid stroke={c.grid} />
          <XAxis type="number" dataKey="x" name={xName} allowDecimals={false} tick={{ fill: c.axis }} stroke={c.grid} label={{ value: xName, position: 'insideBottom', offset: -8, fill: c.axis, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={yName} allowDecimals={false} tick={{ fill: c.axis }} stroke={c.grid} label={{ value: yName, angle: -90, position: 'insideLeft', fill: c.axis, fontSize: 11 }} />
          <ZAxis type="number" dataKey="z" range={[40, 400]} name="Organizations" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
          <Scatter data={data} fill={c.accent} fillOpacity={0.6} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
