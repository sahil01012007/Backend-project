import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist
    if (!name || !description) {
        throw new ApiError(400, "All fields are required")
    }

    const playlistCreated = await Playlist.create({
        name,
        description,
        owner: req.user._id
    })
    if (!playlistCreated) {
        throw new ApiError(403, "Playlist not created successfully")
    }

    return res
    .status(201)
    .json( new ApiResponse(200, playlistCreated, "Playlist created successfully"))


})

const getUserPlaylists = asyncHandler(async (req, res) => {

    const {userId} = req.params
    //TODO: get user playlists
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Please enter valid user ID")
    }

    const userPlaylist = await Playlist.find({owner: userId})
    if (!userPlaylist) {
        throw new ApiError(404, "User playlists not found")
    }

    return res
    .status(200)
    .json( new ApiResponse(200, userPlaylist, "User playlists found successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if (!mongoose.isValidObjectId(playlistId)) {
       throw new ApiError(404, "Please enter a valid Playlist ID") 
    }
    
    const playlist = await Playlist.aggregate([
        
            {
               $match: {
                    _id: new mongoose.Types.ObjectId(playlistId)
               }  
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "video"
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
    ])

    if (!playlist) {
        throw new ApiError(400, "Playlist not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist found successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    //TODO: add video to playlist
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Please enter valid Playlist ID ")
    }
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Please enter valid Video ID");
    }

    const playlist = await Playlist.findById(playlistId)
    
    if (!playlist) {
        throw new ApiError(401, "Playlist not found")
    }

    if (!playlist.video.includes(videoId)) {
        playlist.video.push(videoId)
        await playlist.save({validateBeforeSave: false})
    }

    const updatedPlaylist = await Playlist.findById(playlistId).populate("video")            // The .populate("video") function in your updatedPlaylist query works because of Mongoose's population feature. It replaces the video field (which contains an array of ObjectIds) with the actual documents from the videos collection

    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Please enter valid playlist ID")
    }
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Please enter valid video ID")
    }

    const playlist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $pull: { video: videoId }
        },
        { new: true }
    )

    if (!playlist) {
        throw new ApiError(401, "Playlist not found")
    }

    const updatedPlaylist = await Playlist.aggregate([
        
        {
           $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
           }  
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video"
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
])
    if (!updatedPlaylist) {
        throw new ApiError(403, "Playlist not updated after removing video from it")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(440, "Please enter valid playlist id")
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Playlist not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist deleted successfully"))

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(440, "Please enter valid playlist id")
    }
    if (!name) {
        throw new ApiError(400, "Please enter valid name of the playlist")
    }
    if (!description) {
        throw new ApiError(400, "Please enter valid description of the playlist")
    }

    const playlist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $set: {
                name,
                description
            }
        },
        {
            new: true
        }
    )

    if (!playlist) {
        throw new ApiError(401, "Playlist not found")
    }

    const updatedPlaylist = await Playlist.aggregate([
        
        {
           $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
           }  
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video"
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
])
    if (!updatedPlaylist) {
        throw new ApiError(403, "Playlist not updated after updating its name and description")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))
})

    


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
