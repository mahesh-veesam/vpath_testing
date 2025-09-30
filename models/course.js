const mongoose = require("mongoose")
const User = require("./user.js")

const courseSchema= new mongoose.Schema({
    title : {
        type : String,
        index : true,
        required : true,
    },
    code : {
        type : String,
        set : (v)=>v.toUpperCase(),
        index : true,
        required : true,
    },
    slot : {
        type : String,
        required : true,
    },
    examType : {
        type : String,
        required : true,
    },
    date : {
        type : Date,
        required : true,
    },
    image : [{
        url : String,
        filename : String,
    }],
    pdf : {
        url : String,
        filename : String,
    },
    uploadedBy : {
        type: mongoose.Schema.Types.ObjectId,
        ref : "User"
    },
    uploadedAt : {
        type : Date,
        default : Date.now
    }
})

const Course = new mongoose.model("Course",courseSchema)

module.exports = Course;
