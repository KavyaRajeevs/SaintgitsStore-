function handleCredentialResponse(response) {
    // Get the base URL dynamically based on the current host
    const baseURL = getBaseAPIUrl();
    
    fetch(`${baseURL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential }),
    })
    .then((res) => res.json())
    .then((data) => {
        if (data.token) {
            // Store token in localStorage
            localStorage.setItem('token', data.token);
            
            // Store email in localStorage
            if (data.email) {
                localStorage.setItem('user_email', data.email);
            }
                
            window.location.href = data.redirect || 'home.html';
        } else {
            console.error('Login failed');
            alert('Login failed. Please try again.');
        }
    })
    .catch((err) => {
        console.error('Error during login:', err);
        alert('An error occurred during login. Please try again.');
    });
}

// Function to determine the base API URL based on current hostname
function getBaseAPIUrl() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // If we're on localhost, use the development server port
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    
    // For ngrok or any other domain, use the same origin but with port 3000
    // If your backend is deployed on the same domain as frontend, you can use relative URLs
    if (hostname.includes('ngrok')) {
        // For ngrok specifically, we need to use https
        return `https://${hostname}`;
    }
    
    // Default to same origin with no specific port
    return window.location.origin;
}

// Existing parseJwt function
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
}