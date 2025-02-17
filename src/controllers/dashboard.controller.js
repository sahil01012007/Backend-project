import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const userId = req.user._id
    if (!userId) {
        throw new ApiError(400, "user ID not found")
    }

    const userChannelSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: userId,
            }
        },
        {
            $count: "subscriberCount"
        }
    ])


    const allVideos = await Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
                    isPublished: true
                }
    
            },
            {
                $sort: {
                    createdAt: -1
                }  
            },
        ])


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
    
    const TotalSubscribers = userChannelSubscribers.length
    const TotalVideos = allVideos.length
    const TotalViews = allVideos.reduce((y, x) =>  y + x.views , 0)  // y is the accumulator and x holds the first value of the array and 0 is the initial value of the accumulator
    const TotalLikes = likedVideos.length

    return res
    .status(200)
    .json(new ApiResponse(200,{TotalSubscribers, TotalVideos,TotalViews, TotalLikes}, "subs count" ))
 
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const userId = req.user._id;

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const allVideos = await Video.aggregate([
        {
            $match: {
                owner: userId,
                isPublished: true
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                views: 1,
                duration: 1,
                title: 1,
                description: 1,
                isPublished: 1,
                owner: 1
            }
        }
    ])
    

    if (allVideos == "") {
        return res
        .status(200)
        json( new ApiResponse(200, "User has no videos", "User has no videos"))
    }

    return res
    .status(200)
    .json( new ApiResponse(200, allVideos, "User has no videos"))

})

export {
    getChannelStats, 
    getChannelVideos
    }