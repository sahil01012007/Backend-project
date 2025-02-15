import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    if (!userId) {
        throw new ApiError(400, "User ID not found")
    }

    // const videos = await Video.find({ userId })

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
    console.log("allVideos: ", allVideos);
    

    if (!allVideos) {
        throw new ApiError(404, "Videos not found")
    }

    return res
    .status(200)
    .json( new ApiResponse(200, allVideos, "Videos fetched successfully") )

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if (!title) {
        throw new ApiError(400, "Title is required")
    }
    if (!description) {
        throw new ApiError(400, "Description is required")
    }

    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoFileLocalPath) {
        throw new ApiError(404, "Video file is required")
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(404, "Thumbnail file is required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(500, "Failed to upload video file")
    }
    if (!thumbnail) {
        throw new ApiError(500, "Failed to thumbnail file")
    }

    const publishAVideo = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user._id,
        duration: videoFile.duration
    })

    if (!publishAVideo) {
        throw new ApiError(500, "Video not published successfully")
    }

    return res
    .status(201)
    .json( new ApiResponse(201, publishAVideo, "Video published successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id
    if (!videoId) {
        throw new ApiError(401, "videoId not found")
    }
    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },  // ✅ Increments views by 1
        { new: true }  // Returns the updated document
    );

    if (!video) {
        throw new ApiError(400, "Video not found")
    }

    return res
    .status(200)
    .json( new ApiResponse(200, video || {}, "Video found successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!videoId) {
        throw new ApiError(402, "Video ID not found")
    }

    const { title, description } = req.body;
    if (!title || !description) {
        throw new ApiError(400, "All fields are required")
    }

    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(403, "thumbnail not found")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
        throw new ApiError(500, "Error occured while uploading thumbnail on cloudinary")
    }
    if (!thumbnail.url) {
        throw new ApiError(500, "Thumbnail not uploaded successfully")
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title,
                description: description,
                thumbnail: thumbnail.url
            }
        },
        { new: true}  
    )

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!videoId) {
        throw new ApiError(400, "Video ID not found")
    }
    const video = await Video.findByIdAndDelete(videoId)

    if (!video) {
        throw new ApiError(401, "Video not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video deleted successfully"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
       throw new ApiError(400, "Video ID not found")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "Video not found")
    }

    // Toggle the publish status
    video.isPublished = !video.isPublished;
    await video.save({validateBeforeSave: false});

    return res
    .status(200)
    .json( new ApiResponse(200, {isPublished: video.isPublished}, "Publish status toggled"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
