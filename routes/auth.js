const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require("../models/user.js")
const {saveRedirectUrl} = require("../middleware.js")

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], 
  auto_select:false,
  prompt:"select_account" })
);

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: 'https://vpath_testing.netlify.app/home' }),
  async(req, res) => {
    const userData = {  
      name  : req.user.displayName,
      email : req.user.email,
      id : req.user._id,
      fullName : req.user.name
    }
    console.log(userData)
    const encodedUser = encodeURIComponent(JSON.stringify(userData))
    res.redirect(`https://vpath_testing?user=${encodedUser}`);
  }
);

router.post("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true, message: "Logged out" });
    });
  });
});

router.get("/checkAuth", (req, res) => {
  try {
    res.status(200).json(req.user); 
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;