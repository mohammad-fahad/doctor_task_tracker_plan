import mongoose, { Schema, model, type Model, type HydratedDocument } from "mongoose";

export interface IUser {
  email: string;
  passwordHash: string;
  role: "admin";
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin", required: true },
  },
  { timestamps: true }
);

export const User: Model<IUser> = (mongoose.models.User as Model<IUser>) || model<IUser>("User", userSchema);

