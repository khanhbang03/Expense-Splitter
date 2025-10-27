// Dữ liệu người dùng cố định (cần trùng khớp với HTML)
const USERS = [
    { id: 'U1', name: 'Dinh Phuong Anh' },
    { id: 'U2', name: 'Anh Viet Doan' },
    { id: 'U3', name: 'Le Duy Duc' },
    { id: 'U4', name: 'Chu Thanh Thao' },
    { id: 'U5', name: 'Ta Ha Trang' },
    { id: 'U6', name: 'Nguyen Khanh Bang' },
    { id: 'U7', name: 'Nguyen Phuc Thang' },
    { id: 'U8', name: 'Le Van Bao' },
    { id: 'U9', name: 'Mrudav Mehta' }
];

// Mô phỏng nơi lưu trữ Giao Dịch (Trong thực tế là Database Backend)
let EXPENSE_HISTORY = [];

// Lấy các phần tử DOM
const expenseForm = document.getElementById('expense-form');
const selectAllBtn = document.getElementById('select-all');
const participantsList = document.getElementById('split-participants');
const updateSummaryBtn = document.getElementById('update-summary-btn');
const debtResultsDiv = document.getElementById('debt-results');

/*
=================================
1. CHỨC NĂNG HỖ TRỢ GIAO DIỆN
=================================
*/

/**
 * Hàm hỗ trợ định dạng tiền tệ (VND)
 */
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Xử lý nút "Chọn Tất Cả"
 */
selectAllBtn.addEventListener('click', () => {
    const checkboxes = participantsList.querySelectorAll('input[type="checkbox"]');
    const isAllChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => {
        // Nếu đã chọn hết, thì bỏ chọn, ngược lại chọn hết
        cb.checked = !isAllChecked; 
    });
});


/*
=================================
2. XỬ LÝ FORM GHI LẠI CHI PHÍ
=================================
*/

expenseForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const description = document.getElementById('description').value;
    const totalAmount = parseFloat(document.getElementById('total-amount').value);
    const paidBy = document.getElementById('paid-by').value;
    
    // Lấy danh sách người tham gia
    const selectedParticipants = Array.from(participantsList.querySelectorAll('input[name="participants"]:checked'))
                                    .map(cb => cb.value);

    // Kiểm tra điều kiện
    if (!description || isNaN(totalAmount) || totalAmount <= 0) {
        alert('Vui lòng nhập đầy đủ mô tả và số tiền hợp lệ.');
        return;
    }
    if (!paidBy) {
        alert('Vui lòng chọn người đã trả tiền.');
        return;
    }
    if (selectedParticipants.length === 0) {
        alert('Vui lòng chọn ít nhất một người tham gia.');
        return;
    }

    // --- LOGIC XỬ LÝ (Mô phỏng Backend) ---
    const shareAmount = totalAmount / selectedParticipants.length;

    const newExpense = {
        id: Date.now(), // ID giao dịch
        description,
        totalAmount,
        paidBy,
        shareAmount,
        participants: selectedParticipants,
        date: new Date().toISOString()
    };
    
    EXPENSE_HISTORY.push(newExpense);
    
    // Thông báo thành công và reset form
    alert(`Đã ghi lại chi phí "${description}" trị giá ${formatVND(totalAmount)}.\nChi phí được chia đều cho ${selectedParticipants.length} người, mỗi người chịu ${formatVND(shareAmount)}.`);
    
    expenseForm.reset();
    updateSummaryBtn.click(); // Cập nhật tổng quan nợ ngay lập tức
});

/*
=================================
3. LOGIC TÍNH TOÁN NỢ RÒNG (NET DEBT)
=================================
*/

/**
 * Tính toán nợ ròng cho tất cả người dùng dựa trên lịch sử EXPENSE_HISTORY
 */
