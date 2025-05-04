import mongoose, { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcrypt'

export interface IUser {
  name: string
  email: string
  password?: string
  googleId?: string
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
  comparePassword(pw: string): Promise<boolean>
}

export interface IUserModel extends Model<IUser & Document> {}

const userSchema = new Schema<IUser & Document>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      select: false
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

userSchema.pre<IUser & Document>('save', async function () {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10)
  }
})

userSchema.methods.comparePassword = async function (pw: string) {
  if (!this.password) return false
  return bcrypt.compare(pw, this.password)
}

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password
    delete ret.__v
    return ret
  }
})

export default mongoose.model<IUser & Document, IUserModel>('User', userSchema)
