# YouTube Backend Project

This project is a complete backend solution built with Node.js, Express.js, MongoDB, and Mongoose. It includes features such as user authentication, video publishing, commenting, and more.

## Features

- User Registration and Authentication
- Video Upload and Management
- Commenting System
- User Profile Management
- Subscription System
- Token-based Authentication with JWT
- Cloudinary Integration for Media Storage

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Cloudinary Account for media storage

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/AnirbanRoyy/YouTube-BackEnd your-repo
   cd your-repo

2. **Install dependencies:**

   ```bash
   npm install

3. **Set up environment variables:** 
`Create a .env file in the root directory and add the following variables:`

   ```bash
    PORT=3000
    MONGODB_URI=your_mongodb_uri
    ACCESS_TOKEN_SECRET=your_access_token_secret
    REFRESH_TOKEN_SECRET=your_refresh_token_secret
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret

## API Endpoints

### User Routes

- **Register User**
  - `POST /api/v1/users/register`
  - Body: 
    - `username`: String (make sure to send the username without any spaces. If you want to include spaces, use some other characters)
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
  - Requires: Authentication (send the accessToken as a cookie or as an authorization header)

- **Refresh Token**
  - `POST /api/v1/users/refresh-token`
  - Requires: `refreshToken` (send the refreshToken as a cookie or as an authorization header)

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

### Video Routes

- **Publish Video**
  - `POST /api/v1/videos/publish-video`
  - Requires: Authentication
  - Body: 
    - `title`: String
    - `description`: String
    - `videoFile`: File
    - `thumbnail`: File

### Comment Routes

- **Get Video Comments**
  - `GET /api/v1/comments/:videoId`
  - Query Parameters: 
    - `page`: Number (optional)
    - `limit`: Number (optional)
  - When a comment is fetched, attach the `_id` of each comment to the `div` element as `id`, so that you can request the particular comment using the comment `_id` later.

- **Add Comment**
  - `POST /api/v1/comments/add-comment/:videoId`
  - Requires: Authentication
  - Body:
    - `content`: String

- **Update Comment**
  - `POST /api/v1/comments/update-comment/:commentId`
  - Requires: Authentication
  - Body:
    - `content`: String

- **Delete Comment**
  - `POST /api/v1/comments/delete-comment/:commentId`
  - Requires: Authentication

### Tweet Routes

- **Create Tweet**
    - `POST /api/v1/tweets/create-tweet`
    - Requires: Authentication
    - Body: 
        - `content`: String 
- **Get User Tweets**
    - `GET /api/v1/tweets/:userId`
    - Query Parameters:
        - `page`: Number (for pagination, optional)
        - `limit`: Number (results per page, optional) 
- **Update Tweet**
    - `PATCH /api/v1/tweets/:tweetId`
    - Requires: Authentication
    - Body:
        - `content`: String (the updated content of the tweet)


## Middleware

- **Authentication Middleware**
  - `verifyJWT` is used to protect routes that require authentication

- **File Upload Middleware**
  - `multer` is used for handling multipart/form-data for file uploads

## Utilities

- **Error Handling**
  - Custom `ApiError` class for handling errors

- **Response Handling**
  - `ApiResponse` class for consistent API responses

- **Cloudinary Integration**
  - Functions for uploading and deleting media files

## Acknowledgments

Credit goes to [Hitesh Choudhary](https://www.youtube.com/@chaiaurcode) for inspiration and guidance.

