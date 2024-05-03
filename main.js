document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    updateBasketCount();
    updateTheNavigationBar();
    const flowerId = new URLSearchParams(window.location.search).get('id');
    if (flowerId) {
        console.log("Flower ID present: ", flowerId);
        loadFlowerDetails(flowerId);
    } else {
        console.log("Loading all flowers because no specific flower ID was found");
        loadFlowers();
    }
    if (window.location.pathname.includes('checkout.html')) {
        console.log("On checkout page, attempting to load order summary");
        loadOrderSummary();
    }
});

async function loadFlowers() {
    const flowerType = document.getElementById('flowerType').value;
    const occasion = document.getElementById('occasion').value;
    const color = document.getElementById('color').value;
    const sort = document.getElementById('sort').value;

    try {
        const response = await fetch(`${configuration.host()}/flowers?flowerType=${flowerType}&occasion=${occasion}&color=${color}&sort=${sort}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${configuration.token()}`, // Ensure this token is correctly retrieved and valid
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch flowers');
        const flowers = await response.json();
        displayFlowers(flowers);
    } catch (error) {
        console.error('Failed to load flowers:', error);
    }
}

function displayFlowers(flowers) {
    const flowerList = document.getElementById('flowerList');
    flowerList.innerHTML = '';

    flowers.forEach(flower => {
        const flowerDiv = document.createElement('div');
        flowerDiv.className = "flower";
        flowerDiv.innerHTML = `
            <h3>${flower.name}</h3>
            <img id="img-${flower.id}" alt="Image of ${flower.name}" style="width:100px; height:100px;">
            <p>Type: ${flower.type}</p>
            <p>Color: ${flower.color}</p>
            <button onclick='storeFlowerData(${JSON.stringify(flower)})'>Add to Basket</button>
        `;
        flowerList.appendChild(flowerDiv);

        // Ensure the image is loaded correctly
        loadImage(flower.id);
    });
}

function loadImage(flowerId) {
    const imgElement = document.getElementById(`img-${flowerId}`);
    const imageUrl = `${configuration.host()}/flowers/${flowerId}/image`;
    fetch(imageUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${configuration.token()}`,
            'Accept': 'image/jpeg'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        } else {
            throw new Error(`Failed to load image with status: ${response.status}`);
        }
    })
    .then(blob => {
        imgElement.src = URL.createObjectURL(blob);
    })
    .catch(error => {
        console.error(`Error loading image ${flowerId}:`, error);
        imgElement.alt = 'Failed to load image';
    });
}

function storeFlowerData(flower) {
    localStorage.setItem('selectedFlower', JSON.stringify(flower));
    window.location.href = 'add-to-basket.html'; // Redirect to add-to-basket page
}



function updateBasketCount() {
    const basketCountElement = document.getElementById('basketCount');
    if (!basketCountElement) return; // Exit if no element found
    const basket = JSON.parse(localStorage.getItem('basket') || '{}');
    const count = Object.keys(basket).length; // Simplified to count keys in the object
    basketCountElement.innerText = count;
}

function applyFilters() {
    loadFlowers(); // Re-fetch flowers with new filters
}

function addToBasket() {
    const flowerId = new URLSearchParams(window.location.search).get('id');
    const deliveryDate = document.getElementById('deliveryDate').value; // Assuming delivery date is needed somewhere, though not saved in the order directly
    const flowerName = document.getElementById('flowerName').innerText; // Assuming there's an element displaying the flower's name
    const price = parseFloat(document.getElementById('flowerPrice').innerText.replace('$', '')); // Assuming there's an element with the flower's price

    if (!deliveryDate) {
        alert('Please select a delivery date.');
        return;
    }

    const basketItem = {
        flowerId,
        flowerName,
        price,
        recipientName: "", // This could be input by the user on the checkout page
        deliveryDate
    };

    localStorage.setItem('basket', JSON.stringify(basketItem));
    alert('Added to basket successfully!');
    window.location.href = 'checkout.html'; // Redirect to the checkout page
}

async function checkout() {
    const basket = JSON.parse(localStorage.getItem('basket') || '{}');
    if (!basket) {
        alert('No items in the basket');
        return;
    }

    try {
        const response = await fetch(`${configuration.host()}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${configuration.token()}`
            },
            body: JSON.stringify({
                flowerId: basket.flowerId
                // Ensure you have the customerId or other required fields if needed
            })
        });

        if (!response.ok) throw new Error('Failed to place order');
        alert('Order placed successfully');
        localStorage.removeItem('basket');
        updateBasketCount();
    } catch (error) {
        console.error('Failed to place order:', error);
    }
}

function loadFlowerDetails(flowerId) {
    fetch(`${configuration.host()}/flowers/${flowerId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${configuration.token()}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(flower => {
        const detailsContainer = document.getElementById('flowerDetails');
        detailsContainer.innerHTML = `
            <h2>${flower.name}</h2>
            <img src="${configuration.host()}/flowers/${flower.id}/image" alt="Image of ${flower.name}" style="width:200px; height:200px;">
            <p>Type: ${flower.type}</p>
            <p>Price: $${flower.price}</p>
            <label for="deliveryDate">Delivery Date:</label>
            <input type="date" id="deliveryDate" required>
            <button onclick="addToBasket(${flower.id})">Add to Basket</button>
        `;
    })
    .catch(error => console.error('Failed to load flower details:', error));
}

function loadOrderSummary() {
    console.log("loadOrderSummary called");
    const basket = JSON.parse(localStorage.getItem('basket') || '{}');
    console.log("Basket contents: ", basket);
    const orderDetails = document.getElementById('orderDetails');
    if (!orderDetails) {
        console.error("orderDetails element not found on this page.");
        return;
    }
    if (!basket || Object.keys(basket).length === 0) {
        console.log("No items in basket, redirecting...");
        alert('No items in the basket');
        window.location.href = 'index.html';
        return;
    }
    orderDetails.innerHTML = `
        <p>Flower Name: ${basket.flowerName}</p>
        <p>Delivery Date: ${basket.deliveryDate}</p>
        <p>Price: $${basket.price}</p>
        <p>Delivery Fee: $25</p>
        <p>Total: $${basket.isLoggedIn ? basket.price + 25 - 10 : basket.price + 25}</p>
    `;
}

function placeOrder() {
    // Log the basket content
    const basket = JSON.parse(localStorage.getItem('basket') || '{}');
    console.log('Basket Content:', basket);

    // Checking if the basket is empty or required properties are missing
    if (!basket || !basket.flowerId || !basket.price) {
        console.error('No items in the basket or basket data is incomplete');
        alert('No items in the basket or basket data is incomplete');
        return;
    }

    // Attempt to retrieve the recipient name and log it
    const recipientNameElement = document.getElementById('recipientName');
    console.log('Recipient Name Element:', recipientNameElement);
    // Validate recipientNameElement before proceeding
    if (!recipientNameElement) {
        console.error('Recipient name input element not found');
        alert('Recipient name input element not found');
        return;
    }
    const recipientName = recipientNameElement.value;
    if (!recipientName) {
        alert('Please enter a recipient name.');
        return;
    }
    // Prepare the order data
    const orderData = {
        flowerId: parseInt(basket.flowerId),
        recipientName: recipientName,
        totalCost: basket.price  // Ensure this is a float as your backend expects
    };
    console.log('Order Data:', orderData);
    // Proceed with the fetch call
    fetch(`${configuration.host()}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${configuration.token()}`
        },
        body: JSON.stringify(orderData)
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to place order: ' + response.statusText);
        }
        return response.json();
    }).then(data => {
        console.log('Order placed successfully', data);
        alert('Order placed successfully');
        localStorage.removeItem('basket');
        updateBasketCount();
        window.location.href = 'track-order.html';
    }).catch(error => {
        console.error('Failed to place order:', error);
        alert('Failed to place order: ' + error.message);
    });
}



async function loadOrders() {
    if (!configuration.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${configuration.host()}/orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${configuration.token()}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch orders');
        const orders = await response.json();
        displayOrders(orders);
    } catch (error) {
        console.error('Failed to load orders:', error);
    }
}

function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = orders.map(order => `
        <div>
            <h3>${order.flowerName} - $${order.totalCost}</h3>
            <p>Recipient: ${order.recipientName}</p>
            <p>Status: ${order.status}</p>
        </div>
    `).join('');
}


