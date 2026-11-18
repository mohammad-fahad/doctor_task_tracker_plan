import mongoose, { Schema, type InferSchemaType } from "mongoose";

const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    hospital: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    nameNormalized: { type: String, required: true, index: true },
    specializationNormalized: { type: String, required: true, index: true },
    hospitalNormalized: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

doctorSchema.index({ createdAt: -1 });
doctorSchema.index({ specializationNormalized: 1, hospitalNormalized: 1, createdAt: -1 });

export type DoctorDocument = InferSchemaType<typeof doctorSchema> & { _id: mongoose.Types.ObjectId };
export const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);
