document.addEventListener('DOMContentLoaded', function() {
    // Fetch products when page loads
      // Fetch products when page loads
      fetchProducts();
    
      // Set up event listener for search button
      document.getElementById('search-button').addEventListener('click', searchProduct);
      
      // Set up event listener for search input (pressing Enter)
      document.getElementById('search-input').addEventListener('keypress', function(event) {
          if (event.key === 'Enter') {
              searchProduct();
          }
      });
      
      // Load user profile info if available
    //   loadUserProfile();
  });
  

// ✅ Fetch all products on page load
async function fetchProducts() {
    const res = await fetch('http://localhost:3000/college_store');
    const products = await res.json();

    const container = document.getElementById('product-container');
    container.innerHTML = '';

    products.forEach(product => {
        container.innerHTML += `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.imageUrl}" alt="${product.name}">
                    <button class="icon-btn wishlist-btn" onclick="addToWishlist('${product._id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.imageUrl}')">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="icon-btn view-btn" onclick="viewProduct('${product._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p class="price">₹${product.price}</p>
                    <button class="add-to-cart-btn" onclick="addToCart('${product._id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.imageUrl}')">
                        Add To Cart
                    </button>
                </div>
            </div>
        `;
    });
}

// ✅ View Product Details Page
function viewProduct(id) {
    window.location.href = `product.html?id=${id}`;
}

// ✅ Add Product to Cart
async function addToCart(id, name, price, imageUrl) {
    await fetch('http://localhost:3000/cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            productId: id,
            name: name,
            price: price,
            imageUrl: imageUrl,
            quantity: 1
        })
    });
    alert('✅ Successfully added to cart!');
}

// ✅ Search Product by Name/Category/Color
async function searchProduct() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value;

    if(query.trim() === "") {
        fetchProducts();
        return;
    }

    const res = await fetch(`http://localhost:3000/college_store/search?name=${encodeURIComponent(query)}`);
    const products = await res.json();

    const container = document.getElementById('product-container');
    container.innerHTML = '';

    if(products.length === 0) {
        container.innerHTML = `<h3>No products found for "${query}"</h3>`;
        return;
    }

    products.forEach(product => {
        container.innerHTML += `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.imageUrl}" alt="${product.name}">
                    <button class="icon-btn wishlist-btn" onclick="addToWishlist('${product._id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.imageUrl}')">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="icon-btn view-btn" onclick="viewProduct('${product._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p class="price">₹${product.price}</p>
                    <button class="add-to-cart-btn" onclick="addToCart('${product._id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.imageUrl}')">
                        Add To Cart
                    </button>
                </div>
            </div>
        `;
    });
}

// ✅ Filter Products by Category
async function filterCategory(category) {
    const res = await fetch(`http://localhost:3000/college_store/category/${encodeURIComponent(category)}`);
    const products = await res.json();
    
    const container = document.getElementById('product-container');
    container.innerHTML = '';

    products.forEach(product => {
        container.innerHTML += `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.imageUrl}" alt="${product.name}">
                    <button class="icon-btn wishlist-btn" onclick="addToWishlist('${product._id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.imageUrl}')">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="icon-btn view-btn" onclick="viewProduct('${product._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p class="price">₹${product.price}</p>
                    <button class="add-to-cart-btn" onclick="addToCart('${product._id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.imageUrl}')">
                        Add To Cart
                    </button>
                </div>
            </div>
        `;
    });
}

async function addToWishlist(id, name, price, imageUrl) {
    await fetch('http://localhost:3000/wishlist', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            productId: id,
            name: name,
            price: price,
            imageUrl: imageUrl
        })
    });
    alert('💖 Successfully added to Wishlist!');
}