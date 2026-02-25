const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// @route   POST api/tickets
// @desc    Create a new ticket
// @access  Private (Agent/Admin)
router.post('/', auth, async (req, res) => {
    try {
        console.log('Ticket Creation Request Body:', req.body);
        const { title, description, mobileNumber, assignedAgentId } = req.body;

        // Find current user profile for supervisor info
        const currentUser = await User.findById(req.user.id);

        // Determine supervisorId based on role
        let supervisorIdToSet = currentUser.supervisorId || null;
        if (req.user.role === 'Supervisor') {
            supervisorIdToSet = req.user.id;
        }

        const newTicket = new Ticket({
            title,
            description,
            mobileNumber,
            createdByAgentId: req.user.id,
            assignedAgentId: assignedAgentId || req.user.id,
            supervisorId: supervisorIdToSet
        });

        const ticket = await newTicket.save();
        res.status(201).json(ticket);
    } catch (err) {
        console.error('SERVER ERROR IN POST /api/tickets:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation Error', errors: err.errors });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET api/tickets
// @desc    Get all tickets with role-based filtering and search
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        let query = {};

        // Search filters
        if (req.query.title) {
            query.title = new RegExp(req.query.title, 'i');
        }
        if (req.query.mobileNumber) {
            query.mobileNumber = new RegExp(req.query.mobileNumber, 'i');
        }
        if (req.query.status && req.query.status !== 'all') {
            // Normalize status if needed (capitalize first letter)
            const formattedStatus = req.query.status.charAt(0).toUpperCase() + req.query.status.slice(1).toLowerCase();
            query.status = formattedStatus;
        }
        if (req.query.dateFrom || req.query.dateTo) {
            query.createdAt = {};
            if (req.query.dateFrom) query.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) query.createdAt.$lte = new Date(req.query.dateTo + 'T23:59:59');
        }

        // Role-based filtering
        if (req.user.role === 'Agent') {
            // Agents list ONLY closed tickets as per requirements
            query.$and = [
                { status: 'Closed' },
                { $or: [{ createdByAgentId: req.user.id }, { assignedAgentId: req.user.id }] }
            ];
        } else if (req.user.role === 'Supervisor') {
            // Supervisors see their hierarchy
            query.supervisorId = req.user.id;
        }
        // Admin sees all

        const tickets = await Ticket.find(query)
            .populate('createdByAgentId', 'name email')
            .populate('assignedAgentId', 'name email')
            .populate('supervisorId', 'name email')
            .sort({ createdAt: -1 });

        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   PATCH api/tickets/:id/status
// @desc    Update ticket status (Reopen/Close)
// @access  Private
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

        let ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        // Permissions check
        if (req.user.role === 'Agent' &&
            ticket.createdByAgentId.toString() !== req.user.id &&
            ticket.assignedAgentId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this ticket' });
        }

        if (req.user.role === 'Supervisor' && ticket.supervisorId?.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update hierarchy tickets' });
        }

        ticket.status = formattedStatus;
        ticket.updatedAt = Date.now();

        if (formattedStatus === 'Closed') {
            ticket.closedAt = Date.now();
        } else {
            ticket.closedAt = null;
        }

        await ticket.save();
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   PUT api/tickets/:id
// @desc    Edit ticket details (Admin/Supervisor)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const { title, description, mobileNumber, assignedAgentId } = req.body;

        let ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        // Admin can edit anything, Supervisor hierarchy only
        if (req.user.role === 'Supervisor' && ticket.supervisorId?.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to edit this ticket' });
        }

        if (title) ticket.title = title;
        if (description) ticket.description = description;
        if (mobileNumber) ticket.mobileNumber = mobileNumber;
        if (assignedAgentId) ticket.assignedAgentId = assignedAgentId;

        await ticket.save();
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
