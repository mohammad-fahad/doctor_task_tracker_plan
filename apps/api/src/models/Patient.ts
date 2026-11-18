import mongoose, { Schema, type InferSchemaType } from "mongoose";

const patientSchema = new Schema(
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

export type PatientDocument = InferSchemaType<typeof patientSchema> & { _id: mongoose.Types.ObjectId };
export const Patient = mongoose.models.Patient || mongoose.model("Patient", patientSchema);
