const express = require('express');
const app = express();
const mongoose = require("mongoose")
const methodOverride = require("method-override")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = require("./models/user.js")
const cors = require("cors")
require("dotenv").config()

let mongoUrl = "mongodb://localhost:27017/PYQS"
let dbUrl = process.env.ATLASDB_URL
let port = process.env.PORT || 5000

async function connectMongoose(){
  
    await mongoose.connect(dbUrl)
}
connectMongoose().then(()=>{console.log("Connected successfully")}).catch((err)=>{console.log(err)})

const store = MongoStore.create({
  mongoUrl : dbUrl,
  crypto : {
    secret : "secretkeyofmywebsitevpath"
  },
  touchAfter : 24 * 3600,
}) 

store.on("error",()=>{
  console.log("Error in mongo section")
})

const sessionOptions = {
  store,
  secret: "mysecretcode",
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only HTTPS in prod
    sameSite: "none" 
  }
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // Required on Render behind proxy
}

app.use(express.urlencoded({extended : true}))
app.use(methodOverride("_method"))

app.use(session(sessionOptions))
app.use(passport.initialize())
app.use(passport.session())

const allowedOrigins = [
  "http://localhost:5173",
  "https://vpath-testing.netlify.app",
  "https://vpath.netlify.app",
  "https://vpath.vercel.app",
  "http://192.168.1.37:5173"
];

app.use(cors({
  origin: (origin, callback) => {
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS")); 
    }
  },
  credentials: true
}));

app.use(express.json())

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://vpath-testing.onrender.com/auth/google/callback",
  scope : ["profile","email"],
},

async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  console.log("here")

  if (email.endsWith('@vitapstudent.ac.in')) {
    const user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(null, user)
    };

    let emailname = email.split(".")[0]
    let ename = emailname[0].toUpperCase() + emailname.slice(1)
  
    const newUser = await User.create({
      googleId: profile.id,
      email: email,
      name: profile.name.givenName,
      displayName : ename
    });

    return done(null, newUser);
  } else {
    console.log("Unauthorized")
    return done(null, false, { message: "Unauthorized email domain" });
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

app.use((req,res,next)=>{
  res.locals.currUser = req.user;
  res.locals.currUserName = " ";
  if(req.user){
    res.locals.currUserName = req.user.name;
  }
  next()
})

const courses = require("./routes/courses.js")
const auth = require("./routes/auth.js")
app.use("/courses", courses)
app.use("/auth", auth)

app.use((req, res,next) => {
  res.redirect("/")
});

app.use((err,req,res,next)=>{
  let {status = 401 , message} = err;
  res.json({message})
})

app.listen(port,"0.0.0.0",()=>{
  console.log(`${port}server started running`)
})
