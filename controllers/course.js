const multer = require('multer')
const { cloudinary } = require('../cloudConfig.js');
const PDFDocument = require('pdfkit');
const fs = require("fs")
const path = require("path")
const express = require("express")
const Course = require("../models/course.js")
const User = require("../models/user.js")
const router = express.Router()
const wrapAsync = require("../utils/wrapAsync.js")
const ExpressError = require("../utils/ExpressError.js")
const {isLoggedIn} = require("../middleware.js")

const homeRoute = wrapAsync(async(req, res) => {
  if(req.user) {console.log(req.user.name) }
    let courses = await Course.aggregate([
      { 
        $group:{
          _id: "$code",
          title : { $first : "$title"}
        }
      }
    ])
    res.status(200).json(courses)
})

const uploadRoute = wrapAsync(async (req, res, next) => {
    console.log("🚀 Upload route hit");
    console.log(req.user._id)

    console.log("📥 Files received:", req.files);
    console.log("📥 Body received:", req.body);

    // Check for no files uploaded or file size exceeded
    if (!req.files || req.files.length === 0) {
        console.log("❌ No files uploaded, exiting...");
        const error = new Error("No files uploaded.");
        error.status = 400;
        return next(error);
    }

    console.log("➡️ Creating Course object...");
    let course = new Course(req.body);
    console.log("✅ Course object created:", course);

    // Define the final upload folder for processed files
    console.log("➡️ Checking uploads folder...");
    const uploadFolderPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadFolderPath)) {
        fs.mkdirSync(uploadFolderPath, { recursive: true });
        console.log("📂 Upload folder created:", uploadFolderPath);
    }
    console.log("✅ Uploads folder ready:", uploadFolderPath);

    const tempFolderPath = path.join(__dirname, '../temp');
    console.log("➡️ Checking temp folder...");
    if (!fs.existsSync(tempFolderPath)) {
        fs.mkdirSync(tempFolderPath);
        console.log("📂 Temp folder created:", tempFolderPath);
    }
    console.log("✅ Temp folder ready:", tempFolderPath);

    // Step 2: Generate the PDF directly from local uploaded images
    const pdfPath = path.join(tempFolderPath, `${course._id}.pdf`);
    console.log("➡️ Creating PDF at path:", pdfPath);

    const doc = new PDFDocument({ autoFirstPage: false });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    for (let file of req.files) {
        console.log("➡️ Adding image to PDF:", file.path);
        const imagePath = file.path;
        const image = doc.openImage(imagePath);
        doc.addPage({ size: [image.width, image.height] });
        doc.image(image, 0, 0);
        console.log("✅ Image added:", file.path);
    }

    doc.end();
    console.log("➡️ Finalizing PDF...");

    // Step 3: Wait until PDF is fully written
    await new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
            console.log("✅ PDF written successfully:", pdfPath);
            resolve();
        });
        writeStream.on('error', (err) => {
            console.error("❌ PDF write error:", err);
            reject(err);
        });
    });

    // Step 4: Upload the final PDF to Cloudinary
    console.log("➡️ Uploading PDF to Cloudinary...");
    const pdfUpload = await cloudinary.uploader.upload(pdfPath, { 
        resource_type: 'raw',
        public_id: `courses/${course._id}`,
        format: 'pdf'
    });
    console.log("✅ Uploaded to Cloudinary:", pdfUpload.secure_url);

    // Step 5: Delete the temp PDF from local server
    console.log("➡️ Deleting temp PDF...");
    fs.unlinkSync(pdfPath);
    console.log("✅ Temp PDF deleted");

    // Step 6: Delete uploaded local images
    // console.log("➡️ Cleaning up local images...");
    // for (let file of req.files) {
    //     fs.unlink(file.path, (err) => {
    //         if (err) console.error(`❌ Failed to delete ${file.path}`, err);
    //         else console.log(`✅ Deleted temp local image ${file.path}`);
    //     });
    // }

    // Step 7: Save only PDF info inside course
    console.log("➡️ Preparing course object for DB...");
    course.image = [];
    course.pdf = {
        url: pdfUpload.secure_url,
        filename: pdfUpload.public_id
    };
    course.uploadedBy = req.user._id;
    console.log("✅ Course before saving:", course);

    console.log("➡️ Saving course in DB...");
    await course.save();
    console.log("✅ Course saved in DB:", course._id);

    res.send('OK');
    console.log("✅ Response sent to client");
});

const updateEdit = wrapAsync(async (req, res) => {
  const { id } = req.params;
  
  const { code, title, slot, examType, date } = req.body;

  const updatedCourse = await Course.findByIdAndUpdate(
    id,
    { code, title, slot, examType, date },
    { runValidators: true, new: true }
  );

  if (!updatedCourse) {
    return res.status(404).json({ message: "Course not found" });
  }

  res.status(200).json({
    message: "Course updated successfully",
    course: updatedCourse,
  });
});

const deleteRoute = wrapAsync(async (req,res)=>{

  let {id} = req.params

  console.log(req.user)
 
  let course = await Course.findById(id).populate("uploadedBy")
  console.log("deleting",course)


  await cloudinary.uploader.destroy(course.pdf.filename,(error,result)=>{
    if(error){
      console.log("Error Deleting image",error)
    }
    else{
      console.log("Deleted Successfully image",result)
    }
  })

  await Course.findByIdAndDelete(id)

  res.status(200).message("success")
})

module.exports = {
    homeRoute,
    uploadRoute,
    updateEdit,
    deleteRoute
}