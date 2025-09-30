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
    console.log("➡️ Request received");

    // Step 1: Check files received
    console.log("FILES:", req.files?.map(f => f.originalname) || "No files");
    console.log("BODY:", req.body);

    if (!req.files || req.files.length === 0) {
        const error = new Error("No files uploaded.");
        error.status = 400;
        return next(error);
    }

    let course = new Course(req.body);

    // Step 2: Generate PDF
    const pdfPath = path.join(__dirname, "../temp", `${course._id}.pdf`);
    console.log("📂 Temp PDF path:", pdfPath);

    const doc = new PDFDocument({ autoFirstPage: false });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    for (let file of req.files) {
        console.log("🖼️ Adding file to PDF:", file.path);
        try {
            const size = sizeOf(file.path); // using image-size
            doc.addPage({ size: [size.width, size.height] });
            doc.image(file.path, 0, 0);
        } catch (err) {
            console.error("❌ Error adding image:", err);
        }
    }

    doc.end();

    await new Promise((resolve, reject) => {
        writeStream.on("finish", () => {
            console.log("✅ PDF created successfully");
            resolve();
        });
        writeStream.on("error", reject);
    });

    // Step 3: Upload to Cloudinary
    let pdfUpload;
    try {
        console.log("⬆️ Uploading PDF to Cloudinary...");
        pdfUpload = await cloudinary.uploader.upload(pdfPath, {
            resource_type: "raw",
            public_id: `courses/${course._id}`,
            format: "pdf",
        });
        console.log("✅ Cloudinary upload successful:", pdfUpload.secure_url);
    } catch (err) {
        console.error("❌ Cloudinary upload failed:", err);
        return next(err);
    }

    // Step 4: Prepare course before saving
    course.image = [];
    course.pdf = {
        url: pdfUpload.secure_url,
        filename: pdfUpload.public_id,
    };
    course.uploadedBy = req.user._id;

    console.log("📦 Course before saving:", course);

    // Step 5: Save in DB
    try {
        await course.save();
        console.log("✅ Course saved in DB:", course._id);
    } catch (err) {
        console.error("❌ DB save error:", err);
        return next(err);
    }

    res.json({
        message: "Upload successful",
        pdfUrl: course.pdf.url,
        courseId: course._id,
    });
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