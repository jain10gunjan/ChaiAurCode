import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true // For making the field searchable in a optimised way.
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    avatar: {
        type: String, // Cloudinary Url We will going to be using.
        required: true
    },

    coverImage: {
        type: String, //Cloudinary URL
    },

    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],

    password: {
        type: String,
        required: [true, 'Password is required'] // Can give custom message
    },

    refreshToken: {
        type: String
    }



}, { timestamps: true })

userSchema.pre("save", async function (next){

    // This if condition helps that ki password barr barr encrypt na jab change ho tab hi encrypt ho.

    if(!this.isModified("password")){
        return next()
    }
    this.password = bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = async function(){
  return jwt.sign({
        _id:this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    },
process.env.ACCESS_TOKEN_SECRET,
{
    expiresIn:process.env.ACCESS_TOKEN_EXPIRY
}
)
}

userSchema.methods.generateRefreshToken = async function(){
    return jwt.sign({
        _id:this._id
    },
process.env.REFRESH_TOKEN_SECRET,
{
    expiresIn:process.env.REFRESH_TOKEN_EXPIRY
})
}

export const User = mongoose.models("User", userSchema);