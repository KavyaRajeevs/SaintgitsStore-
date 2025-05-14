const express = require('express');
const Razorpay = require('razorpay');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));

// Constants
const JWT_SECRET = '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p';
const CLIENT_ID = '760072900583-d0o804i2a7ob0uquplh9imeu8r8rgr24.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);
// Razorpay credentials
const razorpayInstance = new Razorpay({
    key_id: 'rzp_test_eOqIOMVuRb8BNl',  // Replace with your Razorpay Key
    key_secret: 'SPXU16kaio4GoLkKmzcgYdUW'  // Replace with your Razorpay Secret
});

// Middleware
app.use(bodyParser.json());


// MongoDB Connections
const collegeStoreConnection = mongoose.createConnection('mongodb+srv://kavya:o0Bi6I5aNbxT1ghm@store.hyqsn.mongodb.net/?retryWrites=true&w=majority&appName=Store', {
    dbName: 'college_store',
    serverSelectionTimeoutMS: 5000
});

const testConnection = mongoose.createConnection('mongodb+srv://kavya:o0Bi6I5aNbxT1ghm@store.hyqsn.mongodb.net/?retryWrites=true&w=majority&appName=Store', {
    dbName: 'test',
    serverSelectionTimeoutMS: 5000
});

// Set up image storage
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Schema Definitions
const ProductSchema = new mongoose.Schema({
    name: String,
    color: [String], 
    size: String,
    company: String,
    category: String,
    price: Number,
    instock: Number,
    imageUrl: String
}, { collection: 'college_store' });

const CartSchema = new mongoose.Schema({
    productId: mongoose.Schema.Types.ObjectId,
    name: String,
    color: String,
    price: Number,
    quantity: Number,
    imageUrl: String
}, { collection: 'cart' });

const WishlistSchema = new mongoose.Schema({
    productId: mongoose.Schema.Types.ObjectId,
    name: String,
    color: String,
    price: Number,
    imageUrl: String
}, { collection: 'wishlist' });

const StoreUserSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    role: { type: String, default: 'user' }
}, { collection: 'users' });

// Schema for orders
const OrderSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    orderId: String,
    paymentId: String,
    amount: Number,
    items: Array,
    status: String,
    date: { type: Date, default: Date.now }
}, { collection: 'orders' });

// Schema Definition for test database
const GoogleUserSchema = new mongoose.Schema({
    googleId: String,
    name: String,
    email: String,
    picture: String,
    role: { type: String, default: 'user' }
}, { collection: 'users' });

// Models for college_store database
const Product = collegeStoreConnection.model('Product', ProductSchema);
const Cart = collegeStoreConnection.model('Cart', CartSchema);
const Wishlist = collegeStoreConnection.model('Wishlist', WishlistSchema);
const StoreUser = collegeStoreConnection.model('User', StoreUserSchema);
const Order = collegeStoreConnection.model('Order', OrderSchema);

// Model for test database
const GoogleUser = testConnection.model('User', GoogleUserSchema);

// Middleware to validate ObjectId
const validateObjectId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }
    next();
};

// Middleware to protect routes with JWT
app.use(express.json());
app.use(cors({
    // This is important for cross-domain requests (like from ngrok to your server)
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        
        // List of allowed origins
        const allowedOrigins = [
            'http://localhost:8000',
            'http://localhost:3000',
            'https://9ee7-103-182-167-210.ngrok-free.app' // Add your ngrok URL here
            
        ];
        
        if(allowedOrigins.indexOf(origin) === -1){
            return callback(new Error('CORS policy violation'), false);
        }
        return callback(null, true);
    },
    credentials: true
}));


// Middleware to protect routes with JWT
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId || decoded.id;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

