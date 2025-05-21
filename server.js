const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost/faithchat', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String }, // For admins and regular users
    subscriptionEnd: { type: Date },
    isTrial: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    status: { type: String, default: 'active' }
});

const VisitorSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    location: {
        country: String,
        state: String
    },
    timestamp: { type: Date, default: Date.now }
});

const SubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true }, // Subscription price in USD
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Visitor = mongoose.model('Visitor', VisitorSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);

// JWT Secret
const JWT_SECRET = 'your_jwt_secret_key'; // Replace with a secure key

// Middleware to Verify Admin Token
const verifyAdminToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send('Unauthorized');
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isAdmin) return res.status(403).send('Forbidden');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).send('Unauthorized');
    }
};

// Middleware to Verify User Token
const verifyUserToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send('Unauthorized');
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).send('Unauthorized');
    }
};

// Seed Admin Users (Run Once)
const seedAdmins = async () => {
    const admins = [
        { email: 'admin1@faithchat.org', password: 'X9#mQ2$vL4pNrW7!k', isAdmin: true },
        { email: 'admin2@faithchat.org', password: 'P3@qT8^hJ5mYpL1&k', isAdmin: true },
        { email: 'admin3@faithchat.org', password: 'R7!wF2$vQ9nXsP4#j', isAdmin: true },
        { email: 'admin4@faithchat.org', password: 'M1#kL9^pT6vYqR3@h', isAdmin: true },
        { email: 'admin5@faithchat.org', password: 'W5@kM3^hP8vTqR2!j', isAdmin: true }
    ];

    for (const admin of admins) {
        const existingUser = await User.findOne({ email: admin.email });
        if (!existingUser) {
            const hashedPassword = await bcrypt.hash(admin.password, 10);
            await User.create({ ...admin, password: hashedPassword });
        }
    }
};
seedAdmins();

// Admin Login
app.post('/api/admin-login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isAdmin: true });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send('Invalid email or password');
    }

    const token = jwt.sign({ email: user.email, isAdmin: true }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// User Login (Updated to Use Password)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send('Invalid email or password');
    }

    const token = jwt.sign({ email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Track Visitor
app.post('/api/track-visitor', async (req, res) => {
    const { ip, location, timestamp } = req.body;
    await Visitor.create({ ip, location, timestamp });
    res.status(200).send();
});

// Tracking Pixel Route
app.get('/track-pixel', (req, res) => {
    const pixel = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
    res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length
    });
    res.end(pixel);
});

// Admin Dashboard Data
app.get('/api/admin/dashboard', verifyAdminToken, async (req, res) => {
    try {
        const totalVisitors = await Visitor.countDocuments();
        const recentVisitors = await Visitor.find().sort({ timestamp: -1 }).limit(10);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailySubscriptions = await Subscription.countDocuments({
            timestamp: { $gte: today }
        });
        const totalRevenue = (await Subscription.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]))[0]?.total || 0;

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        const subscriptionData = await Subscription.aggregate([
            { $match: { timestamp: { $gte: sevenDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                count: { $sum: 1 }
            } },
            { $sort: { '_id': 1 } }
        ]);

        const subscriptionDates = [];
        const subscriptionCounts = [];
        for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dataPoint = subscriptionData.find(item => item._id === dateStr);
            subscriptionDates.push(dateStr);
            subscriptionCounts.push(dataPoint ? dataPoint.count : 0);
        }

        res.json({
            totalVisitors,
            recentVisitors,
            dailySubscriptions,
            totalRevenue,
            subscriptionDates,
            subscriptionCounts
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Server error');
    }
});

// Admin Logout
app.post('/api/admin-logout', verifyAdminToken, (req, res) => {
    res.status(200).send();
});

// User Routes
app.get('/api/user', verifyUserToken, async (req, res) => {
    const user = await User.findOne({ email: req.user.email });
    res.json({
        email: user.email,
        subscriptionEnd: user.subscriptionEnd,
        isTrial: user.isTrial,
        status: user.status
    });
});

app.post('/api/logout', verifyUserToken, (req, res) => {
    res.status(200).send();
});

// Start Server
app.listen(3000, () => console.log('Server running on port 3000'));
