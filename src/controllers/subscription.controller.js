import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription
    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Please enter valid channel ID")
    }

    const userId = req.user._id;
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "User not found")
    }

    const existingSubscriber = await Subscription.findOne({subscriber: userId, channel: channelId})

    if (existingSubscriber) {
        await Subscription.findByIdAndDelete(existingSubscriber._id)

        return res
        .status(200)
        .json ( new ApiResponse(200, null, "Channel unsubscribed successfully"))
    }

    const newSubscriber = await Subscription.create({subscriber: userId, channel: channelId})

    return res
    .status(200)
    .json ( new ApiResponse(200, newSubscriber, "Channel subscribed successfully"))



})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    console.log(subscriberId);
    
    if (!mongoose.isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Please enter valid channel Id")
    }
    

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
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberInfo"
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
        
    ])

    // The below commented code i use to delete some extra documents which was coming along the main document


    // const orphanedSubscriptions = await Subscription.aggregate([
    //     {
    //         $lookup: {
    //             from: "users",
    //             localField: "subscriber",
    //             foreignField: "_id",
    //             as: "subscriberInfo"
    //         }
    //     },
    //     {
    //         $match: {
    //             subscriberInfo: { $eq: [] } // Find subscriptions with no matching user
    //         }
    //     },
    //     {
    //         $project: {
    //             _id: 1, // Include the subscription ID for deletion
    //             subscriber: 1,
    //             channel: 1
    //         }
    //     }
    // ]);
    
    // console.log("Orphaned Subscriptions:", orphanedSubscriptions);

    // if (orphanedSubscriptions.length > 0) {
    //     const orphanedIds = orphanedSubscriptions.map(sub => sub._id);
        
    //     await Subscription.deleteMany({ _id: { $in: orphanedIds } });
    //     console.log(`Deleted ${orphanedIds.length} orphaned subscriptions.`);
    // } else {
    //     console.log("No orphaned subscriptions found.");
    // }


    return res
    .status(200)
    .json ( new ApiResponse(200, userChannelSubscribers, "User channel subscribers list"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, " Please enter valid channelId")
    }
    const userId = req.user._id
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, " Please enter valid userId")
    }

    const getUserSubscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: userId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "userSubscribedTo"
            }
        }
    ])
    

    if (getUserSubscribedChannels == "") {
        return res
        .status(200)
        .json( new ApiResponse(200,  "User hasn't suscribed to anyone", "User subscribed channels list is empty"))
    } 

    return res
    .status(200)
    .json( new ApiResponse(200, getUserSubscribedChannels, "User subscribed channels list"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}