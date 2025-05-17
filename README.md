# YouTube Backend Project

This project is a complete backend solution built with Node.js, Express.js, MongoDB, and Mongoose. It includes features such as user authentication, video publishing, commenting, subscriptions, and more.

## Features

- User Registration and Authentication
- Video Upload and Management
- Commenting System
- User Profile Management
- Subscription System
- Token-based Authentication with JWT
- Cloudinary Integration for Media Storage
- Tweet-like functionality for user posts

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Cloudinary Account for media storage

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/AnirbanRoyy/YouTube-BackEnd your-repo
   cd your-repo
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**  
   Create a `.env` file in the root directory and add the following variables:

   ```bash
   PORT=8000
   MONGODB_URI=your_mongodb_uri
   ACCESS_TOKEN_SECRET=your_access_token_secret
   REFRESH_TOKEN_SECRET=your_refresh_token_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Run the server:**

   ```bash
   npm run dev
   ```

## API Endpoints

### User Routes

- **Register User**
  - `POST /api/v1/users/register`
  - Body:
    - `username`: String
    - `email`: String
    - `password`: String
    - `fullName`: String
    - `avatar`: File
    - `coverImage`: File (optional)

- **Login User**
  - `POST /api/v1/users/login`
  - Body:
    - `username` or `email`: String
    - `password`: String

- **Logout User**
  - `POST /api/v1/users/logout`
  - Requires: Authentication (send the `accessToken` as a cookie or authorization header)

- **Refresh Token**
  - `POST /api/v1/users/refresh-token`
  - Requires: `refreshToken` (send as a cookie or authorization header)

- **Change Password**
  - `POST /api/v1/users/change-password`
  - Requires: Authentication
  - Body:
    - `oldPassword`: String
    - `newPassword`: String

- **Get Current User**
  - `GET /api/v1/users/get-user`
  - Requires: Authentication

- **Update User Details**
  - `PATCH /api/v1/users/update-user-details`
  - Requires: Authentication
  - Body:
    - `email`: String (optional)
    - `fullName`: String (optional)

- **Update Avatar**
  - `PATCH /api/v1/users/update-avatar`
  - Requires: Authentication
  - Body:
    - `avatar`: File

- **Update Cover Image**
  - `PATCH /api/v1/users/update-coverImage`
  - Requires: Authentication
  - Body:
    - `coverImage`: File

- **Get User Channel Profile**
  - `POST /api/v1/users/get-user-channel-profile/:username`
  - Requires: Authentication

- **Get Watch History**
  - `GET /api/v1/users/get-watch-history`
  - Requires: Authentication

- **Add to Watch History**
  - `PATCH /api/v1/users/update-watch-history/:videoId`
  - Requires: Authentication

- **Get User Playlists**
  - `GET /api/v1/users/:userId/playlists`
  - Requires: Authentication

### Video Routes

- **Publish Video**
  - `POST /api/v1/videos/publish-video`
  - Requires: Authentication
  - Body:
    - `title`: String
    - `description`: String
    - `videoFile`: File
    - `thumbnail`: File

- **Get Video by ID**
  - `GET /api/v1/videos/get-video/:videoId`
  - Requires: Authentication

- **Get Self Videos**
  - `GET /api/v1/videos/get-self-videos`
  - Requires: Authentication

- **Get All Videos**
  - `GET /api/v1/videos/get-all-videos`

- **Update Video**
  - `PATCH /api/v1/videos/update-video/:videoId`
  - Requires: Authentication
  - Body:
    - `title`: String (optional)
    - `description`: String (optional)
    - `thumbnail`: File (optional)

- **Delete Video**
  - `POST /api/v1/videos/delete-video/:videoId`
  - Requires: Authentication

- **Toggle Publish Video**
  - `PATCH /api/v1/videos/toggle-publish/:videoId`
  - Requires: Authentication

### Comment Routes

- **Get Video Comments**
  - `GET /api/v1/comments/get-all-comments/:videoId`
  - Query Parameters:
    - `page`: Number (optional)
    - `limit`: Number (optional)

- **Add Comment**
  - `POST /api/v1/comments/add-comment/:videoId`
  - Requires: Authentication
  - Body:
    - `content`: String

- **Update Comment**
  - `PATCH /api/v1/comments/update-comment/:commentId`
  - Requires: Authentication
  - Body:
    - `content`: String

- **Delete Comment**
  - `POST /api/v1/comments/delete-comment/:commentId`
  - Requires: Authentication

### Tweet Routes

- **Create Tweet**
  - `POST /api/v1/tweets/add-tweet`
  - Requires: Authentication
  - Body:
    - `content`: String

- **Get User Tweets**
  - `GET /api/v1/tweets/get-all-tweets/:userId`
  - Query Parameters:
    - `page`: Number (optional)
    - `limit`: Number (optional)

- **Update Tweet**
  - `PATCH /api/v1/tweets/update-tweet/:tweetId`
  - Requires: Authentication
  - Body:
    - `content`: String

- **Delete Tweet**
  - `POST /api/v1/tweets/delete-tweet/:tweetId`
  - Requires: Authentication

### Subscription Routes

- **Toggle Subscription**
  - `PATCH /api/v1/subscriptions/toggle-subscription/:channelId`
  - Requires: Authentication

- **Get Channel Subscribers**
  - `GET /api/v1/subscriptions/get-channel-subscribers/:channelId`

- **Get Subscribed Channels**
  - `GET /api/v1/subscriptions/get-subscribed-channels`
  - Requires: Authentication

### Playlist Routes

- **Create Playlist**
  - `POST /api/v1/playlists/`
  - Requires: Authentication
  - Body:
    - `name`: String (required)
    - `description`: String (optional)
    - `video`: Array of video IDs (required, at least one)

- **Get Playlist by ID**
  - `GET /api/v1/playlists/:playlistId`
  - Requires: Authentication

- **Update Playlist**
  - `PATCH /api/v1/playlists/:playlistId`
  - Requires: Authentication
  - Body:
    - `name`: String (optional)
    - `description`: String (optional)
    - `video`: Array of video IDs (optional)

- **Delete Playlist**
  - `DELETE /api/v1/playlists/:playlistId`
  - Requires: Authentication

#### Example Create Playlist Request Body
```json
{
  "name": "My Playlist",
  "description": "A collection of my favorite videos",
  "video": ["<videoId1>", "<videoId2>"],
  "owner": "<ownerId>"
}
```

## Middleware

- **Authentication Middleware**
  - `verifyJWT` is used to protect routes that require authentication.

- **File Upload Middleware**
  - `multer` is used for handling multipart/form-data for file uploads.

## Utilities

- **Error Handling**
  - Custom `ApiError` class for handling errors.

- **Response Handling**
  - `ApiResponse` class for consistent API responses.

- **Cloudinary Integration**
  - Functions for uploading and deleting media files.

## Acknowledgments

Credit goes to [Hitesh Choudhary](https://www.youtube.com/@chaiaurcode) for inspiration and guidance.

