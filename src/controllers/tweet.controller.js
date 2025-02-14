import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    console.log(req.user);
    
    const tweetContent = req.body.content
    
    if (!tweetContent) {
        throw new ApiError(400, "tweetContent is required");
    }

    const createdTweet = await Tweet.create({
        content: tweetContent,
        owner: req.user._id
    })
    console.log("tweet created successfully");
    
    if (!createdTweet) {
        throw new ApiError(404, "Something went wrong while creating the tweet");
    }
    
    
    return res
    .status(200)
    .json(new ApiResponse(200, createdTweet, "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const { userId } = req.params;

    const tweets = await Tweet.find({owner: userId});         // const tweets = await Tweet.findById(userId);     every schema has its own unique id, userId is the user's ID, but tweets are stored with a different _id
    // console.log("tweet: ", tweets);
    
    const ownerTweets = tweets.map(tweet => `${tweet.content}  tweeted on ${tweet.createdAt.toLocaleString("en-IN", {
       year: "numeric",
       month: "short",
       day: "2-digit",
       hour: "2-digit",
       minute: "2-digit",
       second: "2-digit",
       hour12: false
    })}`);
    
    return res
    .status(200)
    .json(
        new ApiResponse(201, ownerTweets , "User tweets retrieved successfully")
    )

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { content } = req.body;
    const { tweetId } = req.params;
    console.log("tweetId:", tweetId);
    

    if (!content) {
        throw new ApiError(401, "Please enter content to update the tweet");
    }
    if (!tweetId) {
        throw new ApiError(401, "Please enter valid tweetId to update the tweet");
    }

    const tweet = await Tweet.findByIdAndUpdate(tweetId, 
        {
            $set:{
                content: content
            }
        },
        {new: true});

        return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet updated successfully  "))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const { tweetId } = req.params;

    if (!tweetId) {
        throw new ApiError(401, "Please enter valid tweetId to update the tweet");
    }

    const tweet = await Tweet.findByIdAndDelete(tweetId);

    return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}