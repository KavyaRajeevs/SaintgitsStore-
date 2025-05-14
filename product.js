document.addEventListener('DOMContentLoaded', function() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        // Redirect to home if no product ID is provided
        window.location.href = 'home.html';
        return;
    }
    else{
        fetchProductDetails(productId);
        // First fetch the current product to get its category
        fetchCurrentProduct(productId)
            .then(product => {
                if (product && product.category) {
                    // Then fetch related products from the same category
                    fetchRelatedProducts(product.category, productId);
                }
            })
            .catch(error => {
                console.error('Error fetching product details:', error);
                // If there's an error fetching, show dummy recommendations for demo purposes
                displayDummyRecommendations();
            });
    }
});

/**
 * Display dummy recommendations when API fails or for testing
 */
function displayDummyRecommendations() {
    const dummyProducts = [
        {
            _id: 'dummy1',
            name: 'Notebook',
            price: 25.00,
            imageUrl: 'images/notebook.jpg'
        },
        {
            _id: 'dummy2',
            name: 'Eraser',
            price: 3.50,
            imageUrl: 'images/eraser.jpg'
        },
        {
            _id: 'dummy3',
            name: 'Ruler',
            price: 10.00,
            imageUrl: 'images/ruler.jpg'
        },
        {
            _id: 'dummy4',
            name: 'Highlighter',
            price: 15.00,
            imageUrl: 'images/highlighter.jpg'
        }
    ];
    
    displayRecommendations(dummyProducts);
}

/**
 * Fetch the current product details
 * @param {string} productId - The ID of the current product
 * @returns {Promise} - Promise resolving to the product object
 */
function fetchCurrentProduct(productId) {
    return fetch(`http://localhost:3000/college_store/${productId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch current product');
            }
            return response.json();
        });
}

/**
 * Fetch products from the same category
 * @param {string} category - The category to fetch related products from
 * @param {string} currentProductId - The ID of the current product to exclude from recommendations
 */
function fetchRelatedProducts(category, currentProductId) {
    fetch(`http://localhost:3000/college_store/category/${category}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch related products');
            }
            return response.json();
        })
        .then(products => {
            // Filter out the current product
            const relatedProducts = products.filter(product => product._id !== currentProductId);
            
            // Display up to 4 related products
            displayRecommendations(relatedProducts.slice(0, 4));
        })
        .catch(error => {
            console.error('Error fetching related products:', error);
            // If there's an error, show dummy recommendations
            displayDummyRecommendations();
        });
}

/**
 * Display the recommended products in the recommendations section
 * @param {Array} products - Array of product objects to display
 */
function displayRecommendations(products) {
    const recommendationsContainer = document.getElementById('recommended-products');
    
    // Clear any existing recommendations
    recommendationsContainer.innerHTML = '';
    
    if (products.length === 0) {
        recommendationsContainer.innerHTML = '<p>No related products found</p>';
        return;
    }
    
    // Create product cards for each recommendation
    products.forEach(product => {
        const productCard = createProductCard(product);
        recommendationsContainer.appendChild(productCard);
    });
}


function createProductCard(product) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    
    // Format price
    const formattedPrice = `Rs.${product.price.toFixed(2)}`;
    
    // Create wishlist icon
    const wishlistIcon = document.createElement('div');
    wishlistIcon.className = 'wishlist-icon';
    wishlistIcon.innerHTML = '<i class="far fa-heart"></i>';
    wishlistIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToWishlist(product._id, product.name, product.price, product.imageUrl);
    });
    
    // Set product HTML - Changed class name from product-image to recommendation-image
    productCard.innerHTML = `
        <a href="product.html?id=${product._id}" class="product-link">
            <div class="recommendation-image">
                <img src="${product.imageUrl}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">${formattedPrice}</p>
            </div>
        </a>
        <div class="product-actions">
            <button class="add-to-cart" onclick="addToCart('${product._id}', '${product.name}', ${product.price}, '${product.imageUrl}', 1)">
                Add to Cart
            </button>
        </div>
    `;
    
    // Add the wishlist icon
    productCard.querySelector('.recommendation-image').appendChild(wishlistIcon);
    
    return productCard;
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = "login.html";
    window.history.replaceState(null, null, "login.html");
}


// Fetch product details from API
async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`http://localhost:3000/college_store/${productId}`);
        if (!response.ok) {
            throw new Error('Product not found');
        }
        
        const product = await response.json();
        displayProductDetails(product);
        
    } catch (error) {
        console.error('Error fetching product details:', error);
        // Display dummy product details for testing/demo purposes
        displayDummyProductDetails();
    }
}

// Display dummy product details when API fails
function displayDummyProductDetails() {
    const dummyProduct = {
        _id: 'dummy123',
        name: 'Pencil',
        instock: 98,
        price: 5.00,
        imageUrl: 'images/pencil.jpg',
        size: 'Medium',
        color: 'black',
        company: 'Apsara'
    };
    
    displayProductDetails(dummyProduct);
}

function showNotificationModal() {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications.");
        return;
    }

    // Request permission for notifications
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            checkStockStatus();
        } else {
            alert("Notifications are blocked. Please allow them in browser settings.");
        }
    });
}

function checkStockStatus() {
    const stockElement = document.getElementById('stock-status');
    const productName = document.getElementById('product-name').textContent;

    if (stockElement.classList.contains('in-stock')) {
        const stockText = stockElement.textContent;
        const stockCount = parseInt(stockText.match(/\d+/)[0]);

        if (stockCount > 0) {
            new Notification("Restocked!", {
                body: `The product "${productName}" is now back in stock!`,
                
            });

            if (stockCount > 10) {
                new Notification("Stock Alert", {
                    body: `The product "${productName}" is now abundantly stocked! Feel free to order.`,
                    
                });
            }
        }
    }
}




