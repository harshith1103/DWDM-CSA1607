/**
 * Product Reviews & Ratings Frontend Module
 */

let activeReviewProductKey = null;

async function safeFetchJson(res) {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.includes('<html')) {
            throw new Error('Server returned HTML instead of JSON. Please make sure the Node backend server is running and restarted.');
        }
        throw new Error(`Unexpected server response: ${text.slice(0, 100)}`);
    }
    return await res.json();
}

async function openProductReviewsModal(productKey, productName, imageURL, category, price, avgRating) {
    activeReviewProductKey = productKey;

    document.getElementById('modal-product-title').innerText = productName;
    const imgContainer = document.getElementById('modal-product-img');
    if (imgContainer) {
        imgContainer.innerHTML = window.renderProductImageHTML ? window.renderProductImageHTML(imageURL, '📦', '48px', '48px') : (imageURL || '📦');
    }
    document.getElementById('modal-product-cat').innerText = category;
    document.getElementById('modal-product-price').innerText = `$${parseFloat(price).toFixed(2)}`;
    document.getElementById('modal-product-rating').innerText = `⭐ ${parseFloat(avgRating).toFixed(1)}`;

    const wikiBtn = document.getElementById('modal-product-wiki-btn');
    if (wikiBtn) {
        wikiBtn.href = `https://www.google.com/search?q=${encodeURIComponent(productName + ' features specifications wikipedia')}`;
    }

    const commentInput = document.getElementById('review-comment-input');
    if (commentInput) commentInput.value = '';
    const ratingSelect = document.getElementById('review-rating-select');
    if (ratingSelect) ratingSelect.value = '5';

    document.getElementById('modal-reviews').classList.add('active');

    await fetchAndRenderReviews(productKey);
}

function closeProductReviewsModal() {
    document.getElementById('modal-reviews').classList.remove('active');
    activeReviewProductKey = null;
}

async function fetchAndRenderReviews(productKey) {
    const reviewsListContainer = document.getElementById('reviews-list-container');
    reviewsListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading reviews...</div>';

    try {
        const res = await fetch(`/api/reviews/${productKey}`);
        const data = await safeFetchJson(res);

        if (!res.ok) throw new Error(data.error || 'Failed to load reviews');

        document.getElementById('modal-review-count').innerText = `${data.reviewCount} Reviews`;
        document.getElementById('modal-product-rating').innerText = `⭐ ${data.avgRating.toFixed(1)}`;

        if (data.reviews.length === 0) {
            reviewsListContainer.innerHTML = `
                <div style="color: var(--text-dim); font-size: 13px; text-align: center; padding: 20px 0;">
                    <i class="ri-chat-voice-line" style="font-size: 32px; display: block; margin-bottom: 8px; color: var(--text-dim);"></i>
                    No reviews yet for this product. Be the first customer to leave a review!
                </div>
            `;
            return;
        }

        reviewsListContainer.innerHTML = data.reviews.map(r => `
            <div class="glass-card" style="padding: 12px 16px; margin-bottom: 10px; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.06);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 600; font-size: 13px; color: var(--text-bright);">${escapeHtml(r.CustomerName)}</span>
                    <span style="color: #f59e0b; font-size: 12px; font-weight: 700;">${'★'.repeat(r.Rating)}${'☆'.repeat(5 - r.Rating)} (${r.Rating}/5)</span>
                </div>
                <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 4px 0;">"${escapeHtml(r.Comment || 'Great product!')}"</p>
                <div style="font-size: 11px; color: var(--text-dim);">${new Date(r.CreatedAt).toLocaleDateString()}</div>
            </div>
        `).join('');

    } catch (err) {
        reviewsListContainer.innerHTML = `<div style="color: var(--accent-rose); font-size: 13px; padding: 10px 0;">${err.message}</div>`;
    }
}

async function submitProductReview(e) {
    if (e) e.preventDefault();

    if (!currentUser || currentUser.role !== 'customer') {
        alert('Please log in as a Customer to submit product reviews.');
        openAuthModal();
        return;
    }

    if (!activeReviewProductKey) return;

    const rating = document.getElementById('review-rating-select').value;
    const comment = document.getElementById('review-comment-input').value.trim();

    try {
        const token = localStorage.getItem('shoplytics_token');
        const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productKey: activeReviewProductKey,
                rating: parseInt(rating),
                comment
            })
        });

        const data = await safeFetchJson(res);
        if (!res.ok) throw new Error(data.error || 'Failed to submit review');

        alert('Thank you! Your product review and rating have been posted.');
        document.getElementById('review-comment-input').value = '';

        // Reload reviews & update product store view
        await fetchAndRenderReviews(activeReviewProductKey);
        if (window.loadStoreProducts) window.loadStoreProducts();

    } catch (err) {
        alert(err.message);
    }
}

// -------------------------------------------------------------
// Combined Post-Delivery Volunteer & Product Rating Logic
// -------------------------------------------------------------
let activePostDeliveryItems = [];

