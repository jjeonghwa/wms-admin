const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');

const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// 📦 1. 실시간 보유 자산 및 바코드/로케이션 스태터스 조회
app.get('/api/inventory', (req, res) => {
    const products = readJSON(PRODUCTS_FILE);
    const history = readJSON(HISTORY_FILE);

    const inventoryStatus = products.map(prod => {
        const prodHistory = history.filter(h => h.productId === prod.id);
        
        let currentStock = 0;
        let totalCostOfCurrentStock = 0;
        let locations = new Set();
        let closeExpiration = "N/A"; 

        const inboundItems = prodHistory.filter(h => h.type === '입고');
        if (inboundItems.length > 0) {
            const sortedExp = inboundItems
                .map(h => h.expirationDate)
                .filter(exp => exp)
                .sort();
            if(sortedExp.length > 0) closeExpiration = sortedExp;
        }

        prodHistory.forEach(action => {
            if (action.type === '입고') {
                currentStock += action.quantity;
                totalCostOfCurrentStock += (action.quantity * action.price);
                if(action.location) locations.add(action.location);
            } else if (action.type === '출고') {
                currentStock -= action.quantity;
                if (currentStock < 0) currentStock = 0;
            }
        });

        const avgInboundPrice = currentStock > 0 ? Math.round(totalCostOfCurrentStock / (inboundItems.reduce((acc, h) => acc + h.quantity, 0) || 1)) : 0;

        return {
            id: prod.id,
            name: prod.name,
            barcode: prod.barcode || '등록없음',
            currentStock,
            avgInboundPrice,
            totalAssetValue: currentStock * avgInboundPrice,
            location: locations.size > 0 ? Array.from(locations).join(', ') : '미지정',
            expirationDate: currentStock > 0 ? closeExpiration : '재고없음'
        };
    });

    res.json({ inventory: inventoryStatus, history: history.reverse() });
});

// ➕ 2. 신규 SKU 마스터 등록 (바코드 데이터 포함)
app.post('/api/products', (req, res) => {
    const { name, barcode } = req.body;
    const products = readJSON(PRODUCTS_FILE);
    
    // 바코드 중복 검사
    if (products.some(p => p.barcode === barcode)) {
        return res.status(400).json({ error: "이미 등록된 바코드 번호입니다." });
    }

    const newProduct = { 
        id: 'SKU-' + Date.now().toString().slice(-6), 
        name,
        barcode: barcode || 'BC-' + Date.now().toString().slice(-4) // 바코드 미입력 시 임시 생성
    };
    products.push(newProduct);
    writeJSON(PRODUCTS_FILE, products);
    res.status(201).json(newProduct);
});

// 🔄 3. 물류 트랜잭션 기록 API
app.post('/api/transaction', (req, res) => {
    const { productId, type, quantity, price, expirationDate, location, note } = req.body;
    const history = readJSON(HISTORY_FILE);

    const newLog = {
        id: 'TX-' + Date.now().toString().slice(-6),
        productId,
        type, 
        quantity: parseInt(quantity),
        price: parseInt(price), 
        expirationDate: type === '입고' ? expirationDate : '', 
        location: location || '기본 세션', 
        note, 
        date: new Date().toLocaleString('ko-KR')
    };

    history.push(newLog);
    writeJSON(HISTORY_FILE, history);
    res.status(201).json({ message: "WMS 로깅 시스템 반영 완료", log: newLog });
});

app.listen(PORT, () => console.log(`🚀 Open-Source WMS 구동 중: http://localhost:${PORT}`));