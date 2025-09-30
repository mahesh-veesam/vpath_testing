const express = require("express");
const app = express();
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const data = require("./data")
const Faculty = require("../models/faculty")

async function connectMongoose() {
  await mongoose.connect("mongodb+srv://vpath:lIRg8LSaXlTsipIM@cluster0.xvmktho.mongodb.net/temp?retryWrites=true&w=majority&appName=Cluster0"
);
}

connectMongoose().then(() => {console.log("Connected successfully");}).catch((err) => {console.log(err);});

// let fac1 = new Faculty({
//     name : "Dr. Nusrat Begum",
//     photoUrl : "https://vitap-backend.s3.ap-south-1.amazonaws.com/27_Dr_Nusrat_Begum_VISH_ENG_70428_027e05a357.avif",
//     designation : "Assistant Professor Grade 1",
//     school : "School of Social Science and Humanities (VISH)",
//     specialisation : "Applied Linguistics, Linguistics Landscaping, Advertising Language, Language and Religion, Communicative English",
//     email : "nusrat.begum@vitap.ac.in",
//     cabin : "201C - CB"
// })

// Faculty.insertMany(data)
//     .then(()=>{
//         console.log("Inserted successfully")
//     })
//     .catch((err)=>{
//         console.log(err)
//     })

// Faculty.deleteMany({})
//     .then(()=>{
//         console.log("Deleted successfully")
//     })
//     .catch((err)=>{
//         console.log(err)
//     })
