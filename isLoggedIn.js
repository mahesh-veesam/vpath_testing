function isLoggedIn(req, res, next) {
  if (req.user) return next();
  res.status(401).json({ error: "User must be logged in" });
}