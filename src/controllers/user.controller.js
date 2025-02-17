import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from  "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {v2 as cloudinary} from "cloudinary";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async(userId) => {
   try {
      const user = await User.findById(userId);
      const accessToken = await user.generateAccessToken();
      const refreshToken = await user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({validateBeforeSave: false})      // mongoose ke model kick in ho jayenge jab bhi save krane lagenge isilye bracket me ek aur parameter pass krna pada validateBeforeSave vala

      return {accessToken, refreshToken}
   } catch (error) {
      throw new ApiError(500, "Something went wrong while generating refresh and access token")
   }
   
}

const registerUser = asyncHandler( async (req, res) => {


     // get user details from frontend
     // validation - not empty
     // check if user already exists: username, email
     //check for images, check for avatar
     // upload them to cloudinary, avatar
     // create user object - create entry in db
     // remove password and refresh token field from response
     // check for user creation
     // return res
     
     
     const {fullName, email, username, password} = req.body
     console.log("req.body", req.body);
     

     if (
        [fullName, email, username, password].some((field) =>
            field?.trim() === "")
     ) {
        throw new ApiError(400, "Please fill in all fields");
     } 
     
     const existedUser = await User.findOne({
        $or: [{ username }, { email }],
     });
     console.log(existedUser);
     
     if (existedUser) {
        throw new ApiError(400, "username or email already exists");
     };
     

     const avatarLocalPath = req.files?.avatar[0]?.path;                  // req.files is used to handle uploaded files
   //   const coverImageLocalPath = req.files?.coverImage[0]?.path;
     let coverImageLocalPath;
     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
       {
      coverImageLocalPath = req.files.coverImage[0].path;
     }

     

     if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath);
     const coverImage = await uploadOnCloudinary(coverImageLocalPath);


     if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
     }

     const user = await User.create ({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
     });
     console.log("User created successfully !!");
     

     const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
     )

     if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
     }

     return res.status(201).json(
        new ApiResponse (200, createdUser, "User registered Successfully")
     )
     
});

const loginUser = asyncHandler(async (req, res) => {
    
   // req.body  --> data
   // find user by  username or email
   // check for password
   // accessToken and refreshToken
   // send cookie

   const {email, username, password} = req.body;
   console.log("req.body: ", req.body);
   

   if (!username && !email) {
      throw new ApiError(400, "Email or username is required")
   }

   const user = await User.findOne({
      $or: [{email}, {username}],
   })

   if (!user) {
      throw new ApiError(404 , "User not found")
   }

   const isPasswordValid = await user.isPasswordCorrect(password);

   if (!isPasswordValid) {
      throw new ApiError(401, "password is incorrect")
   }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(               // console.log(user)
      "-password -refreshToken"
    )
    console.log(user);
    

    const options = {
      httpOnly: true,
      secure: true
    }
    

   return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
         200,
         {
            user: loggedInUser, accessToken, refreshToken
         },
         "User logged in successfully"
      )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: null    // undefined also can be used here
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
    .json(new ApiResponse(200, {},"User looged Out"))
})

const refreshAccessToken = asyncHandler(async(req, res) =>
   {
   const incomingRefreshToken = req.cookies.
   refreshToken || req.body.refreshToken

   if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request")
   }

   try {
      const decodedToken =  jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
      )
   
      const user = await User.findById(decodedToken?._id)
   
      if (!user) {
         throw new ApiError(401, "Invalid refresh token")
      }
   
      if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "Refresh token is expired or used")
      }
   
      const options = {
         httpOnly: true,
         secure: true
      }
   
      const {accessToken , newRefreshToken} = await
      generateAccessAndRefreshToken(user._id)
   
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
         new ApiResponse(
            200,
            {accessToken, refreshToken: newRefreshToken},
            "Access token refreshed"
         )
      )
   } catch (error) {
      throw new ApiError(401, error?.message || 
         "Invalid refresh token"
      )
   }
})

