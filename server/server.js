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

// 📦 1. 글로벌 표준 실시간 자산 및 랙(Rack)별 로케이션 현황 조회
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
            currentStock,
            avgInboundPrice,
            totalAssetValue: currentStock * avgInboundPrice,
            location: locations.size > 0 ? Array.from(locations).join(', ') : '미지정',
            expirationDate: currentStock > 0 ? closeExpiration : '재고없음'
        };
    });

    res.json({ inventory: inventoryStatus, history: history.reverse() });
});

// 신규 SKU 등록
app.post('/api/products', (req, res) => {
    const { name } = req.body;
    const products = readJSON(PRODUCTS_FILE);
    const newProduct = { id: 'SKU-' + Date.now().toString().slice(-6), name };
    products.push(newProduct);
    writeJSON(PRODUCTS_FILE, products);
    res.status(201).json(newProduct);
});

// 🔄 2. 트랜잭션 API (표준 사양 버전)
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