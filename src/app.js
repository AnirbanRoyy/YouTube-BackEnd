import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(express.json({
    limit: "16kb",
}))

app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))

app.use(express.static("public"))

app.use(cors({
    origin: process.env.CORS_ORIGIN
}))

app.use(cookieParser())

// importing the routes
import userRouter from "./routes/user.route.js"
import videoRouter from "./routes/video.route.js"
import commentRouter from "./routes/comment.route.js"

// declaring the routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);

export default app;