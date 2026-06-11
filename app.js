// ══════════════════════════════════════════════════════════
// CYNTHIA ORGANIC WELL — App Logic
// ══════════════════════════════════════════════════════════

const STEADFAST_API_KEY    = "gbx0dafkklzaiq7tqfy5e0su0whfay5g";
const STEADFAST_SECRET_KEY = "w5odguix1mkna6bb1z1yqzkc";
const STEADFAST_API_URL    = "https://portal.steadfast.com.bd/api/v1";

let selectedProduct = null;
let submittedPhones = JSON.parse(localStorage.getItem("sinthiya_phones") || "[]");

// ── Render Products ──────────────────────────────────────
function renderProducts() {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = "";
  PRODUCTS.filter(p => p.active).forEach(product => {
    grid.innerHTML += `
      <div class="product-card">
        <span class="product-badge">${product.badge}</span>
        <div class="product-icon">${product.icon}</div>
        <div class="product-name">${product.name}</div>
        <div class="product-desc">${product.description}</div>
        <div class="product-price">৳${product.price.toLocaleString('bn-BD')}</div>
        <div class="product-delivery">🚚 ঢাকা: ৳${DELIVERY.dhaka} | বাইরে: ৳${DELIVERY.outside}</div>
        <button class="order-btn" onclick="openModal('${product.id}')">অর্ডার করুন →</button>
      </div>`;
  });
}

