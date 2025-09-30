const express = require("express")
const Course = require("../models/course.js")
const User = require("../models/user.js")
const router = express.Router()
const wrapAsync = require("../utils/wrapAsync.js")
const ExpressError = require("../utils/ExpressError.js")
const {isLoggedIn} = require("../isLoggedIn.js")
const multer = require('multer')
const { cloudinary } = require('../cloudConfig.js');
const PDFDocument = require('pdfkit');
const fs = require("fs")
const path = require("path")

const {homeRoute , uploadRoute, updateEdit, deleteRoute} = require("../controllers/course.js")


const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
      const tempPath = path.join(__dirname, 'temp'); // Temp folder for initial storage
      if (!fs.existsSync(tempPath)) {
          fs.mkdirSync(tempPath, { recursive: true });
      }
      cb(null, tempPath); // Save to 'temp' folder initially
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);  // Use timestamp for unique filename
  }
});

// const upload = multer({ 
//   limits : { fileSize : 6 * 1024 * 1024},
//   storage: tempStorage
//  });

const upload = multer({dest : "uploads/"})


//index route
router.get('/', homeRoute);

router.get('/:code',wrapAsync(async(req,res)=>{
  if(req.user){
    console.log(req.user.name)
  }
  else{
    console.log("error in req.user")
  }
  let {code} = req.params
  let courses = await Course.find({code : code}).populate("uploadedBy") 
  if (!courses){
      throw new ExpressError(404,"There is no Page")
  }
  res.status(200).json(courses)
}))

//uplading and generating pdf post route    ||     new -> upload
router.post("/upload", isLoggedIn, upload.array('images',5), uploadRoute)

//update edit route
router.patch("/update/:id",updateEdit)

//delete route
router.delete("/delete/:id",deleteRoute)

module.exports = router