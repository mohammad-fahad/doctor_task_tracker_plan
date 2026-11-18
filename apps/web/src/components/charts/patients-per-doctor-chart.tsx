"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function PatientsPerDoctorChart({ data }: { data: { doctorId: string; doctorName: string; patientCount: number }[] }) {
  const chartData = data.map((d) => ({ name: d.doctorName.replace(/^Dr\.\s*/i, ""), patients: d.patientCount }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e2d8" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="patients" name="Patients" fill="#134e4a" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