const changeCurrentPassword = asyncHandler(async(req, res) =>
 {
   const {oldPassword, newPassword} = req.body
   console.log("req.body: ", req.body);

   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid old password")
   }

   user.password = newPassword
   await user.save({validateBeforeSave: false})

   return res
   .status(200)
   .json(new ApiResponse(200, {}, "Password changed successfully"))
   
 })

const getCurrentUser = asyncHandler(async(req, res) => {
   return res
   .status(200)
   .json( new ApiResponse (200, req.user, "current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req, res) => {                                   
   const {fullName, email} = req.body
   

   if (!fullName || !email) {
      throw new ApiError(400, "All fields are required")
   }
   console.log("req.user._id: ",req.user._id );
   

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            fullName: fullName,
            email: email
         }
      },
      {new: true}
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200, user, "Account details updated successfully    "))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
   const avatarLocalPath = req.file?.path;

   if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is missing")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);

   if (!avatar.url) {
      throw new ApiError(400, "Error while uploading on avatar")
   }

   const user = await User.findById(req.user?._id);
   console.log(req.user?._id);
   

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Extract the public_id from the old avatar URL (if exists)
    if (user.avatar) {
        const oldAvatarPublicId = user.avatar.split('/').pop().split('.')[0]; // Extract public_id
        await cloudinary.uploader.destroy(oldAvatarPublicId);                // Delete old avatar from Cloudinary
    }

    user.avatar = avatar.url;
    await user.save({validateBeforeSave: false})           // No, you cannot use await user.select("-password")  because .select() only works on queries, not on Mongoose documents.
    const updatedUser = await User.findById(user?._id).select("-password");


   return res
   .status(200)
   .json(
      new ApiResponse(200, user, "Avatar updated successfully")
   )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
   const coverImageLocalPath = req.file?.path;

   if (!coverImageLocalPath) {
      throw new ApiError(400, "coverImage file is missing")
   }

   const coverImage = await uploadOnCloudinary(coverImageLocalPath);

   if (!coverImage.url) {
      throw new ApiError(400, "Error while uploading on coverImage")
   }

   const user =  await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            coverImage: coverImage.url
         }
      },
      {new: true}
   ).select("-password")

   return res
   .status(200)
   .json(
      new ApiResponse(200, user, "Cover image updated successfully")
   )
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
   const {username} = req.params;
   console.log(req.params);
   

   if (!username?.trim()) {
      throw new ApiError(400, "username is missing")
   }

   const channel = await User.aggregate([
      {
         $match: {               // filter documents based on specified conditions
            username: username?.toLowerCase()
         }
      },
      {
         $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
         }
      },
      {
         $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
         }
      },
      {
         $addFields: {
            subscribersCount: {
               $size: "$subscribers"
            },
            subscribedToCount: {
               $size: "$subscribedTo"
            },
            isSubscribed: {
               $cond: {
                  if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                  then: true,
                  else: false
               }
            }
         }
      },
      {
         $project: {
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            subscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1
         }
      }
   ])
   console.log("channel: ", channel);

   if (!channel?.length) {
      throw ApiError(404, "channel does not exist")
   }
   console.log("channel: ", channel);
   

   return res
   .status(200)
   .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
   )
})

const getWatchHistory = asyncHandler(async(req, res) => {
   const user = await User.aggregate([
      {
         $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)
         }
      },
      {
         $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: [
               {
                  $lookup: {
                     from: "users",
                     localField: "owner",
                     foreignField: "_id",
                     as: "owner",
                     pipeline: [
                        {
                           $project: {
                              fullName: 1,
                              username: 1,
                              avatar: 1
                           }
                        }
                     ]
                  }
               },
               {
                  $addFields: {
                     owner: {
                        $first: "$owner"
                     }
                  }
               }
            ]
         }
      }
   ])

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         user[0].watchHistory,
         "Watch history retrieved successfully",
      )
   )
})

export { registerUser,
         loginUser,
         logoutUser,
         refreshAccessToken,
         changeCurrentPassword,
         getCurrentUser,
         updateAccountDetails,
         updateUserAvatar,
         updateUserCoverImage,
         getUserChannelProfile,
         getWatchHistory
 }

