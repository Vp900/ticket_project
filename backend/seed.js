const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ticketflow');
        console.log('Connected to MongoDB for seeding...');

        // Clear existing users
        await User.deleteMany({});
        console.log('Cleared existing users.');

        const salt = await bcrypt.genSalt(10);
        const adminPassword = await bcrypt.hash('admin123', salt);
        const supervisorPassword = await bcrypt.hash('supervisor123', salt);
        const agentPassword = await bcrypt.hash('agent123', salt);

        // 1. Create Admin
        const admin = new User({
            name: 'System Admin',
            email: 'admin@ticket.com',
            mobileNumber: '9999999999',
            password: adminPassword,
            role: 'Admin',
            isActive: true
        });
        await admin.save();
        console.log('Admin user created.');

        // 2. Create Supervisor
        const supervisor = new User({
            name: 'Main Supervisor',
            email: 'supervisor@ticket.com',
            mobileNumber: '8888888888',
            password: supervisorPassword,
            role: 'Supervisor',
            supervisorId: admin._id,
            isActive: true
        });
        await supervisor.save();
        console.log('Supervisor user created.');

        // 3. Create Agent
        const agent = new User({
            name: 'Frontline Agent',
            email: 'agent@ticket.com',
            mobileNumber: '7777777777',
            password: agentPassword,
            role: 'Agent',
            supervisorId: supervisor._id,
            isActive: true
        });
        await agent.save();
        console.log('Agent user created.');

        console.log('Seeding completed successfully!');
        process.exit();
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
};

seedUsers();