app.post('/login', async (req, res) => {
    try {
        console.log('Login request received:', req.body);
        console.log('Request origin:', req.headers.origin);

        // Check if request contains token for Google login
        if (req.body.token) {
            console.log('Handling Google login');
            // Handle Google login
            const { token } = req.body;
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: CLIENT_ID
            });

            const { sub, name, email, picture } = ticket.getPayload();
            console.log('Google user payload:', { sub, name, email, picture });

            let user = await GoogleUser.findOne({ googleId: sub });
            if (!user) {
                user = new GoogleUser({ 
                    googleId: sub, 
                    name, 
                    email, 
                    picture 
                });
                if ((await GoogleUser.countDocuments()) === 0) user.role = 'admin'; 
                await user.save();
            }

            const jwtToken = jwt.sign(
                { 
                    id: user._id, 
                    role: user.role, 
                    name: user.name, 
                    picture: user.picture,
                    email: user.email 
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            console.log('Google login successful, JWT token generated:', jwtToken);
            
            return res.json({ 
                redirect: user.role === 'admin' ? 'dashboard.html' : 'home.html', 
                token: jwtToken,
                email: user.email
            });
        } else {
            console.log('Handling traditional login');
            // Handle traditional login
            const { username, password } = req.body;
            const user = await StoreUser.findOne({ username });
            if (!user) {
                console.log('User not found:', username);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                console.log('Invalid password for user:', username);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const token = jwt.sign(
                { 
                    userId: user._id, 
                    username: user.username,
                    email: user.email,
                    role: user.role || 'user'
                }, 
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            console.log('Traditional login successful, JWT token generated:', token);
            res.json({ token });
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Add route to get user information
app.get('/user', authMiddleware, async (req, res) => {
    try {
        // Determine which collection to query based on the user ID
        let user;
        
        // First, try Google users
        user = await GoogleUser.findById(req.userId);
        
        // If not found, try store users
        if (!user) {
            user = await StoreUser.findById(req.userId);
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return user information
        const userData = {
            id: user._id,
            name: user.name || user.username,
            email: user.email,
            picture: user.picture || '',
            role: user.role || 'user'
        };
        
        res.json(userData);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user data' });
    }
});
// 📌 GOOGLE USER ROUTES
app.get('/users', async (req, res) => {
    try {
        const users = await GoogleUser.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
});

// 📌 PRODUCT ROUTES
app.get('/college_store', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

app.get('/college_store/search', async (req, res) => {
    const searchQuery = req.query.name;
    const products = await Product.find({
        name: { $regex: searchQuery, $options: 'i' }
    });
    res.json(products);
});

app.get('/college_store/:id', validateObjectId, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(400).json({ error: 'Invalid product ID' });
    }
});

app.get('/college_store/category/:category', async (req, res) => {
    const category = req.params.category;
    const products = await Product.find({ category });
    res.json(products);
});

app.post('/college_store', upload.single('image'), async (req, res) => {
    try {
        const { name, color, size, company, category, price, instock } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
        
        const product = new Product({ name, color, size, company, category, price, instock, imageUrl });
        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error saving product' });
    }
});

app.put('/college_store/:id', validateObjectId, upload.single('image'), async (req, res) => {
    try {
        const updatedData = {
            name: req.body.name,
            color: req.body.color,
            size: req.body.size,
            company: req.body.company,
            category: req.body.category,
            price: req.body.price,
            instock: req.body.instock,
        };

        // If an image file is uploaded, add the image URL
        if (req.file) {
            updatedData.imageUrl = `/uploads/${req.file.filename}`;
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updatedData, { new: true });
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ error: 'Error updating product' });
    }
});

app.delete('/college_store/:id', validateObjectId, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
});
//ORDER
// Updated /user-orders endpoint to handle both user collections
// New endpoint that doesn't use token authentication
app.get('/user-orders-by-email/:email', async (req, res) => {
    try {
        const userEmail = req.params.email;
        
        // First find the user by email from Google users collection
        const user = await GoogleUser.findOne({ email: userEmail });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Then find orders with that user's ID
        const orders = await Order.find({ userId: user._id }).sort({ date: -1 });
        
        res.json(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ error: 'Error fetching user orders' });
    }
});
// 📌 CART ROUTES
app.post('/cart', async (req, res) => {
    const { productId, name, price, imageUrl, quantity } = req.body;
    const existingItem = await Cart.findOne({ productId });
    if (existingItem) {
        existingItem.quantity += quantity;
        await existingItem.save();
    } else {
        const cartItem = new Cart({ productId, name, price, imageUrl, quantity });
        await cartItem.save();
    }
    res.json({ message: 'Item added to cart' });
});

app.get('/cart', async (req, res) => {
    const cartItems = await Cart.find();
    res.json(cartItems);
});

app.get('/cart/:id', validateObjectId, async (req, res) => {
    try {
        const cartItem = await Cart.findById(req.params.id);
        res.json(cartItem);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching cart item' });
    }
});

app.put('/cart/:id', validateObjectId, async (req, res) => {
    await Cart.findByIdAndUpdate(req.params.id, req.body);
    res.json({ message: 'Cart updated' });
});

app.delete('/cart/:id', validateObjectId, async (req, res) => {
    await Cart.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item removed from cart' });
});

// Endpoint to clear the entire cart
app.delete('/cart', async (req, res) => {
    try {
        await Cart.deleteMany({});
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error clearing cart' });
    }
});

// 📌 WISHLIST ROUTES
app.post('/wishlist', async (req, res) => {
    const wishlistItem = new Wishlist(req.body);
    await wishlistItem.save();
    res.json({ message: 'Added to Wishlist' });
});

app.get('/wishlist', async (req, res) => {
    const wishlist = await Wishlist.find();
    res.json(wishlist);
});

app.get('/wishlist/:id', validateObjectId, async (req, res) => {
    try {
        const wishlistItem = await Wishlist.findById(req.params.id);
        res.json(wishlistItem);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching wishlist item' });
    }
});

app.put('/wishlist/:id', validateObjectId, async (req, res) => {
    try {
        const updatedWishlistItem = await Wishlist.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedWishlistItem);
    } catch (error) {
        res.status(500).json({ error: 'Error updating wishlist item' });
    }
});

app.delete('/wishlist/:id', validateObjectId, async (req, res) => {
    await Wishlist.findByIdAndDelete(req.params.id);
    res.json({ message: 'Removed from Wishlist' });
});

// Schema for Stock Notifications
const NotificationSchema = new mongoose.Schema({
    productId: mongoose.Schema.Types.ObjectId,
    email: String,
    notified: { type: Boolean, default: false }
}, { collection: 'stock_notifications' });

const StockNotification = collegeStoreConnection.model('StockNotification', NotificationSchema);

// Stock Notification Route
app.post('/notify-stock', async (req, res) => {
    try {
        const { productId, email } = req.body;
        
        // Check if notification already exists
        const existingNotification = await StockNotification.findOne({ 
            productId, 
            email 
        });

        if (existingNotification) {
            return res.status(400).json({ message: 'Already subscribed for notifications' });
        }

        // Create new notification
        const notification = new StockNotification({ 
            productId, 
            email 
        });
        await notification.save();

        res.status(200).json({ message: 'Notification request recorded' });
    } catch (error) {
        console.error('Error in stock notification:', error);
        res.status(500).json({ message: 'Error processing notification request' });
    }
});
// Add this to your server.js file with the other routes

// 📌 ORDERS ROUTES
app.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Error fetching orders' });
    }
});