// ── Modal ────────────────────────────────────────────────
function openModal(productId) {
  selectedProduct = PRODUCTS.find(p => p.id === productId);
  const info = document.getElementById("modal-product-info");
  info.innerHTML = `<p>${selectedProduct.icon} <strong>${selectedProduct.name}</strong></p>
    <p style="margin-top:4px;font-size:.85rem;color:#2d6a4f;">${selectedProduct.description}</p>`;
  ["err-name","err-phone","err-address","err-district"].forEach(id => document.getElementById(id).textContent = "");
  ["cust-name","cust-phone","cust-address"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("cust-district").value = "";
  document.getElementById("delivery-info").style.display = "none";
  document.getElementById("total-box").style.display = "none";
  document.getElementById("modal-overlay").classList.add("active");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("active");
  selectedProduct = null;
}

document.getElementById("modal-overlay").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

// ── Delivery Calc ────────────────────────────────────────
function updateDelivery() {
  const district = document.getElementById("cust-district").value;
  if (!district || !selectedProduct) return;
  const deliveryFee = DELIVERY[district];
  const total = selectedProduct.price + deliveryFee;
  const districtText = district === "dhaka" ? "ঢাকার মধ্যে" : "ঢাকার বাইরে";

  document.getElementById("delivery-info").style.display = "block";
  document.getElementById("delivery-info").innerHTML =
    `📦 ${districtText} ডেলিভারি চার্জ: <strong>৳${deliveryFee}</strong>`;

  document.getElementById("total-box").style.display = "block";
  document.getElementById("total-box").innerHTML = `
    <div class="row"><span>পণ্যের মূল্য</span><span>৳${selectedProduct.price}</span></div>
    <div class="row"><span>ডেলিভারি চার্জ</span><span>৳${deliveryFee}</span></div>
    <div class="total-final"><span>সর্বমোট</span><span>৳${total}</span></div>`;
}

// ── Validation ───────────────────────────────────────────
function validate() {
  let ok = true;
  const name    = document.getElementById("cust-name").value.trim();
  const phone   = document.getElementById("cust-phone").value.trim();
  const address = document.getElementById("cust-address").value.trim();
  const district= document.getElementById("cust-district").value;

  if (!name) { document.getElementById("err-name").textContent = "নাম আবশ্যক"; ok = false; }
  else document.getElementById("err-name").textContent = "";

  const phoneReg = /^01[3-9]\d{8}$/;
  if (!phoneReg.test(phone)) {
    document.getElementById("err-phone").textContent = "সঠিক বাংলাদেশি মোবাইল নম্বর দিন";
    ok = false;
  } else document.getElementById("err-phone").textContent = "";

  if (!address || address.length < 10) {
    document.getElementById("err-address").textContent = "বিস্তারিত ঠিকানা দিন";
    ok = false;
  } else document.getElementById("err-address").textContent = "";

  if (!district) { document.getElementById("err-district").textContent = "জেলা নির্বাচন করুন"; ok = false; }
  else document.getElementById("err-district").textContent = "";

  return ok;
}

// ── Duplicate Check ──────────────────────────────────────
function isDuplicate(phone) {
  return submittedPhones.includes(phone);
}

// ── Submit Order ─────────────────────────────────────────
async function submitOrder() {
  if (!validate()) return;

  const name     = document.getElementById("cust-name").value.trim();
  const phone    = document.getElementById("cust-phone").value.trim();
  const address  = document.getElementById("cust-address").value.trim();
  const district = document.getElementById("cust-district").value;

  // Duplicate check
  if (isDuplicate(phone)) {
    document.getElementById("err-phone").textContent =
      "⚠️ এই নম্বর থেকে আগেই অর্ডার হয়েছে। নতুন নম্বর ব্যবহার করুন।";
    return;
  }

  const deliveryFee = DELIVERY[district];
  const total = selectedProduct.price + deliveryFee;
  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "⏳ প্রসেস হচ্ছে...";

  try {
    const payload = {
      invoice:          "SINTH-" + Date.now(),
      recipient_name:   name,
      recipient_phone:  phone,
      recipient_address: address,
      cod_amount:       total,
      note:             selectedProduct.name + " | ডেলিভারি: " + (district === "dhaka" ? "ঢাকা" : "ঢাকার বাইরে")
    };

    const res = await fetch(`${STEADFAST_API_URL}/create_order`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Api-Key":       STEADFAST_API_KEY,
        "Secret-Key":    STEADFAST_SECRET_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.status === 200 || data.consignment) {
      const consignment = data.consignment || {};
      const trackingCode = consignment.tracking_code || consignment.consignment_id || ("TRK" + Date.now());

      // Save to local orders
      saveOrder({ name, phone, address, district, product: selectedProduct.name, price: selectedProduct.price, deliveryFee, total, trackingCode, time: new Date().toISOString(), status: "pending" });

      // Mark phone as used
      submittedPhones.push(phone);
      localStorage.setItem("sinthiya_phones", JSON.stringify(submittedPhones));

      closeModal();
      showSuccess(trackingCode, name, phone, selectedProduct.name, total);
    } else {
      throw new Error(data.message || "API ত্রুটি");
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "✅ অর্ডার কনফার্ম করুন";
    alert("❌ অর্ডার দিতে সমস্যা হয়েছে: " + err.message);
  }
}

// ── Save Order Locally ───────────────────────────────────
function saveOrder(order) {
  const orders = JSON.parse(localStorage.getItem("sinthiya_orders") || "[]");
  orders.unshift(order);
  localStorage.setItem("sinthiya_orders", JSON.stringify(orders));
}

// ── Show Success ─────────────────────────────────────────
function showSuccess(trackingCode, name, phone, productName, total) {
  document.getElementById("tracking-code").textContent = trackingCode;

  const msg = encodeURIComponent(
    `✅ *Cynthia Organic Well – অর্ডার কনফার্মেশন*\n\n` +
    `নাম: ${name}\n` +
    `মোবাইল: ${phone}\n` +
    `পণ্য: ${productName}\n` +
    `মোট: ৳${total} (ক্যাশ অন ডেলিভারি)\n` +
    `ট্র্যাকিং কোড: ${trackingCode}\n\n` +
    `আমাদের সাথে থাকার জন্য ধন্যবাদ! 🌿`
  );

  document.getElementById("whatsapp-confirm-btn").href =
    `https://wa.me/${BUSINESS_WHATSAPP}?text=${msg}`;

  document.getElementById("success-page").classList.add("active");
}

function goBack() {
  document.getElementById("success-page").classList.remove("active");
}

// ── Init ─────────────────────────────────────────────────
renderProducts();
