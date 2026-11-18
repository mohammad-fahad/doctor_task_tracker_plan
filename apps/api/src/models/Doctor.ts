import mongoose, { Schema, model, type Model, type HydratedDocument } from "mongoose";

export interface IDoctor {
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  nameNormalized: string;
  specializationNormalized: string;
  hospitalNormalized: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DoctorDocument = HydratedDocument<IDoctor>;

const doctorSchema = new Schema<IDoctor>(
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

export const Doctor: Model<IDoctor> = (mongoose.models.Doctor as Model<IDoctor>) || model<IDoctor>("Doctor", doctorSchema);

