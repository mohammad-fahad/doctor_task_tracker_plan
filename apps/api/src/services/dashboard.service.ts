import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { parseDateRange } from "../utils/dateRange.js";

export async function getDashboardSummary(from?: string, to?: string) {
  const range = parseDateRange(from, to);
  const createdAtMatch = range ? { createdAt: range } : undefined;

  const [totalDoctors, totalPatients, newPatientsInPeriod, patientsPerDoctor, registrationsOverTime] = await Promise.all([
    Doctor.countDocuments({}),
    Patient.countDocuments({}),
    Patient.countDocuments(createdAtMatch ? { createdAt: range } : {}),
    Patient.aggregate([
      ...(createdAtMatch ? [{ $match: { createdAt: range } }] : []),
      { $group: { _id: "$doctorId", patientCount: { $sum: 1 } } },
      { $sort: { patientCount: -1, _id: 1 } },
      { $limit: 10 },
      { $lookup: { from: "doctors", localField: "_id", foreignField: "_id", as: "doctor" } },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          doctorId: { $toString: "$_id" },
          doctorName: { $ifNull: ["$doctor.name", "Unknown Doctor"] },
          patientCount: 1,
        },
      },
    ]),
    Patient.aggregate([
      ...(createdAtMatch ? [{ $match: { createdAt: range } }] : []),
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ]),
  ]);

  // include doctors with zero patients in chart context when no range filter? better to include top/active only to keep chart meaningful.
  // We'll also return all-time per-doctor counts separately not necessary; requirement states "Patients per doctor" chart.
  // For a complete view with zero-patient doctors when unfiltered small dataset, augment lightly with doctor list if needed.
  let perDoctor = patientsPerDoctor as Array<{ doctorId: string; doctorName: string; patientCount: number }>;
  if (!createdAtMatch) {
    const allDoctors = await Doctor.find({}, { name: 1 }).sort({ name: 1 }).lean();
    const countMap = new Map(perDoctor.map((d) => [d.doctorId, d.patientCount]));
    perDoctor = allDoctors.map((d) => ({
      doctorId: String(d._id),
      doctorName: d.name,
      patientCount: countMap.get(String(d._id)) || 0,
    })).sort((a,b) => b.patientCount - a.patientCount || a.doctorName.localeCompare(b.doctorName)).slice(0, 12);
  }

  return {
    totals: {
      totalDoctors,
      totalPatients,
    },
    period: {
      from: from || null,
      to: to || null,
      newPatients: newPatientsInPeriod,
    },
    patientsPerDoctor: perDoctor,
    registrationsOverTime,
  };
}
