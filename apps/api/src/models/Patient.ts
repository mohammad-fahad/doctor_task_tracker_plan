import mongoose, { Schema, model, type Model, type HydratedDocument, type Types } from "mongoose";

export interface IPatient {
  name: string;
  doctorId: Types.ObjectId;
  age: number;
  gender: "male" | "female" | "other";
  condition: string;
  phone: string;
  email?: string;
  nameNormalized: string;
  phoneNormalized: string;
  emailNormalized?: string;
  conditionNormalized: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PatientDocument = HydratedDocument<IPatient>;

const patientSchema = new Schema<IPatient>(
  {
    name: { type: String, required: true, trim: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    age: { type: Number, required: true, min: 0, max: 130 },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    condition: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    nameNormalized: { type: String, required: true },
    phoneNormalized: { type: String, required: true },
    emailNormalized: { type: String },
    conditionNormalized: { type: String, required: true },
  },
  { timestamps: true }
);

patientSchema.index({ doctorId: 1, createdAt: -1 });
patientSchema.index({ conditionNormalized: 1, createdAt: -1 });
patientSchema.index({ nameNormalized: 1 });
patientSchema.index({ phoneNormalized: 1 });
patientSchema.index({ emailNormalized: 1 });
patientSchema.index({ createdAt: -1 });

export const Patient: Model<IPatient> = (mongoose.models.Patient as Model<IPatient>) || model<IPatient>("Patient", patientSchema);

