import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!videoId) {
        throw new ApiError(400, "Video ID is required")
    }

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId) 
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                video: 1,
                owner: 1,
            }
        }
    ])

    if (!comments) {
        throw new ApiError(401, "No comments found")
    }

    return res
    .status(200)
    .json (new ApiResponse(200, comments, "Comments retrieved successfully"))

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params;
    const {content} = req.body;

    if (!videoId) {
        throw new ApiError(400, "Video ID not found");
    }
    if (!content) {
        throw new ApiError(401, "content not found");
    }
    if (!req.user._id) {
        throw new ApiError(401, "User not found");
    }

    const addComment = await Comment.create({
        content: content,
        video: videoId,
        owner: req.user._id
    })

    if (!addComment) {
        throw new ApiError(401, "Comment not added");
    }

    return res
    .status(200)
    .json ( new ApiResponse(200, addComment, "Comment added successfully" ))

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params;
    const {content} = req.body;

    if (!content) {
        throw new ApiError(401, "content not found");
    }
    if (!commentId) {
        throw new ApiError(400, "Comment ID not found");
    }

    const comment = await Comment.findByIdAndUpdate(commentId,
       {
        $set: {
            content: content
        }
       },
       {
        new: true
       }
    )

    if (!comment) {
        throw new ApiError(500, "Comment not found");
    }

    return res
    .status(200)
    .json( new ApiResponse(200, comment, "Comment updated successfully") )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params;

    if (!commentId) {
        throw new ApiError(400, "Comment ID not found");
    }

    const comment = await Comment.findByIdAndDelete(commentId);

    if (!comment) {
        throw new ApiError(500, "Comment not deleted due to some internal issue")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
