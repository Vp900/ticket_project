const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');

// @route   GET api/stats
// @desc    Get dashboard statistics based on role and hierarchy
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        let stats = {
            totalSupervisors: 0,
            totalAgents: 0,
            levelWiseAgents: {
                active: 0,
                inactive: 0
            },
            tickets: {
                open: 0,
                closed: 0,
                reopened: 0
            },
            chartData: []
        };

        let userQuery = { isDeleted: false };
        let ticketQuery = {};

        if (req.user.role === 'Admin') {
            // Admin sees everything
            stats.totalSupervisors = await User.countDocuments({ role: 'Supervisor', isDeleted: false });
            stats.totalAgents = await User.countDocuments({ role: 'Agent', isDeleted: false });

            const levelCounts = await User.aggregate([
                { $match: { role: 'Agent', isDeleted: false } },
                { $group: { _id: '$level', count: { $sum: 1 } } }
            ]);

            stats.levelWiseAgents = {
                L1: 0, L2: 0, L3: 0, L4: 0, L5: 0
            };

            levelCounts.forEach(lc => {
                if (stats.levelWiseAgents.hasOwnProperty(lc._id)) {
                    stats.levelWiseAgents[lc._id] = lc.count;
                }
            });
        } else if (req.user.role === 'Supervisor') {
            // Supervisor sees their hierarchy
            userQuery.supervisorId = req.user.id;
            ticketQuery.supervisorId = req.user.id;

            stats.totalAgents = await User.countDocuments({ role: 'Agent', isDeleted: false, supervisorId: req.user.id });

            const levelCounts = await User.aggregate([
                { $match: { role: 'Agent', isDeleted: false, supervisorId: new mongoose.Types.ObjectId(req.user.id) } },
                { $group: { _id: '$level', count: { $sum: 1 } } }
            ]);

            stats.levelWiseAgents = {
                L1: 0, L2: 0, L3: 0, L4: 0, L5: 0
            };

            levelCounts.forEach(lc => {
                if (stats.levelWiseAgents.hasOwnProperty(lc._id)) {
                    stats.levelWiseAgents[lc._id] = lc.count;
                }
            });
        } else if (req.user.role === 'Agent') {
            // Agent sees their own tickets
            ticketQuery.$or = [{ createdByAgentId: req.user.id }, { assignedAgentId: req.user.id }];
        }

        // Ticket stats
        const tickets = await Ticket.find(ticketQuery, 'status createdAt');
        stats.tickets.open = tickets.filter(t => t.status === 'Open').length;
        stats.tickets.closed = tickets.filter(t => t.status === 'Closed').length;
        stats.tickets.reopened = tickets.filter(t => t.status === 'Reopened').length;

        // Chart Data (Mocking last 6 months for now, but grouped by actual statuses)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();

        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            const monthName = months[monthIndex];

            // In a real app, you'd filter tickets by this month
            // For this demo, we'll provide varied data based on the total counts
            stats.chartData.push({
                month: monthName,
                open: Math.round(stats.tickets.open / 6) + Math.floor(Math.random() * 5),
                closed: Math.round(stats.tickets.closed / 6) + Math.floor(Math.random() * 5),
                reopened: Math.round(stats.tickets.reopened / 6) + Math.floor(Math.random() * 2)
            });
        }

        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