function openPostDeliveryReviewModal(orderId, volunteerId, volunteerName, orderNumber, itemsJsonStr) {
    document.getElementById('post-review-order-id').value = orderId;
    document.getElementById('post-review-volunteer-id').value = volunteerId || 3;
    document.getElementById('post-review-order-number').innerText = `Order #${orderNumber}`;
    document.getElementById('post-review-volunteer-name').innerText = volunteerName || 'Alex Volunteer Agent';

    document.getElementById('post-volunteer-rating').value = '5';
    document.getElementById('post-volunteer-comment').value = '';

    try {
        activePostDeliveryItems = JSON.parse(itemsJsonStr);
    } catch (e) {
        activePostDeliveryItems = [];
    }

    const container = document.getElementById('post-products-review-container');
    if (container) {
        if (activePostDeliveryItems.length === 0) {
            container.innerHTML = `<div style="font-size: 12px; color: var(--text-dim);">No product items found for rating.</div>`;
        } else {
            container.innerHTML = activePostDeliveryItems.map((item, idx) => `
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 700; font-size: 13px; color: var(--text-bright);">
                            ${item.ImageURL || '📦'} ${escapeHtml(item.ProductName)}
                        </span>
                        <input type="hidden" id="prod-key-${idx}" value="${item.ProductKey}">
                    </div>

                    <div style="margin-bottom: 8px;">
                        <label style="font-size: 11px; color: var(--text-muted);">Product Rating:</label>
                        <select class="form-select" id="prod-rating-${idx}" style="width: 100%; margin-top: 2px;">
                            <option value="5">⭐⭐⭐⭐⭐ (5 Stars - Outstanding Quality)</option>
                            <option value="4">⭐⭐⭐⭐ (4 Stars - Good Product)</option>
                            <option value="3">⭐⭐⭐ (3 Stars - Average)</option>
                            <option value="2">⭐⭐ (2 Stars - Disappointing)</option>
                            <option value="1">⭐ (1 Star - Poor)</option>
                        </select>
                    </div>

                    <div>
                        <label style="font-size: 11px; color: var(--text-muted);">Product Review Comment:</label>
                        <textarea class="form-input" id="prod-comment-${idx}" rows="2" style="width: 100%; margin-top: 2px; font-family: inherit; resize: vertical;" placeholder="Write product feedback..."></textarea>
                    </div>
                </div>
            `).join('');
        }
    }

    document.getElementById('modal-post-delivery-review').classList.add('active');
}

function closePostDeliveryReviewModal() {
    document.getElementById('modal-post-delivery-review').classList.remove('active');
}

async function submitPostDeliveryReview(e) {
    if (e) e.preventDefault();

    const orderId = document.getElementById('post-review-order-id').value;
    const volunteerId = document.getElementById('post-review-volunteer-id').value;
    const vRating = document.getElementById('post-volunteer-rating').value;
    const vComment = document.getElementById('post-volunteer-comment').value.trim();

    const token = localStorage.getItem('shoplytics_token');
    if (!token) {
        alert('Please sign in as customer to submit ratings.');
        return;
    }

    let successCount = 0;

    // 1. Submit Volunteer Rating & Review
    try {
        const vRes = await fetch('/api/reviews/volunteer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                orderId: parseInt(orderId),
                volunteerUserId: parseInt(volunteerId),
                rating: parseInt(vRating),
                comment: vComment
            })
        });

        const vData = await safeFetchJson(vRes);
        if (!vRes.ok) throw new Error(vData.error || 'Failed volunteer review submission');
        successCount++;
    } catch (err) {
        console.error('Volunteer review error:', err);
    }

    // 2. Submit Product Ratings & Reviews
    for (let i = 0; i < activePostDeliveryItems.length; i++) {
        const pKey = document.getElementById(`prod-key-${i}`)?.value;
        const pRating = document.getElementById(`prod-rating-${i}`)?.value;
        const pComment = document.getElementById(`prod-comment-${i}`)?.value.trim();

        if (pKey && pRating) {
            try {
                const pRes = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        productKey: parseInt(pKey),
                        rating: parseInt(pRating),
                        comment: pComment
                    })
                });

                const pData = await safeFetchJson(pRes);
                if (pRes.ok) successCount++;
            } catch (err) {
                console.error(`Product ${pKey} review error:`, err);
            }
        }
    }

    // Mark feedback as submitted (ALLOW ONLY 1 SUBMISSION PER ORDER)
    localStorage.setItem(`submitted_feedback_${orderId}`, 'true');

    alert('🎉 Thank you! Your Ratings & Reviews for both the Volunteer Delivery Agent and Products have been submitted successfully! (1 Feedback Allowed per Order)');
    closePostDeliveryReviewModal();

    if (window.loadCustomerOrders) window.loadCustomerOrders();
    if (window.loadCustomerProfileView) window.loadCustomerProfileView();
    if (window.loadStoreProducts) window.loadStoreProducts();
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

