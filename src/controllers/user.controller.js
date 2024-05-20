import {asyncHandler} from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//Generate Access And Refresh Tokens
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateAccessToken()

        //Saving the refresh token in the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave:false })

        //Returning the access and refresh token after generating and saving
        return {accessToken, refreshToken};

        
    } catch (error) {
        throw new ApiError(500, "Something Went Wrong While Generating Refresh And Access Tokens")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    // res.status(200).json({
    //     message:"ok"
    // })

    //Get User Details From FrontEnd
    //Validation - Not Empty 
    //Check if user already exists: username, email
    //Check for images, check for avatar
    //Upload them to the cloudinary, check on the avatar in cloudinary
    //create user object: create entry in the DB
    //remove password and refresh token field from the response
    //check for user creation 
    //return response

//req.body we have all the details of the user
// {} this is being used for destructuring

    const {fullName, email, username, password} = req.body
    console.log("email: ", email);

    //Validation Part
    // if(fullName === ""){
    //     throw new ApiError(400,"FullName Is Required");
    // }

    //Validation ki alag sei file hoti create that for production level code


    if(
        [fullName,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All Fields Are Required");
    }

    const existedUser = await User.findOne({
        //Operators like checking if username or that email exists : advance hai
        $or:[{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    //We can go individually like checking seperately username and email

    //________MUlter things for file validation
    // req.files: it is given by multer isko console log karke dena
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(coverImageLocalPath && Array.isArray(req.files.coverImage) && req.files?.coverImage.length>0){
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }


    //Checking Avatar
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    //Upload on Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar is required");
    }

    //Store in the DB
    const user = await User.create({
        fullName: fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email: email,
        password: password,
        username: username.toLowerCase()
    })

    //checking if the user is successfully created or not
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" //Removing the data joh nahi chahiye badd mai response mai
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    //Sending the data
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )
} )

//Login The User
const loginUser = asyncHandler(async (req,res) => {
    //req.body --> data
    // take the username and email
    // finding the user that does it exist
    // if yes then check the password
    // if all set then generate access and refresh token
    // send it in secure cookie

    const {email, username, password} = req.body;

    console.log(password, + " " + email);
    if(!username && !email){
        throw new ApiError(400, "Username or Email is required");
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User Does not exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "User Password Does not match")
    }

    //Getting Access Tokens and Refresh Tokens
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //Sending The Cookies
    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User Logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Error");
    }

    try {
        //Verify Refresh Token
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token");
        }
    
        //Matching Refresh Tokens
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is Expired Or Used");
        }
    
        //Generating New Refresh Tokens
        const options = {
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newrefreshToken} = await generateAccessAndRefreshTokens(user._id);
        return res
        .status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", newrefreshToken)
        .json(
            new ApiResponse(200,{
                accessToken: accessToken,
                refreshToken: newrefreshToken,
                message: "Access Token Refreshed SuccessFully"
            })
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

export {registerUser, loginUser, logoutUser, refreshAccessToken}