function calculateNetDebt() {
    // Khởi tạo sổ dư ròng cho tất cả người dùng
    const netBalances = {};
    USERS.forEach(user => netBalances[user.id] = 0);

    // 1. Phân tích từng giao dịch trong lịch sử
    EXPENSE_HISTORY.forEach(expense => {
        const { paidBy, shareAmount, participants, totalAmount } = expense;

        // Xử lý tiền trả: Người trả được CỘNG vào tổng nợ
        netBalances[paidBy] += totalAmount;

        // Xử lý tiền chịu: Người tham gia bị TRỪ đi phần chi phí của họ
        participants.forEach(userId => {
            netBalances[userId] -= shareAmount;
        });

        // Xử lý trường hợp người trả cũng là người tham gia (phần của họ bị trừ)
        // Lưu ý: Logic trên đã xử lý đúng: netBalances[paidBy] được cộng totalAmount,
        // sau đó bị trừ shareAmount, vì vậy số dư ròng của họ là (totalAmount - shareAmount).
    });

    // 2. Chuyển đổi ID thành tên và lọc ra các khoản nợ thực tế
    const summary = [];
    for (const userId in netBalances) {
        const balance = netBalances[userId];
        if (Math.abs(balance) > 1) { // Lọc các số dư gần bằng 0
            const user = USERS.find(u => u.id === userId).name;
            const status = balance > 0 ? 'OWED' : 'OWES';
            summary.push({ user, balance: balance, status });
        }
    }

    return summary;
}

/**
 * Hiển thị kết quả nợ ròng lên giao diện
 */
function displayDebtSummary() {
    debtResultsDiv.innerHTML = '';
    const netDebts = calculateNetDebt();

    if (netDebts.length === 0) {
        debtResultsDiv.innerHTML = '<p>🎉 Tất cả mọi người đều đã huề vốn! Không có khoản nợ nào.</p>';
        return;
    }

    netDebts.sort((a, b) => b.balance - a.balance); // Sắp xếp để xem người được nợ nhiều nhất trước

    netDebts.forEach(item => {
        const div = document.createElement('div');
        const absBalance = Math.abs(item.balance);
        
        if (item.status === 'OWED') {
            div.className = 'debt-item owed';
            div.textContent = `${item.user} được nợ: ${formatVND(absBalance)}`;
        } else {
            div.className = 'debt-item owes';
            div.textContent = `${item.user} đang nợ: ${formatVND(absBalance)}`;
        }
        debtResultsDiv.appendChild(div);
    });
    
    // *Lưu ý: Để hiển thị "Ai nợ ai" cụ thể, bạn cần dùng thuật toán tối ưu hóa nợ (Simplified Debt), phức tạp hơn.*
    const info = document.createElement('p');
    info.style.marginTop = '15px';
    info.style.fontStyle = 'italic';
    info.textContent = `(Báo cáo này hiển thị tổng số tiền Nợ Ròng của mỗi người.`;
    debtResultsDiv.appendChild(info);
}

// Gán sự kiện cho nút cập nhật
updateSummaryBtn.addEventListener('click', displayDebtSummary);


/*
=================================
4. KHỞI TẠO (INITIALIZATION)
=================================
*/

// Chạy hàm cập nhật tổng nợ lần đầu tiên
document.addEventListener('DOMContentLoaded', () => {
    // Mặc dù HTML đã có options, nếu bạn muốn linh hoạt hơn có thể dùng JS để populate select boxes.
    displayDebtSummary();
});

// Thêm giao dịch mô phỏng khi khởi động để dễ kiểm thử
EXPENSE_HISTORY.push({
    id: 1, description: 'Tiền Ăn Tối', totalAmount: 1000000, paidBy: 'U3', shareAmount: 200000, participants: ['U1', 'U2', 'U3', 'U4', 'U5'], date: new Date().toISOString()
});
EXPENSE_HISTORY.push({
    id: 2, description: 'Vé xem phim', totalAmount: 500000, paidBy: 'U1', shareAmount: 250000, participants: ['U1', 'U5'], date: new Date().toISOString()
});