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
   git clone https://github.com/yourusername/your-repo.git
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
  - Body: `username`, `email`, `password`, `fullName`, `avatar` (file), `coverImage` (file)

- **Login User**
  - `POST /api/v1/users/login`
  - Body: `username/email`, `password`

- **Logout User**
  - `POST /api/v1/users/logout`
  - Requires: Authentication

- **Refresh Token**
  - `POST /api/v1/users/refresh-token`

- **Change Password**
  - `POST /api/v1/users/change-password`
  - Requires: Authentication
  - Body: `oldPassword`, `newPassword`

- **Get Current User**
  - `GET /api/v1/users/get-user`
  - Requires: Authentication

- **Update User Details**
  - `PATCH /api/v1/users/update-user-details`
  - Requires: Authentication
  - Body: `email`, `fullName`

- **Update Avatar**
  - `PATCH /api/v1/users/update-avatar`
  - Requires: Authentication
  - Body: `avatar` (file)

- **Update Cover Image**
  - `PATCH /api/v1/users/update-coverImage`
  - Requires: Authentication
  - Body: `coverImage` (file)

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
  - Body: `title`, `description`, `videoFile` (file), `thumbnail` (file)

### Comment Routes

- **Get Video Comments**
  - `GET /api/v1/comments/:videoId`
  - Query Parameters: `page`, `limit`

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
