import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    try {
        const {videoId} = req.params
        //TODO: toggle like on video
    
        if (!videoId) {
            throw new ApiError(400, "Video ID not found")
        }
    
        const userId = req.user._id
    
        const existingLike = await Like.findOne({ video: videoId, likedBy: userId });
    
        if (existingLike) {
            // Unlike: Remove the like document
            await Like.findByIdAndDelete(existingLike._id);
            
            return res
            .status(200)
            .json( new ApiResponse(200,existingLike , "unliked successfully" ));
        }
    
        // Like: Create a new like document
        const newLike = await Like.create({ video: videoId, likedBy: userId });
    
        return res
        .status(200)
        .json( new ApiResponse(200, newLike, "liked successfully"));
    
    } catch (error) {
        throw new ApiError(404, `error: ${error.message}`)
    }  
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    try {
        const {commentId} = req.params
        //TODO: toggle like on comment
        if (!commentId) {
            throw new ApiError(400, "Comment ID not found")
        }

        const userId = req.user._id

        if (!userId) {
            throw new ApiError(401, "user ID not found")
        }

        const existingLike = await Like.findOne({ comment: commentId, likedBy: userId });

        if (existingLike) {
             await Like.findByIdAndDelete(existingLike._id);

            return res
            .status(200)
            .json( new ApiResponse(200,existingLike , "unliked successfully" ));
        }

        const newLike = await Like.create({ comment: commentId, likedBy: userId})

        return res
        .status(200)
        .json( new ApiResponse(200, newLike, "liked successfully"));
   
    } catch (error) {
        throw new ApiError(404, `error: ${error.message}`)
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
try {
        const {tweetId} = req.params
        //TODO: toggle like on tweet
        if (!tweetId) {
            throw new ApiError(400, "Tweet ID not found")
        }
    
        const userId = req.user._id
        if (!userId) {
            throw new ApiError(400, "User ID not found")
        }
    
        const existingLike = await Like.findOne({tweet: tweetId, likedBy: userId})
    
        if (existingLike) {
           // Unlike: Remove the like document
           await Like.findByIdAndDelete(existingLike._id)
    
           return res
           .status(200)
           .json( new ApiResponse(200, existingLike, "unliked successfully" ));
        }
    
        const newLike = await Like.create({tweet: tweetId, likedBy: userId})
    
        return res
        .status(200)
        .json( new ApiResponse(200, newLike, "liked successfully"));
} catch (error) {
    throw new ApiError(400, `error: ${error.message}`) 
  }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user._id
    if (!userId) {
        throw new ApiError(402, "User ID not found")
    }

    const likedVideos = await Like.aggregate([
        {
            $group: {
                _id: "$video",
            }
        },
        {
            $match: {
                _id: {
                    $ne: null
                }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $unwind: "$videoDetails"                   // [{}, {}, {}] converts into  {}, {}, {}
        },
        {
            $sort: {
                "videoDetails.createdAt": -1
            }
        }
    ])
    // console.log("likedVideos: ", likedVideos);
    

    if (!likedVideos) {
        return res
        .status(200)
        .json( new ApiResponse(200, [], "no liked videos found") );
    }

    return res
    .status(200)
    .json( new ApiResponse(200, likedVideos, "liked videos found") );
    
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}