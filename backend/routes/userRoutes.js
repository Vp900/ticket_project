const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth, checkRole } = require('../middleware/auth');

// @route   POST api/users/register
// @desc    Register a user
// @access  Private (Admin only)
router.post('/register', [auth, checkRole(['Admin'])], async (req, res) => {
    try {
        const { name, email, mobileNumber, password, role, supervisorId, level } = req.body;

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name,
            email,
            mobileNumber,
            password: hashedPassword,
            role,
            supervisorId: supervisorId || null,
            level: level || 'L1'
        });

        await user.save();
        res.status(201).json({ message: 'User registered successfully', user: { id: user.id, name: user.name, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   POST api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email, isDeleted: false });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role,
                name: user.name,
                supervisorId: user.supervisorId
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    return res.status(500).json({ message: 'Server error', error: err.message });
                }
                res.json({
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        supervisorId: user.supervisorId
                    }
                });
            }
        );
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET api/users
// @desc    Get all users (Admin) or relevant hierarchy (Supervisor)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        let query = { isDeleted: false };

        // Search filter
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { mobileNumber: searchRegex }
            ];
        }

        // Role-based filtering
        if (req.user.role === 'Supervisor') {
            query.supervisorId = req.user.id;
        } else if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to list users' });
        }

        const users = await User.find(query)
            .select('-password')
            .populate('supervisorId', 'name email');

        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   PUT api/users/:id
// @desc    Update user (Admin)
// @access  Private (Admin)
router.put('/:id', [auth, checkRole(['Admin'])], async (req, res) => {
    try {
        const { name, email, mobileNumber, role, supervisorId, isActive, level } = req.body;

        const userFields = {};
        if (name) userFields.name = name;
        if (email) userFields.email = email;
        if (mobileNumber) userFields.mobileNumber = mobileNumber;
        if (role) userFields.role = role;
        if (supervisorId !== undefined) userFields.supervisorId = supervisorId || null;
        if (isActive !== undefined) userFields.isActive = isActive;
        if (level) userFields.level = level;

        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: userFields },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   DELETE api/users/:id
// @desc    Soft delete user (Admin)
// @access  Private (Admin)
router.delete('/:id', [auth, checkRole(['Admin'])], async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isDeleted = true;
        await user.save();

        res.json({ message: 'User removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   PUT api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile/update', auth, async (req, res) => {
    try {
        const { name, password } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