// Display product details on the page
function displayProductDetails(product) {
    // Set product image
    document.getElementById('product-img').src = product.imageUrl || 'placeholder.jpg';
    
    // Set product name
    document.getElementById('product-name').textContent = product.name;
    
    // Set stock status with color indication
    const stockStatus = document.getElementById('stock-status');
    if (product.instock > 5) {
        stockStatus.textContent = `In Stock(${product.instock})`;
        stockStatus.className = 'in-stock';
    } else if (product.instock > 0) {
        stockStatus.textContent = `Low Stock(${product.instock})`;
        stockStatus.className = 'low-stock';
    } else {
        stockStatus.textContent = 'Out of Stock';
        stockStatus.className = 'low-stock';
    }
    
    // Set price
    document.getElementById('product-price').textContent = `Rs.${product.price.toFixed(2)}`;
    
    // Set product details
    document.getElementById('product-size').textContent = product.size || 'N/A';
    document.getElementById('product-color').textContent = Array.isArray(product.color) 
        ? product.color.join(', ') 
        : (product.color || 'N/A');
    document.getElementById('product-company').textContent = product.company || 'N/A';
    
    // Set up purchase controls based on stock availability
    const purchaseControls = document.getElementById('purchase-controls');
    
    if (product.instock > 4) {
        // For any stock level above 0, show Add to Cart button
        purchaseControls.innerHTML = `
            <div class="quantity-controls">
                <button id="decrease-qty">-</button>
                <input type="number" id="quantity" value="1" min="1" max="${product.instock}">
                <button id="increase-qty">+</button>
            </div>
            <div class="action-buttons">
                <button id="add-to-cart" class="btn">Add to Cart</button>
                <button id="add-to-wishlist" class="wishlist-btn">
                    <i class="far fa-heart"></i>
                </button>
            </div>
        `;
        
        // Set up quantity controls
        setupQuantityControls(product.instock);
        
        // Set up add to cart button
        document.getElementById('add-to-cart').addEventListener('click', () => {
            addToCart(product._id, product.name, product.price, product.imageUrl);
        });
        
        // Set up wishlist button
        document.getElementById('add-to-wishlist').addEventListener('click', () => {
            addToWishlist(product._id, product.name, product.price, product.imageUrl);
        });
    } else {
        // Only for completely out of stock (instock = 0) - show notify button
        purchaseControls.innerHTML = `
            <button id="notify-btn" class="btn">Notify Me When Available</button>
            <button id="add-to-wishlist" class="wishlist-btn">
                <i class="far fa-heart"></i>
            </button>
        `;
        
        // Set up notify button
        document.getElementById('notify-btn').addEventListener('click', showNotificationModal);
        
        // Set up wishlist button
        document.getElementById('add-to-wishlist').addEventListener('click', () => {
            addToWishlist(product._id, product.name, product.price, product.imageUrl);
        });
    }
}

// Set up quantity controls
function setupQuantityControls(maxStock) {
    const decreaseBtn = document.getElementById('decrease-qty');
    const increaseBtn = document.getElementById('increase-qty');
    const quantityInput = document.getElementById('quantity');
    
    decreaseBtn.addEventListener('click', () => {
        let currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        }
    });
    
    increaseBtn.addEventListener('click', () => {
        let currentValue = parseInt(quantityInput.value);
        if (currentValue < maxStock) {
            quantityInput.value = currentValue + 1;
        }
    });
    
    quantityInput.addEventListener('change', () => {
        let currentValue = parseInt(quantityInput.value);
        if (isNaN(currentValue) || currentValue < 1) {
            quantityInput.value = 1;
        } else if (currentValue > maxStock) {
            quantityInput.value = maxStock;
        }
    });
}

// Add product to cart
async function addToCart(productId, name, price, imageUrl) {
    try {
        const quantity = document.getElementById('quantity') ? 
            parseInt(document.getElementById('quantity').value) : 1;
        
        // If running locally, just show success alert
        if (window.location.protocol === 'file:') {
            alert('Product added to cart successfully!');
            return;
        }
        
        const response = await fetch('http://localhost:3000/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                productId,
                name,
                price,
                imageUrl,
                quantity,
                color: document.getElementById('product-color') ? 
                    document.getElementById('product-color').textContent : ''
            })
        });
        
        if (response.ok) {
            alert('Product added to cart successfully!');
        } else {
            throw new Error('Failed to add product to cart');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Failed to add product to cart. Please try again.');
    }
}

// Add product to wishlist
async function addToWishlist(productId, name, price, imageUrl) {
    try {
        // If running locally, just show success alert and update icon
        if (window.location.protocol === 'file:') {
            alert('Product added to wishlist!');
            const wishlistIcons = document.querySelectorAll('.wishlist-btn i, .wishlist-icon i, .wishlist-btn-sm i');
            wishlistIcons.forEach(icon => {
                icon.className = 'fas fa-heart';
            });
            return;
        }
        
        const response = await fetch('http://localhost:3000/wishlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                productId,
                name,
                price,
                imageUrl,
                color: document.getElementById('product-color') ? 
                    document.getElementById('product-color').textContent : ''
            })
        });
        
        if (response.ok) {
            alert('Product added to wishlist!');
            // Change heart icon to filled
            const wishlistBtn = document.querySelector('#add-to-wishlist i');
            if (wishlistBtn) {
                wishlistBtn.className = 'fas fa-heart';
            }
        } else {
            throw new Error('Failed to add product to wishlist');
        }
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        alert('Failed to add product to wishlist. Please try again.');
    }
}


// View product details
function viewProductDetails(productId) {
    window.location.href = `product.html?id=${productId}`;
}