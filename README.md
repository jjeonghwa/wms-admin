# 🌐 Next-Gen Fulfillment WMS (물류관리시스템)

이커머스 및 대형 풀필먼트 센터의 실시간 물류 흐름을 관리하기 위한 가볍고 강력한 Node.js 기반 WMS 프로토타입입니다. 

## 🚀 핵심 아키텍처 및 도메인 특징
- **유동적 자산 가치 평가 (Moving Average)**: 실시간으로 변동되는 인바운드(입고) 매입 단가를 반영하여 창고에 남은 보유 자산 가치를 실시간으로 이동평균법에 의해 산출합니다.
- **멀티 로케이션 트래킹 (Multi-Location Track)**: 세션별 모바일 토트(Tote) 및 고정 랙(Rack Area) 구역을 매핑하여 실시간 동선을 관리할 수 있는 데이터 구조를 지원합니다.
- **선입선출 기반 신선도 제어 (Freshness Lifecycle)**: 인바운드 시 입력된 소비 기한을 오름차순으로 자동 정렬하여 가장 임박한 재고 스태터스를 최우선 화면에 노출합니다.
- **데이터 불변성 (Audit Trail)**: 수량을 직접 수정하는 방식 대신, 모든 입/출고 흐름을 독립된 트랜잭션 데이터로 누적하는 실시간 원장 관리 방식을 채택하였습니다.

## 🛠️ Tech Stack
- **Backend**: Node.js, Express
- **Database**: JSON File System (State Persistence)
- **Frontend**: Native HTML5, CSS3, JavaScript (Vanilla JS)