// Get a specific order by ID
app.get('/orders/:id', validateObjectId, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Error fetching order' });
    }
});

// Get orders by Razorpay order ID
app.get('/orders/razorpay/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        console.error('Error fetching order by Razorpay ID:', error);
        res.status(500).json({ error: 'Error fetching order' });
    }
});
// Endpoint to create an order
app.post('/create-order', authMiddleware, async (req, res) => {
    try {
        const { amount, selectedItems } = req.body;  // Get selected items from request
        console.log('Create order request received with amount:', amount);
        console.log('Selected items:', selectedItems);

        if (!amount || amount <= 0) {
            console.log('Invalid amount provided:', amount);
            return res.status(400).json({ error: "Invalid amount" });
        }

        // Use selected items instead of all cart items
        const cartItems = selectedItems || await Cart.find();
        console.log(`Processing ${cartItems.length} selected items`);

        if (cartItems.length === 0) {
            console.log('No items in cart to create order');
            return res.status(400).json({ error: "No items in cart" });
        }
        

        const options = {
            amount: Math.round(amount * 100), // Convert to paise and ensure it's an integer
            currency: 'INR',
            receipt: 'receipt_' + Date.now()
        };
        
        console.log('Creating Razorpay order with options:', options);

        // Create Razorpay order using Promise instead of callback for better error handling
        try {
            const order = await new Promise((resolve, reject) => {
                razorpayInstance.orders.create(options, (err, orderData) => {
                    if (err) reject(err);
                    else resolve(orderData);
                });
            });
            
            console.log('Razorpay order created successfully:', order);

            // Save order to database
            const orderData = {
                orderId: order.id,
                amount: amount,
                items: cartItems,
                status: 'created',
                date: new Date(),
                userId: req.userId  // Add this line to track which user created the order
            };
            console.log('Saving order to database:', orderData);
            
            const newOrder = new Order(orderData);
            
            try {
                const savedOrder = await newOrder.save();
                console.log('Order saved successfully to database:', savedOrder);
                
                // Double-check if order was saved
                const checkOrder = await Order.findOne({ orderId: order.id });
                if (checkOrder) {
                    console.log('Order verified in database:', checkOrder);
                } else {
                    console.warn('Order not found in database after save!');
                }
                
                return res.json({ 
                    order_id: order.id, 
                    amount: options.amount 
                });
            } catch (saveErr) {
                console.error('Error saving order to database:', saveErr);
                // Return order info but log the error
                return res.json({ 
                    order_id: order.id, 
                    amount: options.amount,
                    warning: 'Order created but database save failed'
                });
            }
        } catch (razorpayErr) {
            console.error('Razorpay order creation error:', razorpayErr);
            return res.status(500).json({ error: "Error creating order with Razorpay" });
        }
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: "Server error" });
    }
});

