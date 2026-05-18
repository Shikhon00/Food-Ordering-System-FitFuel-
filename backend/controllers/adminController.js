import bcrypt from "bcrypt";
import validator from "validator";
import adminModel from "../models/adminModel.js";

const DEFAULT_ADMIN_EMAIL = "admin007@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "admin007";

// The project creates a default admin automatically if none exists yet.
// This makes demo setup easier because the admin panel has login credentials.
const getAdminCredentials = async () => {
    const admin = await adminModel.findOne({});

    if (admin) {
        return admin;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, salt);

    return adminModel.create({
        email: DEFAULT_ADMIN_EMAIL,
        password: hashedPassword,
    });
};

// Admin login checks the single stored admin account.
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await getAdminCredentials();

        if (email !== admin.email) {
            return res.json({ success: false, message: "Invalid admin email" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.json({ success: false, message: "Invalid admin password" });
        }

        res.json({ success: true, email: admin.email });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Lets the admin change their email and password from the profile modal.
const updateAdminProfile = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!validator.isEmail(email || "")) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }

        if (!password || password.length < 6) {
            return res.json({ success: false, message: "Password must be at least 6 characters" });
        }

        const admin = await getAdminCredentials();
        // Password is hashed before saving, same as normal users and riders.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        admin.email = email;
        admin.password = hashedPassword;
        await admin.save();

        res.json({ success: true, email: admin.email, message: "Admin profile updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

export { loginAdmin, updateAdminProfile };
