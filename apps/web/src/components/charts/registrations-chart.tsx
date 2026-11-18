"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function RegistrationsChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="regFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e2d8" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={8} minTickGap={24} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
        <Tooltip />
        <Area type="monotone" dataKey="count" name="Registrations" stroke="#0f766e" fill="url(#regFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
