/** Catalog quà — khớp assets/js/data/rewards.js (server validate cost) */
const REWARDS = [
  { id: 'r1', name: 'Gói "Mở Mang Bờ Cõi"', cost: 800 },
  { id: 'r2', name: 'Mâm Cỗ "Mừng Vụ Mùa"', cost: 1200 },
  { id: 'r3', name: 'Lệnh Bài "Mở Cổng Thành"', cost: 2400 },
  { id: 'r4', name: 'Giấy "Thông Hành Viễn Chinh"', cost: 1600 },
  { id: 'r5', name: 'Gói "Kinh Lý Đô Thành"', cost: 4000 },
  { id: 'r6', name: 'Vé "Đêm Phim Gia Đình"', cost: 1200 },
  { id: 'r7', name: 'Thẻ: ĐÈN DẦU THẮP MUỘN', cost: 350 },
  { id: 'r8', name: 'Thẻ: BÙ NHÌN THẾ THÂN', cost: 900 },
  { id: 'r9', name: 'Thẻ: HẠT NẾP THẦN LỰC', cost: 2000 },
  { id: 'r10', name: 'Thẻ: KHUÔN BÁNH CHƯNG', cost: 1600 },
  { id: 'r11', name: 'Thẻ: PHIÊN CHỢ TỰ DO', cost: 850 },
  { id: 'r12', name: 'Thẻ: LỆNH TRƯNG THU ĐẤT', cost: 600 },
  { id: 'r13', name: 'Thẻ: BẢO KHÍ GIÒN RỤM', cost: 200 },
  { id: 'r14', name: 'Thẻ: HÀN BĂNG NGỌC THẠCH', cost: 250 },
  { id: 'r15', name: 'Thẻ: MẬT ĐẠO TIÊU DAO', cost: 300 },
];

const byId = new Map(REWARDS.map(r => [r.id, r]));

function resolveRewards(rewardIds) {
  const ids = Array.isArray(rewardIds) ? rewardIds.map(String) : [];
  if (!ids.length) throw new Error('Chưa chọn quà');

  let totalCost = 0;
  const names = [];

  for (const id of ids) {
    const reward = byId.get(id);
    if (!reward) throw new Error(`Quà không hợp lệ: ${id}`);
    totalCost += reward.cost;
    names.push(reward.name);
  }

  return { totalCost, rewardNames: names };
}

module.exports = { REWARDS, resolveRewards };
