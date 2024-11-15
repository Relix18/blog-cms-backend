import { Router } from "express";
import {
  activateUser,
  deleteUser,
  forgotPassword,
  getAllUser,
  getUser,
  getUserDetails,
  login,
  logout,
  register,
  resetPassword,
  socialAuth,
  updatePassword,
  updateProfile,
  updateRole,
} from "../controllers/user.controller.js";
import { isAdmin, isAuthenticated } from "../middlewares/auth.js";

const router = Router();

router.post("/register", register);
router.post("/activation", activateUser);
router.post("/login", login);
router.get("/logout", logout);
router.post("/social", socialAuth);
router.post("/forget-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me", isAuthenticated, getUser);
router.put("/update-profile", isAuthenticated, updateProfile);
router.put("/update-password", isAuthenticated, updatePassword);
router.get("/get-all-users", isAuthenticated, isAdmin, getAllUser);
router.put("/update-role/:id", isAuthenticated, isAdmin, updateRole);
router.get("/user-details/:id", isAuthenticated, isAdmin, getUserDetails);
router.delete("/delete-user/:id", isAuthenticated, isAdmin, deleteUser);

export default router;
