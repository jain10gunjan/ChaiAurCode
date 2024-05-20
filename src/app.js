import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
})) 
// use method is used when using the middlewares

app.use(express.json({limit:"16kb"})) // restriciting how much data can be pushed in json format

app.use(express.urlencoded({
    extended:true,
    limit: "16kb"
}))

app.use(express.static("public"))

//cookie parser : server sei user ki cookies pe crud operations karne ke liye
app.use(cookieParser())


//Routes Are Imported Here:
import router from "./routes/user.routes.js"

//Routes Declaration
app.use("/users", router)

export default app;