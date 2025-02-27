const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

// Serve static files from all required directories
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));


// MongoDB connection with error handling
mongoose.connect('mongodb://localhost:27017/timetableGenerator', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB for Timetable Generator');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if cannot connect to database
});

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '1d' }
    );
};

// Middleware for authentication
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        const user = await User.findById(decoded.id);
        
        if (!user) {
            throw new Error();
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

// ================= SCHEMAS & MODELS =================

// User Schema
const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        minlength: 3
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Subject Schema
const SubjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    iconClass: {
        type: String,
        default: 'ri-book-line'
    },
    buttonColor: {
        type: String,
        default: 'blue'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: false // Optional for backward compatibility
    }
});

// Exam Schema definition
const ExamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    iconClass: {
        type: String,
        default: 'ri-book-line'
    },
    iconColor: {
        type: String,
        default: 'indigo-600'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Timetable Schema
const TimetableSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    subjects: [{
        name: { type: String, required: true },
        level: { type: String, enum: ['basic', 'intermediate', 'advanced'], required: true },
        hours: { type: Number, required: true, min: 1, max: 5 }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', UserSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const Exam = mongoose.model('Exam', ExamSchema);
const Timetable = mongoose.model('Timetable', TimetableSchema);

// ================= ROUTES =================

// ===== AUTHENTICATION ROUTES =====

// Register a new user
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validation
        if (!username || !email || !password) {
            return res.status(400).send({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).send({ error: 'Password must be at least 6 characters long' });
        }
        
        // Create and save user
        const user = new User({ username, email, password });
        await user.save();
        
        // Generate token
        const token = generateToken(user);
        
        // Send response
        res.status(201).send({ 
            user: { 
                id: user._id, 
                username, 
                email,
                createdAt: user.createdAt
            }, 
            token 
        });
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error
            if (error.keyPattern.username) {
                return res.status(400).send({ error: 'Username already exists' });
            }
            if (error.keyPattern.email) {
                return res.status(400).send({ error: 'Email already exists' });
            }
            return res.status(400).send({ error: 'Account already exists' });
        }
        res.status(400).send({ error: error.message });
    }
});