// Endpoint to verify payment
app.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        console.log('Payment verification request received:', { 
            razorpay_payment_id, 
            razorpay_order_id, 
            razorpay_signature 
        });

        // First check if order exists in our database
        const existingOrder = await Order.findOne({ orderId: razorpay_order_id });
        console.log('Existing order in database:', existingOrder);

        if (!existingOrder) {
            console.warn('Order not found in database, creating new order record');
            const newOrder = new Order({
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                amount: 0,
                items: [],
                status: 'pending_verification'
            });
            await newOrder.save();
            console.log('Created new order record:', newOrder);
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', 'SPXU16kaio4GoLkKmzcgYdUW')  // Using the actual key_secret from your config
                                       .update(body.toString())
                                       .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;
        console.log('Signature verification result:', isAuthentic);
        
        if (isAuthentic) {
            const updatedOrder = await Order.findOneAndUpdate(
                { orderId: razorpay_order_id },
                { 
                    status: 'paid',
                    paymentId: razorpay_payment_id
                },
                { new: true }
            );
            
            console.log('Order updated after successful payment:', updatedOrder);
            
            // Fetch all cart items
            const cartItems = await Cart.find();
            console.log('Cart items to process:', cartItems);
            
            // Check stock availability for all items first
            for (const item of cartItems) {
                const product = await Product.findById(item.productId);
                console.log(`Checking product ${item.productId}:`, product);
                
                if (!product) {
                    console.error(`Product not found: ${item.productId}`);
                    return res.status(400).json({ success: false, message: `Product not found for ${item.name}` });
                }
                
                if (product.instock < item.quantity) {  // Changed from product.stock to product.instock
                    console.error(`Not enough stock for ${product.name}: requested ${item.quantity}, available ${product.instock}`);
                    return res.status(400).json({ success: false, message: `Not enough stock for ${product.name}` });
                }
            }
            
            // If all products have sufficient stock, update inventory
            for (const item of cartItems) {
                const product = await Product.findById(item.productId);
                product.instock -= item.quantity;  // Changed from product.stock to product.instock
                await product.save();
                console.log(`Updated stock for ${product.name}: new stock ${product.instock}`);
            }
            
            // Clear cart after successful payment
            await Cart.deleteMany({});
            console.log('Cart cleared after successful payment');
            
            res.json({ success: true, message: 'Payment verified, stock updated' });
        } else {
            const updatedOrder = await Order.findOneAndUpdate(
                { orderId: razorpay_order_id },
                { status: 'failed' },
                { new: true }
            );
            
            console.log('Order updated after failed payment:', updatedOrder);
            
            res.json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ success: false, message: 'Server error during verification' });
    }
});
// Endpoint to cancel an order
app.post('/cancel-order', authMiddleware, async (req, res) => {
    try {
        const { order_id } = req.body;
        console.log('Cancelling order:', order_id);

        if (!order_id) {
            return res.status(400).json({ success: false, error: "Order ID required" });
        }

        // Update order status to cancelled
        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: order_id },
            { status: 'cancelled' },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, error: "Order not found" });
        }

        console.log('Order cancelled successfully:', updatedOrder);
        return res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

// Start server
app.listen(3000, () => console.log('✅ Server running on http://localhost:3000'));