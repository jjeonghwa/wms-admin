/* public/js/app.js */
let productMap = {};
let barcodeMap = {};

// 🧭 상단 메뉴 변경 처리 구조 (기존 CSS 레이아웃 호환)
function switchMenu(viewId) {
    document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    if(viewId === 'inventory-view') {
        document.getElementById('menu-inventory').classList.remove('inactive');
        document.getElementById('menu-admin').classList.add('inactive');
        updateDashboard();
    } else {
        document.getElementById('menu-inventory').classList.add('inactive');
        document.getElementById('menu-admin').classList.remove('inactive');
        loadAdmins();
    }
}

// 입출고 분기에 따른 소비기한 필드 토글
document.getElementById('txType').addEventListener('change', function(e) {
    const expGroup = document.getElementById('expGroup');
    expGroup.style.display = e.target.value === '출고' ? 'none' : 'block';
});

// 메인 대시보드 API 통신
async function updateDashboard() {
    const res = await fetch('/api/inventory');
    const data = await res.json();
    
    const invTbody = document.getElementById('inventoryTable');
    invTbody.innerHTML = '';
    barcodeMap = {};
    
    data.inventory.forEach(item => {
        productMap[item.id] = item.name;
        if(item.barcode !== '등록없음') barcodeMap[item.barcode] = item.id;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${item.id}</code></td>
            <td><strong>${item.name}</strong></td>
            <td><small style="color:#718096; font-family:monospace;">${item.barcode}</small></td>
            <td><span style="color:#2b6cb0; font-weight:bold;">${item.currentStock.toLocaleString()}</span> EA</td>
            <td>${item.avgInboundPrice.toLocaleString()} 원</td>
            <td>${item.totalAssetValue.toLocaleString()} 원</td>
            <td><mark style="background:#edf2f7; padding:2px 6px; border-radius:4px;">${item.location}</mark></td>
            <td><span class="alert-exp">${item.expirationDate}</span></td>
        `;
        invTbody.appendChild(tr);
    });

    const select = document.getElementById('txProduct');
    const currentVal = select.value;
    select.innerHTML = '';
    data.inventory.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name;
        select.appendChild(opt);
    });
    if(currentVal) select.value = currentVal;

    const histTbody = document.getElementById('historyTable');
    histTbody.innerHTML = '';
    data.history.forEach(log => {
        const tr = document.createElement('tr');
        const badge = log.type === '입고' ? '<span class="badge-in">Inbound</span>' : '<span class="badge-out">Outbound</span>';
        tr.innerHTML = `
            <td><small>${log.date}</small></td>
            <td>${productMap[log.productId] || log.productId}</td>
            <td>${badge}</td>
            <td>${log.quantity} EA</td>
            <td>${log.price.toLocaleString()} 원</td>
            <td><code>${log.location}</code></td>
            <td><small style="color:#e53e3e;">${log.expirationDate || '-'}</small></td>
            <td style="color: #718096; font-size:13px;">${log.note || '-'}</td>
        `;
        histTbody.appendChild(tr);
    });
}

// WMS 관리자 데이터 조회
async function loadAdmins() {
    const res = await fetch('/api/admins');
    const admins = await res.json();
    const tbody = document.getElementById('adminTable');
    tbody.innerHTML = '';

    admins.forEach(admin => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${admin.id}</code></td>
            <td><strong>${admin.adminName}</strong></td>
            <td><span style="color:#2b6cb0; font-weight:bold;">${admin.role}</span></td>
            <td>${admin.department}</td>
            <td><small>${admin.createdAt}</small></td>
            <td><button onclick="deleteAdmin('${admin.id}')" style="background:#e53e3e; color:white; border:none; padding:6px 10px; font-size:12px; width:auto; border-radius:4px; cursor:pointer;">권한 해제</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// 신규 운영진 등록
document.getElementById('adminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const adminName = document.getElementById('adminName').value;
    const role = document.getElementById('adminRole').value;
    const department = document.getElementById('adminDept').value;

    await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName, role, department })
    });
    document.getElementById('adminForm').reset();
    loadAdmins();
});

// 운영진 삭제
async function deleteAdmin(id) {
    if(!confirm('해당 관리자의 권한을 즉시 정지하시겠습니까?')) return;
    await fetch(`/api/admins/${id}`, { method: 'DELETE' });
    loadAdmins();
}

// 카메라 스캐너 바코드 매칭 핸들러
function onScanSuccess(decodedText, decodedResult) {
    const targetProductId = barcodeMap[decodedText];
    if (targetProductId) {
        document.getElementById('txProduct').value = targetProductId;
        alert("✅ 바코드 스캔 완료 완료");
    } else {
        alert(`⚠️ 미인가 일련번호: ${decodedText}`);
    }
}

let html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess);

// 신규 SKU 등록
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newProductName').value;
    const barcode = document.getElementById('newProductBarcode').value;
    const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, barcode })
    });
    if(!response.ok) return alert((await response.json()).error);
    document.getElementById('productForm').reset();
    updateDashboard();
});

// 트랜잭션 폼 바인딩
document.getElementById('txForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const productId = document.getElementById('txProduct').value;
    const type = document.getElementById('txType').value;
    const quantity = document.getElementById('txQuantity').value;
    const price = document.getElementById('txPrice').value;
    const expirationDate = document.getElementById('txExpiration').value;
    const location = document.getElementById('txLocation').value;
    const note = document.getElementById('txNote').value;

    await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, type, quantity, price, expirationDate, location, note })
    });
    document.getElementById('txForm').reset();
    updateDashboard();
});

updateDashboard();