// Login user
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).send({ error: 'Username and password are required' });
        }
        
        // Find user
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(400).send({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(400).send({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = generateToken(user);
        
        // Send response
        res.send({ 
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email,
                createdAt: user.createdAt
            }, 
            token 
        });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Get user profile (protected route)
app.get('/api/users/profile', auth, async (req, res) => {
    try {
        // User is already attached to req by auth middleware
        res.send({ 
            user: { 
                id: req.user._id, 
                username: req.user.username, 
                email: req.user.email,
                createdAt: req.user.createdAt
            } 
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// ===== SUBJECT ROUTES =====

// Create a new subject (with auth)
app.post('/api/subjects/auth', auth, async (req, res) => {
    try {
        const { name, description, iconClass, buttonColor } = req.body;
        const subject = new Subject({
            name,
            description,
            iconClass: iconClass || 'ri-book-line',
            buttonColor: buttonColor || 'blue',
            userId: req.user._id
        });
        await subject.save();
        res.status(201).send(subject);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).send({ error: 'Subject already exists' });
        }
        res.status(400).send({ error: error.message });
    }
});

// Get all subjects for authenticated user
app.get('/api/subjects/auth', auth, async (req, res) => {
    try {
        const subjects = await Subject.find({ userId: req.user._id });
        res.send(subjects);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Delete a subject for authenticated user
app.delete('/api/subjects/auth/:id', auth, async (req, res) => {
    try {
        const subject = await Subject.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });
        if (!subject) {
            return res.status(404).send({ error: 'Subject not found' });
        }
        res.send(subject);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Create a new subject (legacy route)
app.post('/api/subjects', async (req, res) => {
    try {
        console.log('Received subject creation request:', req.body);
        
        const { name, description, iconClass, buttonColor } = req.body;
        
        // Validate required fields
        if (!name || !description) {
            return res.status(400).send({
                error: 'Name and description are required fields'
            });
        }
        
        const subject = new Subject({
            name,
            description,
            iconClass: iconClass || 'ri-book-line',
            buttonColor: buttonColor || 'blue'
        });
        
        console.log('Attempting to save subject:', subject);
        
        const savedSubject = await subject.save();
        console.log('Subject saved successfully:', savedSubject);
        
        res.status(201).send(savedSubject);
    } catch (error) {
        console.error('Error creating subject:', error);
        res.status(400).send({ error: error.message });
    }
});

// Get all subjects (legacy route)
app.get('/api/subjects', async (req, res) => {
    try {
        const subjects = await Subject.find({}).sort({ createdAt: -1 });
        console.log('Found subjects:', subjects);
        res.send(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).send({ error: error.message });
    }
});

// Delete a subject (legacy route)
app.delete('/api/subjects/:id', async (req, res) => {
    try {
        const subject = await Subject.findByIdAndDelete(req.params.id);
        if (!subject) {
            return res.status(404).send({ error: 'Subject not found' });
        }
        res.send(subject);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// ===== EXAM ROUTES =====

// Create a new exam
app.post('/api/exams', async (req, res) => {
    try {
        console.log('Received exam creation request:', req.body);
        
        const { name, description, iconClass, iconColor } = req.body;
        
        // Validate required fields
        if (!name || !description) {
            return res.status(400).send({
                error: 'Name and description are required fields'
            });
        }
        
        const exam = new Exam({
            name,
            description,
            iconClass: iconClass || 'ri-book-line',
            iconColor: iconColor || 'indigo-600'
        });
        
        console.log('Attempting to save exam:', exam);
        
        const savedExam = await exam.save();
        console.log('Exam saved successfully:', savedExam);
        
        res.status(201).send(savedExam);
    } catch (error) {
        console.error('Error creating exam:', error);
        res.status(400).send({ error: error.message });
    }
});

// Get all exams
app.get('/api/exams', async (req, res) => {
    try {
        const exams = await Exam.find({}).sort({ createdAt: -1 });
        console.log('Found exams:', exams);
        res.send(exams);
    } catch (error) {
        console.error('Error fetching exams:', error);
        res.status(500).send({ error: error.message });
    }
});

// Delete an exam
app.delete('/api/exams/:id', async (req, res) => {
    try {
        const exam = await Exam.findByIdAndDelete(req.params.id);
        if (!exam) {
            return res.status(404).send({ error: 'Exam not found' });
        }
        res.send(exam);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// ===== TIMETABLE ROUTES =====

// Save timetable
app.post('/api/timetables', auth, async (req, res) => {
    try {
        const { name, subjects } = req.body;
        const timetable = new Timetable({
            userId: req.user._id,
            name,
            subjects
        });
        await timetable.save();
        res.status(201).send(timetable);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Get user's timetables
app.get('/api/timetables', auth, async (req, res) => {
    try {
        const timetables = await Timetable.find({ userId: req.user._id }).sort({ updatedAt: -1 });
        res.send(timetables);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Get specific timetable
app.get('/api/timetables/:id', auth, async (req, res) => {
    try {
        const timetable = await Timetable.findOne({ _id: req.params.id, userId: req.user._id });
        
        if (!timetable) {
            return res.status(404).send({ error: 'Timetable not found' });
        }
        
        res.send(timetable);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Update timetable
app.patch('/api/timetables/:id', auth, async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['name', 'subjects'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));
        
        if (!isValidOperation) {
            return res.status(400).send({ error: 'Invalid updates!' });
        }
        
        const timetable = await Timetable.findOne({ _id: req.params.id, userId: req.user._id });
        
        if (!timetable) {
            return res.status(404).send({ error: 'Timetable not found' });
        }
        
        updates.forEach(update => timetable[update] = req.body[update]);
        timetable.updatedAt = Date.now();
        await timetable.save();
        res.send(timetable);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Delete timetable
app.delete('/api/timetables/:id', auth, async (req, res) => {
    try {
        const timetable = await Timetable.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        
        if (!timetable) {
            return res.status(404).send({ error: 'Timetable not found' });
        }
        
        res.send(timetable);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// ===== PAGE ROUTES =====

// Route for subjects page
app.get('/subjects', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'subjects.html'));
});

// Route for exams page
app.get('/exams', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'exams.html'));
});

// Authentication page
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth1.html'));
});

// Debug endpoint to check routes
app.get('/api/debug', (req, res) => {
    res.json({
        message: 'API is working',
        routes: {
            auth: ['/api/users/register', '/api/users/login', '/api/users/profile'],
            subjects: ['/api/subjects', '/api/subjects/auth'],
            exams: ['/api/exams'],
            timetables: ['/api/timetables', '/api/timetables/:id']
        }
    });
});

// Redirect old routes
app.get('/old-page', (req, res) => {
    res.redirect('/');
});

// Default route redirects to subjects
app.get('/', (req, res) => {
    res.redirect('/subjects');
});

// Fallback route to serve index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create a new exam
app.post('/api/exams', async (req, res) => {
    try {
        console.log('Received exam creation request:', req.body);
        
        const { name, description, iconClass, iconColor } = req.body;
        
        // Validate required fields
        if (!name || !description) {
            return res.status(400).send({
                error: 'Name and description are required fields'
            });
        }
        
        const exam = new Exam({
            name,
            description,
            iconClass: iconClass || 'ri-book-line',
            iconColor: iconColor || 'indigo-600'
        });
        
        console.log('Attempting to save exam:', exam);
        
        const savedExam = await exam.save();
        console.log('Exam saved successfully:', savedExam);
        
        res.status(201).send(savedExam);
    } catch (error) {
        console.error('Error creating exam:', error);
        res.status(400).send({ error: error.message });
    }
});

// Get all exams
app.get('/api/exams', async (req, res) => {
    try {
        const exams = await Exam.find({});
        console.log('Found exams:', exams);
        res.send(exams);
    } catch (error) {
        console.error('Error fetching exams:', error);
        res.status(500).send({ error: error.message });
    }
});

// Delete an exam
app.delete('/api/exams/:id', async (req, res) => {
    try {
        const exam = await Exam.findByIdAndDelete(req.params.id);
        if (!exam) {
            return res.status(404).send({ error: 'Exam not found' });
        }
        res.send(exam);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Server initialization
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Access authentication at: http://localhost:${PORT}/auth`);
    console.log(`Combined Timetable Generator server running on port ${PORT}`);
    console.log(`Access subjects at: http://localhost:${PORT}/subjects`);
    console.log(`Access exams at: http://localhost:${PORT}/exams`);
    // console.log(`Access authentication at: http://localhost:${PORT}/auth`);
});